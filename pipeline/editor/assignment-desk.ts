/**
 * The assignment desk: what does each incoming story become?
 * ===========================================================================
 *
 * Mikkel, 2026-10-27: «make you act as an actual editor for the stories coming
 * in … delegate stories to either lines on the profile or full articles». The
 * body pass (check-sources.ts) finds ~118 UK and ~16 DK stories a day, against
 * ~22 and ~2 drafted before it. Writing all of them is neither readable nor
 * reviewable, so a desk decides first:
 *
 *   article → a draft, with a type, a priority (1-5) and an angle
 *   line    → one sentence for the profile timeline
 *   fold    → into another story in the batch, or an article we published
 *   skip    → nothing
 *   hold    → health, legal, identity: Mikkel decides
 *
 * The rules are pipeline/editor/brief.md, Mikkel's to edit. The desk decides
 * per ATHLETE, not per story: all of an athlete's new stories go in one batch
 * with their earlier stories and published articles, so «third goal in three
 * games» can be seen (Mikkel: «good text comes from the complete picture»).
 *
 * SHADOW MODE: decisions go to desk_decisions and Discord, and nothing reads
 * them but the report — drafting runs as before. --report measures the desk
 * against what happened to the same stories.
 *
 * Runs on Mikkel's Claude subscription (`claude -p`, CLAUDE_CODE_OAUTH_TOKEN),
 * like the Opus editor. The repo is public: stdout is ids and decisions only.
 *
 * --backtest decides past stories as of their discovery (context cut at that
 * moment) and stores them as mode 'backtest', apart from the shadow rows.
 *
 *   npx tsx pipeline/editor/assignment-desk.ts [--limit N] [--dry-run] [--out desk.json] [--dump-packs packs.txt]
 *   npx tsx pipeline/editor/assignment-desk.ts --backtest --from 2026-10-13 --to 2026-10-26 [--limit N]
 *   npx tsx pipeline/editor/assignment-desk.ts --report [--backtest] [--days 14] [--in desk.json]
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { notify, COLOR } from "../lib/notify";
import { countryProfile, siteCountrySql } from "../../src/lib/countries";
import { MIN_RELEVANCE_GENERATE } from "../discover/extract-story";
import { normalizeSourceUrl } from "../lib/story-url";

const MODEL = process.env.DESK_MODEL || "opus";
/** Stories per model call. An athlete's stories are never split across calls. */
const BATCH_STORIES = 8;
/** Source text per story. A match report's substance is in its first paragraphs. */
const SOURCE_CHARS = 2_500;
/** How far back a live run looks for undecided stories. */
const WINDOW_DAYS = 3;

export const DECISIONS = ["article", "line", "fold", "skip", "hold"] as const;
export type Decision = (typeof DECISIONS)[number];
/** Never `feature`: we don't build articles from a school's narrative prose (Mikkel, 2026-10-27). */
const TYPES = ["season_update", "news", "recruiting"];

export interface DeskStory {
  id: number;
  athlete_id: number;
  headline: string | null;
  summary: string | null;
  content_raw: string | null;
  source_url: string | null;
  discovered_at: string;
  relevance_score: number | null;
  sensitive: string | null;
  athlete_name: string;
  sport: string | null;
  university: string | null;
  home_country: string;
  class_year: string | null;
  position: string | null;
  hometown: string | null;
}

export interface AthleteContext {
  articles: { id: number; title: string; published_at: string }[];
  earlier: { id: number; headline: string | null; discovered_at: string }[];
  events: { occurred_on: string | null; summary: string }[];
}

export interface DeskVerdict {
  story_id: number;
  decision: Decision;
  article_type: string | null;
  priority: number | null;
  angle: string | null;
  line: string | null;
  fold_into: string | null;
  /** How long an honest article the material carries (article and line). */
  words: number | null;
  /** The day the event happened, YYYY-MM-DD (article and line); null if the source has no date. */
  event_date: string | null;
  /** Big news on thin material: what a human could ask to make it an article. */
  follow_up: string | null;
  reason: string;
}

