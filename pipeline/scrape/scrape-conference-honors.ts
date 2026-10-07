/**
 * Honours from conference award releases → `athlete_events` → the profile table.
 *
 * The rules for what counts live in conference-honors.ts; this file fetches and
 * writes. For every conference in conference-sites.ts it searches the Sidearm
 * story archive for award releases newer than `--since`, reads each one, and
 * records the honours of athletes we follow.
 *
 * Run:  npx tsx pipeline/scrape/scrape-conference-honors.ts --dry-run --since 2024-08-01
 *       npx tsx pipeline/scrape/scrape-conference-honors.ts --days 10          (nightly)
 *       npx tsx pipeline/scrape/scrape-conference-honors.ts --conference ivyleague.com --dry-run
 *
 * Publishing sourced honours straight to profiles is approved (Mikkel,
 * 2026-09-17); the source link on every row points at the conference's release.
 * Polite by construction: one request at a time per conference site, with a
 * pause, and a few sites in parallel.
 */
import { createD1Client, type D1Client } from "../lib/d1-client";
import { HARVEST_INSERT_SQL, WEEKLY_AWARDS, seasonForEvent } from "../../src/lib/athlete-events";
import { pipelineUserAgent } from "../../src/lib/site";
import { CONFERENCE_SITES, type ConferenceSite } from "./conference-sites";
import {
  extractConferenceHonours,
  headlineAward,
  indexCandidates,
  schoolAliases,
  storyLines,
  type Candidate,
  type FoundHonour,
  type StoryMeta,
} from "./conference-honors";

/** Archive searches. Each returns award releases of one shape; together they cover the measured set. */
const SEARCH_TERMS = ["of the Week", "All-", "of the Year", "Honor Roll", "Weekly", "All-America"];

/**
 * Headlines worth opening even when they name no award themselves
 * ("MEC Announces Women's Soccer Postseason Honors"): the label lines inside do.
 */
const AWARDISH = /\bhonou?rs?\b|\bawards?\b|\bselections?\b|\bteams? announced\b|\ball-(?!time|access|star)/i;

const PAGE_SIZE = 100;
const SPACING_MS = 400;
const SITE_CONCURRENCY = 4;

interface Args {
  since: string;
  dryRun: boolean;
  only: string | null;
  verbose: boolean;
}

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const val = (k: string) => {
    const i = a.indexOf(k);
    return i >= 0 && a[i + 1] ? a[i + 1] : null;
  };
  const days = parseInt(val("--days") ?? "10", 10);
  const since = val("--since") ?? new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error(`--since must be YYYY-MM-DD, got ${since}`);
  return { since, dryRun: a.includes("--dry-run"), only: val("--conference"), verbose: a.includes("--verbose") };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": pipelineUserAgent() } });
      clearTimeout(timer);
      if (res.ok) return await res.text();
      if (res.status === 404 || res.status === 403) return null;
    } catch {
      // network blip — retry
    }
    await sleep(2000 * (attempt + 1));
  }
  return null;
}

interface ArchiveRow {
  story_headline: string;
  story_postdate: string; // "9/15/2026"
  story_path: string;
  sports_cats: string | null;
}

