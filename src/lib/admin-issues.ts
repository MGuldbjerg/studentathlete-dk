/**
 * /admin/sager — one page of everything waiting on Mikkel.
 *
 * Two halves: QUEUES are counted live from the tables the other admin pages work on
 * (so they can never go stale), and MANUAL issues are rows in `admin_issues`
 * (migration 090) for what no query can see. Every read here is an indexed lookup or
 * a small count; the page is opened by hand, never polled.
 */
import { getDB } from "./db";
import { contentCountry } from "./site-server";
import { siteCountryCodes } from "./countries";

export type QueueItem = { key: string; label: string; count: number; href: string };
export type AskedSchool = { id: number; name: string; conference: string | null; asked_at: string | null; note: string | null; days: number | null };
export type UnclearedAthlete = { school: string; name: string; sport: string };
export type ManualIssue = {
  id: number; title: string; note: string | null; link: string | null;
  country: string | null; status: string; created_at: string; closed_at: string | null;
};

/** A reply older than this is worth a nudge (no automatic follow-ups exist). */
export const STALE_REPLY_DAYS = 14;

/** Whole days from a D1 `datetime('now')` string (UTC, no zone) to `now`. */
export function daysSince(at: string | null, now: Date): number | null {
  if (!at) return null;
  const t = Date.parse(at.includes("T") ? at : at.replace(" ", "T") + "Z");
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** Queue rows with something in them, in the order they are listed. */
export function nonEmptyQueues(items: QueueItem[]): QueueItem[] {
  return items.filter((i) => i.count > 0);
}

/** Title is required; link must be an admin path or http(s) — never `javascript:`. */
export function validateIssue(input: { title?: unknown; note?: unknown; link?: unknown; country?: unknown }):
  { ok: true; value: { title: string; note: string | null; link: string | null; country: string | null } } | { ok: false; error: string } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, error: "Titel mangler" };
  if (title.length > 200) return { ok: false, error: "Titel er for lang (max 200 tegn)" };
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim().slice(0, 4000) : null;
  const rawLink = typeof input.link === "string" ? input.link.trim() : "";
  if (rawLink && !/^(\/|https?:\/\/)/i.test(rawLink)) return { ok: false, error: "Link skal starte med / eller http(s)://" };
  const country = typeof input.country === "string" && siteCountryCodes().includes(input.country) ? input.country : null;
  return { ok: true, value: { title, note, link: rawLink || null, country } };
}

async function count(db: any, sql: string, ...binds: unknown[]): Promise<number> { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const r = await db.prepare(sql).bind(...binds).first();
    return (r as { cnt: number } | null)?.cnt ?? 0;
  } catch {
    return 0;
  }
}

/** Live counts of every admin queue for the active site (leads are site-less). */
export async function getQueues(): Promise<QueueItem[]> {
  const db = await getDB();
  if (!db) return [];
  const c = await contentCountry();
  const [drafts, photos, profiles, dupes, insta, leads] = await Promise.all([
    count(db, "SELECT COUNT(*) AS cnt FROM articles WHERE published = 0 AND country = ?", c),
    count(db, `SELECT COUNT(*) AS cnt FROM photo_suggestions ps JOIN athletes a ON ps.athlete_id = a.id
               WHERE ps.status = 'pending' AND a.home_country = ?`, c),
    count(db, "SELECT COUNT(*) AS cnt FROM athletes WHERE profile_draft IS NOT NULL AND home_country = ?", c),
    count(db, `SELECT COUNT(*) AS cnt FROM merge_candidates mc JOIN athletes k ON k.id = mc.athlete_id_keep
               WHERE mc.status = 'pending' AND k.home_country = ?`, c),
    count(db, `SELECT COUNT(*) AS cnt FROM athletes
               WHERE instagram_handle IS NOT NULL AND instagram_status = 'pending' AND home_country = ?`, c),
    count(db, "SELECT COUNT(*) AS cnt FROM leads WHERE status = 'new'"),
  ]);
  return [
    { key: "drafts", label: "Kladder at gennemse", count: drafts, href: "/admin" },
    { key: "photos", label: "Fotoforslag", count: photos, href: "/admin/fotos" },
    { key: "profiles", label: "Profilkladder", count: profiles, href: "/admin/profiler" },
    { key: "dupes", label: "Mulige dubletter", count: dupes, href: "/admin/dubletter" },
    { key: "instagram", label: "Instagram-handles", count: insta, href: "/admin/instagram" },
    { key: "leads", label: "Nye leads", count: leads, href: "/admin/leads" },
  ];
}