/**
 * Mikkel's rule, 2026-10-27, qualified by his answers to 20 hypotheticals
 * (pipeline/editor/brief.md): «stories over 250 words should always be posted,
 * 200-249 … based on how big the story is», and «simple scoring/assisting/
 * placement should probably be 1 day, bigger stuff should be 3 days».
 *
 * Applied in code as well as in the brief, so a model that asks for an article
 * on 150 words, or on a nine-day-old match, is overruled, not trusted. Only
 * DOWN: an article becomes a line (it carries its line). A line the model sized
 * at 250+ stays a line — it has no type or angle to write from — and the report
 * counts those as answers to look at.
 *
 * Freshness is measured to the day the story was FOUND, not to the desk run:
 * our own pipeline's delay must not age a story (measured 2026-10-27: 13% of
 * stories are found the day the school posts, 74% the day after, 9% two days after).
 */
export const ALWAYS_ARTICLE_WORDS = 250;
export const MIN_ARTICLE_WORDS = 200;
/** Priority from which 200-249 words is an article: a distinctive individual contribution. */
export const ARTICLE_PRIORITY = 3;
/** Priority from which a story stays fresh for BIG_FRESH_DAYS instead of SMALL_FRESH_DAYS. */
export const BIG_PRIORITY = 4;
export const SMALL_FRESH_DAYS = 1;
export const BIG_FRESH_DAYS = 3;

/** Whole days from the event to the day the story was found; null when either date is missing. */
export function ageDays(eventDate: string | null, foundOn: string): number | null {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return null;
  const a = Date.parse(eventDate), b = Date.parse(foundOn.slice(0, 10));
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 86_400_000) : null;
}

export function applyRules(v: DeskVerdict, foundOn: string): DeskVerdict {
  if (v.decision !== "article" || v.words === null) return v;
  const toLine = (why: string): DeskVerdict =>
    ({ ...v, decision: "line", article_type: null, angle: null, reason: `${why}; the desk said article: ${v.reason}` });
  const age = ageDays(v.event_date, foundOn);
  const fresh = (v.priority ?? 0) >= BIG_PRIORITY ? BIG_FRESH_DAYS : SMALL_FRESH_DAYS;
  if (age !== null && age > fresh) return toLine(`freshness rule: the event was ${age} days before the story was found (limit ${fresh})`);
  if (v.words >= ALWAYS_ARTICLE_WORDS) return v;
  if (v.words >= MIN_ARTICLE_WORDS && (v.priority ?? 0) >= ARTICLE_PRIORITY) return v;
  return toLine(v.words < MIN_ARTICLE_WORDS
    ? `length rule: ${v.words} words is under ${MIN_ARTICLE_WORDS}`
    : `length rule: ${v.words} words at priority ${v.priority} is under the bar`);
}

// ── the prompt ──────────────────────────────────────────────────────────────

/** The brief as the model sees it: everything above the evidence marker. */
export function briefText(raw = readFileSync(join(__dirname, "brief.md"), "utf8")): string {
  const cut = raw.indexOf("<!-- evidence");
  return (cut >= 0 ? raw.slice(0, cut) : raw).trim();
}

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + "…");
const day = (s: string | null) => (s ?? "").slice(0, 10);

export function buildDeskPack(
  groups: { stories: DeskStory[]; ctx: AthleteContext }[],
  brief: string,
  /** Story id → our OTHER athletes in the same source (one joint article). */
  alsoOurs: Map<number, string[]> = new Map(),
): string {
  const athletes = groups.map(({ stories, ctx }) => {
    const a = stories[0];
    const who = [a.class_year, a.position, a.sport, a.university, a.hometown && `from ${a.hometown}`].filter(Boolean).join(", ");
    const articles = ctx.articles.length
      ? ctx.articles.map((x) => `- article:${x.id} ${day(x.published_at)} «${x.title}»`).join("\n")
      : "(none in the last 60 days)";
    const earlier = ctx.earlier.length
      ? ctx.earlier.map((x) => `- story:${x.id} ${day(x.discovered_at)} «${x.headline ?? ""}»`).join("\n")
      : "(none)";
    const events = ctx.events.length
      ? ctx.events.map((x) => `- ${day(x.occurred_on)} ${x.summary}`).join("\n")
      : "(none)";
    const news = stories
      .map((s) => {
        const text = clip((s.content_raw || s.summary || "").replace(/\s+/g, " ").trim(), SOURCE_CHARS);
        const others = alsoOurs.get(s.id) ?? [];
        return `### story:${s.id} (found ${day(s.discovered_at)}${s.sensitive ? `, flagged sensitive: ${s.sensitive}` : ""})
Headline: ${s.headline ?? ""}${others.length ? `\nAlso ours in this source: ${others.join(", ")}` : ""}
Source: ${s.source_url ?? ""}
${text || "(no text: headline only)"}`;
      })
      .join("\n\n");
    return `## ${a.athlete_name} (${a.home_country}): ${who}

Our published articles about them, newest first:
${articles}

Their earlier stories in the last 14 days (already decided or drafted):
${earlier}

Profile timeline, newest first:
${events}

New stories to decide:

${news}`;
  });

  return `# The assignment desk

${brief}

---

${athletes.join("\n\n---\n\n")}

---

Decide EVERY new story above (${groups.reduce((n, g) => n + g.stories.length, 0)} of them). Answer with ONLY a JSON array, nothing
before or after it, one object per story:

[{"story_id":123,"decision":"article","words":320,"priority":3,"event_date":"2026-10-24","article_type":"season_update","angle":"one sentence","line":"the profile sentence","reason":"one sentence"},
 {"story_id":124,"decision":"line","words":90,"priority":2,"event_date":"2026-10-24","line":"the profile sentence","reason":"one sentence"},
 {"story_id":128,"decision":"line","words":170,"priority":5,"event_date":"2026-10-23","line":"the profile sentence","follow_up":"what to ask, one sentence","reason":"one sentence"},
 {"story_id":125,"decision":"fold","fold_into":"story:123","reason":"one sentence"},
 {"story_id":126,"decision":"skip","reason":"one sentence"},
 {"story_id":127,"decision":"hold","reason":"one sentence"}]
`;
}