function isoFromPostdate(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

/** Award releases on one conference site since `since`, newest first, de-duplicated. */
async function listStories(site: ConferenceSite, since: string): Promise<StoryMeta[]> {
  const out = new Map<string, StoryMeta>();
  for (const term of SEARCH_TERMS) {
    for (let page = 1; ; page++) {
      const q = new URLSearchParams({
        index: String(page), page_size: String(PAGE_SIZE), sport: "0", season: "0", school: "0", search: term,
      });
      const body = await get(`https://${site.host}/services/archives.ashx/stories?${q}`);
      await sleep(SPACING_MS);
      let rows: ArchiveRow[] = [];
      try {
        rows = (JSON.parse(body ?? "{}").data as ArchiveRow[] | null) ?? [];
      } catch {
        rows = [];
      }
      let older = false;
      for (const r of rows) {
        const date = isoFromPostdate(r.story_postdate);
        if (!date) continue;
        if (date < since) { older = true; continue; }
        const award = headlineAward(r.story_headline);
        if (award === "skip") continue;
        if (!award && !AWARDISH.test(r.story_headline)) continue;
        const url = `https://${site.host}${r.story_path}`;
        if (!out.has(url)) out.set(url, { url, headline: r.story_headline, date, category: r.sports_cats });
      }
      if (rows.length < PAGE_SIZE || older) break;
    }
  }
  return [...out.values()];
}

interface AthleteRow {
  id: number;
  name: string;
  roster_name: string | null;
  sport: string;
  gender: string | null;
  university: string;
  common_name: string | null;
  conference: string | null;
}

interface EventRow {
  id: number;
  athlete_id: number;
  award_name: string;
  season: string | null;
  occurred_on: string | null;
}

const dayDiff = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400_000;

/**
 * Write one honour, or decide it is already there.
 *
 * Weekly awards: the same week can already be on file from an article about it
 * (dated by the article, a day or two later) — within six days is the same
 * week. A weekly award from a bio has no date; the first dated one from the
 * conference gives it its date instead of standing beside it.
 * Season honours: the unique index (athlete, award, season) does the work.
 */
async function record(
  db: D1Client | null,
  h: FoundHonour,
  existing: Map<number, EventRow[]>,
): Promise<"new" | "dated" | "known"> {
  const season = seasonForEvent(h.occurred_on, h.significance);
  const rows = existing.get(h.athleteId) ?? [];
  const same = rows.filter((r) => r.award_name === h.award_name && r.season === season);

  if (WEEKLY_AWARDS.includes(h.award_name)) {
    if (same.some((r) => r.occurred_on && dayDiff(r.occurred_on, h.occurred_on) <= 6)) return "known";
    const undated = same.find((r) => !r.occurred_on);
    if (undated) {
      if (db) {
        await db.execute(`UPDATE athlete_events SET occurred_on = ?, source_url = ? WHERE id = ?`, [
          h.occurred_on, h.source_url, undated.id,
        ]);
      }
      undated.occurred_on = h.occurred_on;
      return "dated";
    }
  } else if (same.length > 0) {
    return "known";
  }

  let changes = 1;
  if (db) {
    const res = await db.execute(HARVEST_INSERT_SQL, [
      h.athleteId, h.occurred_on, season, h.kind, h.award_name, h.award_name, h.significance, h.source_url, null,
    ]);
    changes = res.meta?.changes ?? 0;
  }
  rows.push({ id: -1, athlete_id: h.athleteId, award_name: h.award_name, season, occurred_on: h.occurred_on });
  existing.set(h.athleteId, rows);
  return changes > 0 ? "new" : "known";
}

async function main(): Promise<void> {
  const args = parseArgs();
  const db = createD1Client();
  const sites = CONFERENCE_SITES.filter(
    (s) => !args.only || s.host.includes(args.only) || s.names.some((n) => n.toLowerCase().includes(args.only!.toLowerCase())),
  );

  const athletes = (
    await db.query<AthleteRow>(
      `SELECT a.id, a.name, a.roster_name, a.sport, a.gender, a.university, s.common_name, s.conference
         FROM athletes a LEFT JOIN schools s ON s.name = a.university
        WHERE a.active = 1`,
    )
  ).results;
  const events = (
    await db.query<EventRow>(`SELECT id, athlete_id, award_name, season, occurred_on FROM athlete_events`)
  ).results;
  const existing = new Map<number, EventRow[]>();
  for (const e of events) {
    const list = existing.get(e.athlete_id);
    if (list) list.push(e);
    else existing.set(e.athlete_id, [e]);
  }

  const names = new Map<number, string>(athletes.map((a) => [a.id, a.name]));
  console.log(
    `${athletes.length} athletes · ${sites.length} conference site(s) · since ${args.since}${args.dryRun ? " — DRY RUN" : ""}`,
  );

  const totals = { stories: 0, fetched: 0, found: 0, new: 0, dated: 0, known: 0 };
  const honoured = new Set<number>();
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= sites.length) return;
      const site = sites[i];
      const inConf = new Set(site.names);
      // The same athletes for every site; only "is the school in this conference" changes.
      const cands: Candidate[] = [];
      for (const a of athletes) {
        const base = {
          id: a.id, sport: a.sport, gender: a.gender,
          schoolAliases: schoolAliases(a.university, a.common_name),
          inConference: a.conference !== null && inConf.has(a.conference),
        };
        cands.push({ ...base, name: a.name });
        if (a.roster_name && a.roster_name !== a.name) cands.push({ ...base, name: a.roster_name });
      }
      const index = indexCandidates(cands);

      const stories = await listStories(site, args.since);
      let fetched = 0;
      let found = 0;
      for (const story of stories) {
        const html = await get(story.url);
        await sleep(SPACING_MS);
        if (!html) continue;
        fetched++;
        for (const h of extractConferenceHonours(story, storyLines(html), index)) {
          found++;
          honoured.add(h.athleteId);
          const outcome = await record(args.dryRun ? null : db, h, existing);
          totals[outcome]++;
          if (args.verbose || outcome !== "known") {
            console.log(
              `  ${outcome === "known" ? "·" : "✓"} ${names.get(h.athleteId)}: ${h.award_name} ${h.occurred_on} — ${story.headline}`,
            );
            if (args.verbose) console.log(`      «${h.evidence.slice(0, 140)}»`);
          }
        }
      }
      totals.stories += stories.length;
      totals.fetched += fetched;
      totals.found += found;
      console.log(`${site.names[0]}: ${stories.length} releases, ${fetched} read, ${found} honours`);
    }
  }

  await Promise.all(Array.from({ length: SITE_CONCURRENCY }, () => worker()));
  console.log(
    `\nDone: ${totals.fetched}/${totals.stories} releases read · ${totals.found} honours for ${honoured.size} athletes · ` +
      `${totals.new} new, ${totals.dated} dated an undated row, ${totals.known} already on file` +
      `${args.dryRun ? " (dry run — nothing written)" : ""}.`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("scrape-conference-honors.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
