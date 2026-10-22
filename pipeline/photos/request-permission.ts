/**
 * Photo-permission emails to schools' athletics communications offices, sent through Brevo
 * from info@studentathlete.dk. One school-wide request per school, ever; the ledger
 * (schools.photo_permission + photo_events, db/migration-068) records who was contacted,
 * when, and what they answered.
 *
 *   npx tsx pipeline/photos/request-permission.ts --import contacts/<file>.csv    save contacts
 *   npx tsx pipeline/photos/request-permission.ts [--conference X]                dry run: print emails
 *   npx tsx pipeline/photos/request-permission.ts --send --limit 3                send (BREVO_API_KEY)
 *   npx tsx pipeline/photos/request-permission.ts --status [--conference X]       the ledger
 *   npx tsx pipeline/photos/request-permission.ts --respond "School" granted|conditional|declined|
 *         forwarded|bounced|do-not-contact|note [--note "text"]                    record a reply
 *
 * contacts.csv: school,email,name[,title,source]  (school = schools.name or common_name).
 * Never sent: to a school with any state set, with a send not followed by a bounce, to an
 * address mailed in the last 90 days, or without --send. No automatic follow-ups.
 */
import { readFileSync } from "node:fs";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { buildPermissionEmail } from "./permission-email";
import { daysSince, emailCooledDown, parseResponse } from "./permission-state";

const SENDER = { name: "Mikkel Guldbjerg Jensen", email: "info@studentathlete.dk" };
const LIVE_SITES = ["studentathlete.dk", "student-athlete.co.uk"]; // update when a market goes live
/** 8-15 minutes between emails, a few a day: a burst of cold mail lands in spam. */
const pauseMs = () => (8 + Math.random() * 7) * 60_000;

function parseArgs() {
  const a = process.argv.slice(2);
  const val = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] ?? null : null; };
  return {
    importFile: val("--import"),
    send: a.includes("--send"),
    status: a.includes("--status"),
    respond: val("--respond"),
    keyword: val("--respond") ? a[a.indexOf("--respond") + 2] ?? null : null,
    note: val("--note"),
    conference: val("--conference"),
    limit: Number(val("--limit") ?? 3),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCsv(file: string): { school: string; email: string; name: string | null }[] {
  const rows = readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());
  return rows.slice(1).map((line) => {
    const [school, email, name] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    return { school, email, name: name || null };
  });
}

async function findSchool(db: D1Client, name: string): Promise<{ id: number; name: string } | null> {
  const res = await db.query<{ id: number; name: string }>(
    "SELECT id, name FROM schools WHERE name = ? OR common_name = ?", [name, name]);
  return res.results.length === 1 ? res.results[0] : null;
}

async function importContacts(file: string) {
  const db = createD1Client();
  let saved = 0;
  for (const r of parseCsv(file)) {
    if (!EMAIL_RE.test(r.email)) { console.error(`skip «${r.school}»: bad email «${r.email}»`); continue; }
    const school = await findSchool(db, r.school);
    if (!school) { console.error(`skip «${r.school}»: no single school match`); continue; }
    await db.query("UPDATE schools SET sid_email = ?, sid_name = ? WHERE id = ?", [r.email, r.name, school.id]);
    saved++;
  }
  console.log(`Saved ${saved} contacts`);
}

async function record(db: D1Client, schoolId: number, event: string, f: { to?: string; subject?: string; messageId?: string; detail?: string } = {}) {
  await db.query(
    "INSERT INTO photo_events (school_id, event, to_email, subject, message_id, detail) VALUES (?,?,?,?,?,?)",
    [schoolId, event, f.to ?? null, f.subject ?? null, f.messageId ?? null, f.detail ?? null],
  );
}

async function respond(name: string, keyword: string | null, note: string | null) {
  if (!keyword) throw new Error("Usage: --respond \"School\" granted|conditional|declined|forwarded|bounced|do-not-contact|note [--note \"text\"]");
  const { event, state } = parseResponse(keyword);
  const db = createD1Client();
  const school = await findSchool(db, name);
  if (!school) throw new Error(`No single school matches «${name}»`);
  await record(db, school.id, event, { detail: note ?? undefined });
  if (state) {
    await db.query(
      "UPDATE schools SET photo_permission = ?, photo_permission_at = datetime('now'), photo_permission_note = COALESCE(?, photo_permission_note) WHERE id = ?",
      [state, note, school.id]);
  }
  if (event === "bounced") {
    // The address is dead: drop it, and let the school be contacted again once a new one is saved.
    await db.query("UPDATE schools SET sid_email = NULL, photo_permission = NULL, photo_permission_at = NULL WHERE id = ?", [school.id]);
  }
  console.log(`${school.name}: recorded ${event}${state ? ` → ${state}` : ""}`);
}