// ── the answer ──────────────────────────────────────────────────────────────

/**
 * The model's answer as verdicts for the asked stories. A story missing from
 * the answer, or with an incomplete object, gets no verdict: it is decided
 * again next run. Never guesses.
 */
export function parseDesk(text: string, asked: number[]): DeskVerdict[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const want = new Set(asked);
  const out = new Map<number, DeskVerdict>();
  for (const o of arr as Record<string, unknown>[]) {
    if (!o || typeof o !== "object") continue;
    const str = (k: string) => (typeof o[k] === "string" && (o[k] as string).trim() ? (o[k] as string).trim() : null);
    const id = Number(o.story_id);
    const decision = o.decision as Decision;
    const reason = str("reason");
    if (!want.has(id) || out.has(id) || !DECISIONS.includes(decision) || !reason) continue;
    const v: DeskVerdict = { story_id: id, decision, article_type: null, priority: null, angle: null, line: null, fold_into: null, words: null, event_date: null, follow_up: null, reason };
    if (decision === "article" || decision === "line") {
      // Both carry a profile line, a size and a priority: the length rule needs
      // all three to turn an article into a line.
      const priority = Number(o.priority);
      const words = Number(o.words);
      v.line = str("line");
      if (!v.line || !(priority >= 1 && priority <= 5) || !(words >= 0 && words <= 5000)) continue;
      v.priority = Math.round(priority);
      v.words = Math.round(words);
      // A date that is there must be a date; a missing one is allowed (some
      // sources give none) and then freshness can't be judged.
      const date = str("event_date");
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      v.event_date = date;
      v.follow_up = decision === "line" ? str("follow_up") : null;
    }
    if (decision === "article") {
      const type = str("article_type");
      v.angle = str("angle");
      if (!type || !TYPES.includes(type) || !v.angle) continue;
      v.article_type = type;
    }
    if (decision === "fold") {
      v.fold_into = str("fold_into");
      if (!v.fold_into || !/^(story|article):\d+$/.test(v.fold_into)) continue;
    }
    out.set(id, v);
  }
  return [...out.values()];
}

/** A sensitive-flagged story is never decided by the machine, whatever it answered. */
export function guardDesk(v0: DeskVerdict, s: Pick<DeskStory, "sensitive" | "discovered_at">): DeskVerdict {
  const v = applyRules(v0, s.discovered_at);
  if (!s.sensitive || v.decision === "hold" || v.decision === "skip") return v;
  return { ...v, decision: "hold", article_type: null, priority: null, angle: null, line: null, fold_into: null,
    reason: `flagged sensitive (${s.sensitive}); the desk said ${v.decision}: ${v.reason}` };
}

/**
 * Athletes' stories into batches of at most BATCH_STORIES, a group never split.
 * A live run groups by athlete. A backtest groups by athlete AND day: a live
 * run would have seen one day's stories together, not three weeks of them.
 */
