/**
 * The automatic editor: Opus decides every UK draft — publish, reject or hold.
 * ===========================================================================
 *
 * Mikkel, 2026-10-10: «set up an automatic publish/reject job by Opus at
 * midnight and midday — only for the UK articles». Until then every draft was
 * decided in a Claude Code session on his instruction; this does the same work
 * on a schedule (.github/workflows/auto-editor-uk.yml).
 *
 * One draft at a time, one `claude -p --model opus` call each, on the Claude
 * subscription (CLAUDE_CODE_OAUTH_TOKEN), so the $0 principle holds. Opus gets
 * the same dossier as the review (source first, then fact sheet), the athlete's
 * already published articles, and the editorial rules, and answers with JSON:
 *
 *   publish → corrected title/summary/content, published SPACED by
 *             apply-draft-decisions.ts (17–23 min, unchanged)
 *   reject  → deleted with a review_log row, as in /admin
 *   hold    → left in the queue for Mikkel, with the reason
 *
 * Guardrails, not prompts:
 *  - a story flagged `sensitive` is never decided by the machine → hold
 *  - the corrected text goes through the mechanical quality check again; any
 *    HIGH finding turns publish into hold (the check knows nothing Opus wrote
 *    that the source didn't say)
 *  - an answer that is not valid JSON, or lacks a field, is a hold, never a guess
 *
 * The repo is public, so stdout carries ids and actions only. Titles, reasons
 * and text go to Discord (private) and to the decisions file in the runner's
 * temp dir, which dies with the runner.
 *
 *   npx tsx pipeline/fix/auto-editor.ts --country UK --out /tmp/decisions.json [--dry-run] [--limit N]
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createD1Client } from "../lib/d1-client";
import { notify, COLOR, adminLink } from "../lib/notify";
import { countryProfile } from "../../src/lib/countries";
import { dossier, dossierSelect, type DossierRow } from "../generate/draft-dossier";
import { checkDraft, severityOf, type Finding } from "../generate/quality-check";

export interface EditorRow extends DossierRow {
  athlete_id: number | null;
  preferred_name: string | null;
  headline: string | null;
  sensitive: string | null;
}

export interface PriorArticle {
  title: string;
  published_at: string | null;
  published: number;
}

export type Verdict =
  | { action: "publish"; title: string; summary: string; content: string; note?: string }
  | { action: "reject"; reason: string }
  | { action: "hold"; reason: string };

const MODEL = process.env.AUTO_EDITOR_MODEL || "opus";

// ── the prompt ──────────────────────────────────────────────────────────────

export function buildEditorPack(r: EditorRow, prior: PriorArticle[]): string {
  const priorList = prior.length
    ? prior.map((p) => `- ${p.published ? "PUBLISHED" : "DRAFT (also in queue)"} ${p.published_at ?? ""} «${p.title}»`).join("\n")
    : "(none)";
  return `# Editor's decision on draft #${r.id}

You are the editor of ${countryProfile(r.country ?? "UK").brand}, a news site about UK student-athletes at US colleges.
A draft written by a smaller model from the fact sheet is below. Decide it: PUBLISH (after correcting it),
REJECT, or HOLD for the human editor. Nobody reads it after you — what you publish goes live.

**Read the source before the draft.** Read the draft first and you read the source through what the draft
claims, and you miss what is wrong.

${dossier(r)}
## This athlete's other articles (duplicate check)

${priorList}

## The draft

Title: ${r.title}
Summary: ${r.summary ?? ""}

\`\`\`
${r.content}
\`\`\`

## Rules

Reject when:
- the source is not about THIS athlete, or the athlete's part is nothing a reader would call news
  (a couple of shots in a defeat, a roster line, a team result without them)
- it repeats an article already PUBLISHED above (same event or same result), with nothing new of substance;
  a genuine new honour (conference player/golfer of the week, all-conference, records) is new
- the source does not support the story the draft tells

Hold (do not decide) when:
- identity or hometown/nationality is ambiguous or conflicts between source and athlete data
- you would need anything outside the source and fact sheet to make it publishable
- the story touches injury, health, legal or personal matters

Publish only after correcting, so that every sentence holds:
- every fact (number, name, minute, score, record, quote, award, date) must be in the source or fact sheet;
  delete anything else, however plausible. "Our earlier article" records and season-stats records count as sources.
- quotes verbatim, in double quotes, attributed as the source does
- open with the athlete: name, class year, position/event, hometown; credit the school's athletics website
- UK identity: the group is "UK athletes", never "British"; an individual by home nation (English, Scottish,
  Welsh); Northern Ireland is a place only — "from Tandragee, Northern Ireland", no nationality adjective
- US class years stay as they are (freshman, sophomore, junior, senior, graduate student)
- British English spelling; US college teams are "soccer" ("the men's soccer team"), not "football"
- neutral and factual: no superlatives the source doesn't make, no "standout", no ranking of athletes against
  each other, no "Athlete of the Week" framing of our own
- title: what happened, with the athlete's name first, under 90 characters, no clickbait
- summary: one or two sentences, under 250 characters
- content: plain paragraphs separated by one blank line, no headings, no markdown

Answer with ONLY a JSON object, nothing before or after it:

{"action":"publish","title":"...","summary":"...","content":"...","note":"one line: what you changed"}
{"action":"reject","reason":"one sentence"}
{"action":"hold","reason":"one sentence"}
`;
}

// ── the answer ──────────────────────────────────────────────────────────────

/** The model's answer as a verdict, or null when it is not one. Never guesses. */
export function parseVerdict(text: string): Verdict | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const str = (k: string) => (typeof o[k] === "string" && (o[k] as string).trim() ? (o[k] as string).trim() : null);
  switch (o.action) {
    case "publish": {
      const title = str("title"), summary = str("summary"), content = str("content");
      if (!title || !summary || !content) return null;
      return { action: "publish", title, summary, content, note: str("note") ?? undefined };
    }
    case "reject":
    case "hold": {
      const reason = str("reason");
      return reason ? { action: o.action, reason } : null;
    }
    default:
      return null;
  }
}