async function status(conference: string | null) {
  const db = createD1Client();
  const rows = (await db.query<{ name: string; conference: string | null; state: string | null; email: string | null; note: string | null; last_at: string | null; last_event: string | null }>(
    `SELECT s.name, s.conference, s.photo_permission AS state, s.sid_email AS email, s.photo_permission_note AS note,
            (SELECT at FROM photo_events e WHERE e.school_id = s.id ORDER BY e.id DESC LIMIT 1) AS last_at,
            (SELECT event FROM photo_events e WHERE e.school_id = s.id ORDER BY e.id DESC LIMIT 1) AS last_event
     FROM schools s
     WHERE (s.sid_email IS NOT NULL OR s.photo_permission IS NOT NULL OR EXISTS (SELECT 1 FROM photo_events e WHERE e.school_id = s.id))
       AND (? IS NULL OR s.conference = ?)
     ORDER BY s.conference, s.name`, [conference, conference])).results;
  const now = new Date();
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const st = r.state ?? "not contacted";
    counts[st] = (counts[st] ?? 0) + 1;
    const d = daysSince(r.last_at, now);
    console.log(`${(r.conference ?? "").padEnd(28)} ${r.name.padEnd(40)} ${st.padEnd(15)} ${(r.last_event ?? "-").padEnd(18)} ${d === null ? "" : d + "d ago"}  ${r.email ?? ""}${r.note ? "  [" + r.note + "]" : ""}`);
  }
  console.log(`\n${rows.length} schools: ` + Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", "));
}

async function sendBrevo(to: string, email: { subject: string; text: string; html: string }): Promise<string> {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error("Missing BREVO_API_KEY");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: SENDER,
      replyTo: { email: SENDER.email },
      to: [{ email: to }],
      subject: email.subject,
      textContent: email.text,
      htmlContent: email.html,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${body.slice(0, 200)}`);
  return (JSON.parse(body) as { messageId?: string }).messageId ?? "";
}

interface Target { id: number; name: string; sid_email: string; sid_name: string | null }

async function sendRun(args: ReturnType<typeof parseArgs>) {
  const db = createD1Client();
  // Ready = has a contact, no state yet, and no send that a bounce hasn't cancelled.
  const targets = (await db.query<Target>(
    `SELECT s.id, s.name, s.sid_email, s.sid_name FROM schools s
     WHERE s.sid_email IS NOT NULL AND s.photo_permission IS NULL
       AND NOT EXISTS (SELECT 1 FROM photo_events e WHERE e.school_id = s.id AND e.event = 'sent'
                       AND NOT EXISTS (SELECT 1 FROM photo_events b WHERE b.school_id = s.id AND b.event = 'bounced' AND b.id > e.id))
       AND (? IS NULL OR s.conference = ?)
     ORDER BY s.conference, s.name`, [args.conference, args.conference])).results;
  console.log(`${targets.length} schools ready (${args.send ? "SEND" : "dry run"}, limit ${args.limit})`);

  let sent = 0;
  for (const t of targets) {
    if (sent >= args.limit) break;
    const last = await db.query<{ at: string }>(
      "SELECT MAX(at) AS at FROM photo_events WHERE event = 'sent' AND lower(to_email) = lower(?)", [t.sid_email]);
    if (!emailCooledDown(last.results[0]?.at ?? null, new Date())) {
      console.log(`skip ${t.name}: ${t.sid_email} was mailed in the last 90 days`);
      continue;
    }
    const email = buildPermissionEmail({ schoolName: t.name, contactName: t.sid_name, liveSites: LIVE_SITES });
    console.log(`\n--- ${t.name}\nTo: ${t.sid_email}\nSubject: ${email.subject}\n\n${email.text}`);
    sent++;
    if (!args.send) continue;
    if (sent > 1) await new Promise((r) => setTimeout(r, pauseMs()));
    try {
      const id = await sendBrevo(t.sid_email, email);
      await record(db, t.id, "sent", { to: t.sid_email, subject: email.subject, messageId: id });
      await db.query("UPDATE schools SET photo_permission = 'asked', photo_permission_at = datetime('now') WHERE id = ?", [t.id]);
      console.log(`sent (${id})`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await record(db, t.id, "failed", { to: t.sid_email, subject: email.subject, detail: msg });
      console.error(`FAILED ${t.name}: ${msg}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  if (args.importFile) return importContacts(args.importFile);
  if (args.respond) return respond(args.respond, args.keyword, args.note);
  if (args.status) return status(args.conference);
  return sendRun(args);
}

main().catch((e) => { console.error(e); process.exit(1); });