export function batches<T extends { athlete_id: number; discovered_at: string }>(
  stories: T[],
  size = BATCH_STORIES,
  key: (s: T) => string = (s) => String(s.athlete_id),
): T[][][] {
  const byAthlete = new Map<string, T[]>();
  for (const s of stories) byAthlete.set(key(s), [...(byAthlete.get(key(s)) ?? []), s]);
  const out: T[][][] = [];
  let cur: T[][] = [];
  let n = 0;
  for (const g of byAthlete.values()) {
    if (n && n + g.length > size) { out.push(cur); cur = []; n = 0; }
    cur.push(g);
    n += g.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

// ── the data ────────────────────────────────────────────────────────────────

const STORY_SELECT = `SELECT s.id, s.athlete_id, s.headline, s.summary, s.content_raw, s.source_url, s.discovered_at,
       s.relevance_score, s.sensitive, COALESCE(a.preferred_name, a.name) AS athlete_name, a.sport, a.university,
       a.home_country, a.class_year, a.position, a.hometown
  FROM stories s JOIN athletes a ON a.id = s.athlete_id`;

/**
 * What the desk knew about the athlete at `asOf`. In a backtest that is the
 * story's own discovery time. Either way the article written FROM one of the
 * stories being decided is left out: shown as «already published», every story
 * would fold into itself (seen in the first dry run: Tyler Cash, story 13220).
 */
async function contextFor(db: D1Client, athleteId: number, asOf: string, exclude: number[]): Promise<AthleteContext> {
  const marks = exclude.map(() => "?").join(",") || "NULL";
  const articles = (await db.query<AthleteContext["articles"][number]>(
    `SELECT ar.id, ar.title, ar.published_at FROM articles ar
      WHERE ar.published = 1 AND ar.published_at < ? AND ar.published_at >= datetime(?, '-60 days')
        AND (ar.athlete_id = ? OR ar.id IN (SELECT article_id FROM article_athletes WHERE athlete_id = ?))
        AND (ar.story_id IS NULL OR ar.story_id NOT IN (${marks}))
      ORDER BY ar.published_at DESC LIMIT 12`,
    [asOf, asOf, athleteId, athleteId, ...exclude])).results;
  const earlier = (await db.query<AthleteContext["earlier"][number]>(
    `SELECT id, headline, discovered_at FROM stories
      WHERE athlete_id = ? AND discovered_at < ? AND discovered_at >= datetime(?, '-14 days')
        AND id NOT IN (${marks})
      ORDER BY discovered_at DESC LIMIT 10`,
    [athleteId, asOf, asOf, ...exclude])).results;
  const events = (await db.query<AthleteContext["events"][number]>(
    `SELECT occurred_on, summary FROM athlete_events
      WHERE athlete_id = ? AND (created_at IS NULL OR created_at < ?)
      ORDER BY occurred_on DESC LIMIT 8`,
    [athleteId, asOf])).results;
  return { articles, earlier, events };
}

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

// ── the report ──────────────────────────────────────────────────────────────

/** What happened to a story without the desk: drafted and published, rejected, merged, or nothing. */
export type Outcome = "published" | "rejected" | "merged" | "not drafted" | "in queue";

async function outcomes(db: D1Client, ids: number[]): Promise<Map<number, Outcome>> {
  const out = new Map<number, Outcome>();
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    const marks = part.map(() => "?").join(",");
    const rows = (await db.query<{ id: number; status: string; pub: number | null; queued: number | null; rej: number | null }>(
      `SELECT s.id, s.status,
              (SELECT MAX(ar.published) FROM articles ar WHERE ar.story_id = s.id) AS pub,
              (SELECT COUNT(*) FROM articles ar WHERE ar.story_id = s.id AND ar.published = 0) AS queued,
              (SELECT COUNT(*) FROM review_log r WHERE r.story_id = s.id AND r.decision = 'rejected') AS rej
         FROM stories s WHERE s.id IN (${marks})`, part)).results;
    for (const r of rows) {
      out.set(r.id,
        r.pub === 1 ? "published"
        : r.rej ? "rejected"
        : r.status === "merged" ? "merged"
        : r.queued ? "in queue"
        : "not drafted");
    }
  }
  return out;
}

async function report(db: D1Client, mode: string, days: number, file?: string) {
  const verdicts: (DeskVerdict & { country?: string })[] = file
    ? JSON.parse(readFileSync(file, "utf8"))
    : (await db.query<DeskVerdict & { country: string }>(
        `SELECT d.story_id, d.decision, d.article_type, d.priority, d.angle, d.line, d.fold_into, d.est_words AS words,
                d.event_date, d.follow_up, d.reason, a.home_country AS country
           FROM desk_decisions d JOIN stories s ON s.id = d.story_id JOIN athletes a ON a.id = s.athlete_id
          WHERE d.mode = ? AND d.decided_at >= datetime('now', ?)`, [mode, `-${days} days`])).results;
  const got = await outcomes(db, verdicts.map((v) => v.story_id));
  const cols: Outcome[] = ["published", "rejected", "merged", "in queue", "not drafted"];
  for (const country of [...new Set(verdicts.map((v) => v.country ?? "?"))].sort()) {
    const mine = verdicts.filter((v) => (v.country ?? "?") === country);
    console.log(`\n${country}: ${mine.length} stories. Desk decision × what happened without it`);
    console.log(`  ${"".padEnd(14)}${cols.map((c) => c.padStart(12)).join("")}`);
    for (const d of DECISIONS) {
      const row = mine.filter((v) => v.decision === d);
      if (!row.length) continue;
      const label = d === "article" ? `article ×${row.length}` : `${d} ×${row.length}`;
      console.log(`  ${label.padEnd(14)}${cols.map((c) => String(row.filter((v) => got.get(v.story_id) === c).length).padStart(12)).join("")}`);
    }
    const arts = mine.filter((v) => v.decision === "article");
    const byPrio = [5, 4, 3, 2, 1].map((p) => `${p}: ${arts.filter((v) => v.priority === p).length}`).join(" · ");
    if (arts.length) console.log(`  article priorities  ${byPrio}`);
    const by = (rule: string) => mine.filter((v) => v.decision === "line" && v.reason.startsWith(rule)).length;
    const longLines = mine.filter((v) => v.decision === "line" && (v.words ?? 0) >= ALWAYS_ARTICLE_WORDS && !v.reason.startsWith("freshness")).length;
    const follow = mine.filter((v) => v.follow_up).length;
    console.log(`  articles turned into lines: ${by("length rule")} by length, ${by("freshness rule")} by freshness · ${longLines} line(s) sized at ${ALWAYS_ARTICLE_WORDS}+ words without a freshness reason (look at these) · ${follow} follow-up(s)`);
  }
  console.log(`\nRead: "rejected" in the article row and "published" in the skip row are the disagreements to look at.`);
}

// ── the run ─────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const db = createD1Client();

  const backtest = args.includes("--backtest");
  const mode = backtest ? "backtest" : "shadow";
  if (args.includes("--report")) return report(db, mode, Number(val("--days") ?? 14), val("--in"));

  // --dump-packs <file>: write what the model would read, ask nothing, store nothing.
  const dump = val("--dump-packs");
  const dry = args.includes("--dry-run") || !!dump;
  const out = val("--out");
  const limit = Number(val("--limit") ?? 80);
  if (backtest && (!val("--from") || !val("--to"))) {
    console.error("Usage: assignment-desk.ts --backtest --from YYYY-MM-DD --to YYYY-MM-DD [--out <file.json>] [--dry-run] [--limit N]");
    process.exit(1);
  }

  // Both modes skip what they already decided, so a backtest cut short by the
  // limit or a usage cap continues where it stopped.
  const undecided = `AND s.id NOT IN (SELECT story_id FROM desk_decisions WHERE mode = '${mode}')`;
  const where = backtest
    ? `WHERE ${siteCountrySql()} AND s.relevance_score >= ? AND s.discovered_at >= ? AND s.discovered_at < date(?, '+1 day') ${undecided}`
    : `WHERE ${siteCountrySql()} AND s.relevance_score >= ? AND s.discovered_at >= datetime('now', '-${WINDOW_DAYS} days') ${undecided}`;
  const params = backtest ? [MIN_RELEVANCE_GENERATE, val("--from")!, val("--to")!] : [MIN_RELEVANCE_GENERATE];
  // Stories the pipeline will never write (archived, below the bar) are not the desk's either.
  const stories = (await db.query<DeskStory>(
    `${STORY_SELECT} ${where} AND s.status <> 'archived' ORDER BY s.athlete_id, s.discovered_at LIMIT ?`,
    [...params, limit])).results;
  console.log(`${stories.length} stor${stories.length === 1 ? "y" : "ies"} to decide (${mode}${dry ? ", dry run" : ""})`);
  if (!stories.length) return;

  const brief = briefText();
  // Two of ours in one source make ONE joint article (Mikkel, 2026-10-27);
  // the desk is told who else is in it, so it doesn't fold one into the other.
  const bySource = new Map<string, DeskStory[]>();
  for (const s of stories) if (s.source_url) {
    const k = normalizeSourceUrl(s.source_url);
    bySource.set(k, [...(bySource.get(k) ?? []), s]);
  }
  const alsoOurs = new Map<number, string[]>();
  for (const group of bySource.values()) for (const s of group) {
    const others = [...new Set(group.filter((o) => o.athlete_id !== s.athlete_id).map((o) => o.athlete_name))];
    if (others.length) alsoOurs.set(s.id, others);
  }
  const decided: (DeskVerdict & { country: string })[] = [];
  const key = backtest ? (s: DeskStory) => `${s.athlete_id}:${day(s.discovered_at)}` : undefined;
  for (const batch of batches(stories, BATCH_STORIES, key)) {
    const groups = [];
    for (const g of batch) {
      const asOf = backtest ? g[0].discovered_at : new Date().toISOString().slice(0, 19).replace("T", " ");
      groups.push({ stories: g, ctx: await contextFor(db, g[0].athlete_id, asOf, g.map((s) => s.id)) });
    }
    const asked = batch.flat();
    const pack = buildDeskPack(groups, brief, alsoOurs);
    if (dump) { appendFileSync(dump, `${pack}\n===== end of pack =====\n`); continue; }
    const answer = askModel(pack);
    const verdicts = answer ? parseDesk(answer, asked.map((s) => s.id)) : [];
    for (const v0 of verdicts) {
      const s = asked.find((x) => x.id === v0.story_id)!;
      const v = guardDesk(v0, s);
      decided.push({ ...v, country: s.home_country });
      console.log(`  story ${v.story_id}: ${v.decision}${v.priority ? ` p${v.priority}` : ""}`);
      if (dry) continue;
      await db.execute(
        `INSERT OR IGNORE INTO desk_decisions (story_id, decision, article_type, priority, angle, line, fold_into, est_words, event_date, follow_up, reason, model, mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.story_id, v.decision, v.article_type, v.priority, v.angle, v.line, v.fold_into, v.words, v.event_date, v.follow_up, v.reason, MODEL, mode]);
    }
    const missing = asked.length - verdicts.length;
    if (missing) console.log(`  ! ${missing} of ${asked.length} without a valid decision: tried again next run`);
  }

  if (out) writeFileSync(out, JSON.stringify(decided, null, 2));
  const count = (d: Decision, c?: string) => decided.filter((v) => v.decision === d && (!c || v.country === c)).length;
  console.log(DECISIONS.map((d) => `${d} ${count(d)}`).join(" · "));
  if (dry || backtest || !decided.length) return;

  // Discord, per site: the counts, and the articles the desk would assign, best first.
  for (const country of [...new Set(decided.map((v) => v.country))]) {
    const name = (id: number) => stories.find((s) => s.id === id)?.athlete_name ?? "";
    const arts = decided
      .filter((v) => v.country === country && v.decision === "article")
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((v) => clip(`**p${v.priority}** ${name(v.story_id)}: ${v.angle}`, 200))
      .join("\n");
    const follows = decided
      .filter((v) => v.country === country && v.follow_up)
      .map((v) => clip(`${name(v.story_id)}: ${v.follow_up}`, 200))
      .join("\n");
    const holds = decided
      .filter((v) => v.country === country && v.decision === "hold")
      .map((v) => clip(`${name(v.story_id)}: ${v.reason}`, 200))
      .join("\n");
    await notify(
      {
        title: `🗂️ Assignment desk (shadow): ${countryProfile(country).brand}`,
        color: COLOR.report,
        description: DECISIONS.map((d) => `${d} ${count(d, country)}`).join(" · "),
        fields: [
          ...(arts ? [{ name: "Would assign as articles", value: clip(arts, 1024) }] : []),
          ...(holds ? [{ name: "Would hold for you", value: clip(holds, 1024) }] : []),
          ...(follows ? [{ name: "Worth a follow-up (big news, thin material)", value: clip(follows, 1024) }] : []),
        ],
      },
      country,
    );
  }
}

if (process.argv[1]?.endsWith("assignment-desk.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