/** Mechanical check of the CORRECTED text. A high finding means a human looks. */
export function recheck(r: EditorRow, v: Extract<Verdict, { action: "publish" }>): Finding[] {
  return checkDraft({
    title: v.title,
    content: v.content,
    factSheet: r.fact_sheet,
    sourceText: [r.headline, r.summary, r.content_raw].filter(Boolean).join("\n") || null,
    athlete: r.athlete_name
      ? {
          name: r.athlete_name,
          preferredName: r.preferred_name,
          gender: r.gender,
          classYear: r.class_year,
          university: r.university,
          hometown: r.hometown,
          previousSchool: r.previous_school,
        }
      : null,
    language: "en",
  });
}

/** The final decision for one draft: the model's verdict after the guardrails. */
export function guard(r: EditorRow, v: Verdict | null): Verdict {
  if (r.sensitive) return { action: "hold", reason: `story flagged sensitive (${r.sensitive}) — never decided automatically` };
  if (!v) return { action: "hold", reason: "the model's answer was not a valid decision" };
  if (v.action !== "publish") return v;
  const findings = recheck(r, v);
  if (severityOf(findings) === "high") {
    const f = findings.find((x) => x.severity === "high")!;
    return { action: "hold", reason: `mechanical check after correction: ${f.claim} — ${f.why}` };
  }
  return v;
}

// ── the run ─────────────────────────────────────────────────────────────────

function askModel(pack: string): string | null {
  const res = spawnSync("claude", ["-p", "--model", MODEL, "--allowed-tools", ""], {
    input: pack,
    // Outside the repo, so the repo's CLAUDE.md isn't loaded into every call.
    cwd: tmpdir(),
    encoding: "utf8",
    timeout: 10 * 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (res.status !== 0) {
    console.log(`  ! claude exited ${res.status ?? res.signal}`);
    return null;
  }
  return res.stdout;
}

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const country = val("--country")?.toUpperCase();
  const out = val("--out");
  const limit = Number(val("--limit") ?? 30);
  const dry = args.includes("--dry-run");
  if (!country || !out) {
    console.error("Usage: auto-editor.ts --country UK --out <decisions.json> [--dry-run] [--limit N]");
    process.exit(1);
  }

  const db = createD1Client();
  const sql = `${dossierSelect([
    "a.athlete_id",
    "ath.preferred_name",
    "s.headline",
    "s.sensitive",
  ])} WHERE a.published = 0 AND a.country = ? ORDER BY a.id LIMIT ?`;
  const rows = (await db.query<EditorRow>(sql, [country, limit])).results;
  console.log(`${rows.length} unpublished ${country} draft(s)`);

  const decisions: { id: number; action: "publish" | "reject"; title?: string; summary?: string; content?: string; reason?: string }[] = [];
  const report: { id: number; v: Verdict; title: string }[] = [];

  for (const r of rows) {
    const prior = r.athlete_id
      ? (await db.query<PriorArticle>(
          `SELECT ar.title, ar.published_at, ar.published FROM articles ar
            WHERE ar.id <> ? AND (ar.athlete_id = ? OR ar.id IN (SELECT article_id FROM article_athletes WHERE athlete_id = ?))
              AND (ar.published = 0 OR ar.published_at >= datetime('now', '-60 days'))
            ORDER BY COALESCE(ar.published_at, ar.created_at) DESC LIMIT 15`,
          [r.id, r.athlete_id, r.athlete_id],
        )).results
      : [];
    const answer = r.sensitive ? null : askModel(buildEditorPack(r, prior));
    const v = guard(r, answer === null ? null : parseVerdict(answer));
    console.log(`  #${r.id}: ${v.action}`);
    report.push({ id: r.id, v, title: v.action === "publish" ? v.title : r.title });
    if (v.action === "publish") decisions.push({ id: r.id, action: "publish", title: v.title, summary: v.summary, content: v.content });
    if (v.action === "reject") decisions.push({ id: r.id, action: "reject", reason: v.reason });
  }

  writeFileSync(out, JSON.stringify(decisions, null, 2));
  const n = (a: Verdict["action"]) => report.filter((x) => x.v.action === a).length;
  console.log(`publish ${n("publish")} · reject ${n("reject")} · hold ${n("hold")}`);
  if (!report.length || dry) return;

  const lines = (a: Verdict["action"]) =>
    report
      .filter((x) => x.v.action === a)
      .map((x) => {
        const why = x.v.action === "publish" ? (x.v.note ?? "") : x.v.reason;
        return clip(`**#${x.id}** ${x.title}${why ? ` — ${why}` : ""}`, 300);
      })
      .join("\n");
  const fields = (["publish", "reject", "hold"] as const)
    .filter((a) => n(a) > 0)
    .map((a) => ({
      name: { publish: "✅ Publishing (spaced 17–23 min)", reject: "❌ Rejected", hold: "⏸️ Held for you" }[a],
      value: clip(lines(a), 1024),
    }));
  await notify(
    {
      title: `🤖 Opus editor — ${countryProfile(country).brand}`,
      color: n("hold") ? COLOR.ready : COLOR.report,
      description: n("hold") ? `Held drafts wait in [admin](${adminLink(country)}).` : undefined,
      fields,
    },
    country,
  );
}

if (process.argv[1]?.endsWith("auto-editor.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