/** Schools asked for photo permission with no reply recorded yet, oldest first. */
export async function getAskedSchools(now = new Date()): Promise<AskedSchool[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db.prepare(
      `SELECT id, name, conference, photo_permission_at AS asked_at, photo_permission_note AS note
         FROM schools WHERE photo_permission = 'asked'
        ORDER BY photo_permission_at ASC, name`,
    ).all();
    return ((r.results ?? []) as Omit<AskedSchool, "days">[]).map((s) => ({ ...s, days: daysSince(s.asked_at, now) }));
  } catch {
    return [];
  }
}

/** Athlete-list schools: our athletes the school has not approved by name (no photo shows). */
export async function getUnclearedAthletes(): Promise<UnclearedAthlete[]> {
  const db = await getDB();
  if (!db) return [];
  const codes = siteCountryCodes();
  try {
    const r = await db.prepare(
      `SELECT s.name AS school, a.name, a.sport FROM schools s
         JOIN athletes a ON a.university = s.name
        WHERE s.photo_permission = 'athlete_list' AND a.active = 1
          AND a.home_country IN (${codes.map(() => "?").join(",")})
          AND COALESCE(a.photo_cleared, 0) = 0
        ORDER BY s.name, a.name`,
    ).bind(...codes).all();
    return (r.results ?? []) as UnclearedAthlete[];
  } catch {
    return [];
  }
}

/** Open issues for the active site (plus site-less ones), then the 20 most recently closed. */
export async function getManualIssues(): Promise<{ open: ManualIssue[]; done: ManualIssue[] }> {
  const db = await getDB();
  if (!db) return { open: [], done: [] };
  const c = await contentCountry();
  try {
    const [open, done] = await Promise.all([
      db.prepare(`SELECT * FROM admin_issues WHERE status = 'open' AND (country IS NULL OR country = ?) ORDER BY id DESC`).bind(c).all(),
      db.prepare(`SELECT * FROM admin_issues WHERE status = 'done' AND (country IS NULL OR country = ?) ORDER BY id DESC LIMIT 20`).bind(c).all(),
    ]);
    return { open: (open.results ?? []) as ManualIssue[], done: (done.results ?? []) as ManualIssue[] };
  } catch {
    return { open: [], done: [] };
  }
}

export async function createIssue(v: { title: string; note: string | null; link: string | null; country: string | null }): Promise<ManualIssue | null> {
  const db = await getDB();
  if (!db) return null;
  return (await db.prepare(
    "INSERT INTO admin_issues (title, note, link, country) VALUES (?,?,?,?) RETURNING *",
  ).bind(v.title, v.note, v.link, v.country).first()) as ManualIssue | null;
}

export async function setIssueStatus(id: number, status: string): Promise<boolean> {
  if (status !== "open" && status !== "done") return false;
  const db = await getDB();
  if (!db) return false;
  const r = await db.prepare(
    "UPDATE admin_issues SET status = ?, closed_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END WHERE id = ?",
  ).bind(status, status, id).run();
  return (r?.meta?.changes ?? 0) > 0;
}

/** Badge on the dashboard button: hand-kept open issues + schools awaiting a photo reply. */
export async function getOpenIssueCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  const c = await contentCountry();
  const [manual, asked] = await Promise.all([
    count(db, "SELECT COUNT(*) AS cnt FROM admin_issues WHERE status = 'open' AND (country IS NULL OR country = ?)", c),
    count(db, "SELECT COUNT(*) AS cnt FROM schools WHERE photo_permission = 'asked'"),
  ]);
  return manual + asked;
}
