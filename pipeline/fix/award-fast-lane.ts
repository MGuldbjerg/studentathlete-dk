/**
 * The award fast lane: which fresh UK stories are season awards?
 * ===========================================================================
 *
 * Mikkel, 2026-11-06: an end-of-season honour (Player of the Year, All-<league>
 * teams) is news the day it comes out. Through the normal path it waits for the
 * twice-daily drafting (07:30/19:30 UTC) and then the twice-daily Opus editor —
 * Ginny Lackey's Sun Belt Player of the Year was found 18:29 UTC and would have
 * gone live ~18 hours later, while JMU's own post was circulating with 816 likes.
 *
 * award-fast-lane.yml runs after every discovery run (every 2 h). This script is
 * its probe and costs no model call: it prints `STORIES=<ids>` for the season-
 * award stories that are ready to draft, or `STORIES=` when there are none, and
 * the workflow stops there. With ids, the workflow builds the fact sheet and the
 * draft for exactly those stories, lets the Opus editor decide exactly those
 * drafts, and publishes with the per-site spacing (--site-gap).
 *
 * UK only: Danish drafts are read and published by Mikkel (CLAUDE.md).
 * The assignment desk still rules: a story it has already decided as anything
 * but `article` (skip, fold, line, hold) is left alone. A story the desk has
 * not reached yet goes through — reaching it first is the point.
 *
 *   npx tsx pipeline/fix/award-fast-lane.ts [--days 3] [--limit 5]
 */

import { createD1Client } from "../lib/d1-client";
import { isSeasonAward } from "../generate/award-section";
import { MIN_RELEVANCE_GENERATE } from "../discover/extract-story";

export interface Candidate {
  id: number;
  headline: string | null;
  desk: string | null;
}

/** Season awards the desk has not turned down, newest-first ids capped at `limit`. */
export function pickAwardStories(rows: Candidate[], limit: number): number[] {
  return rows
    .filter((r) => isSeasonAward(r.headline))
    .filter((r) => r.desk === null || r.desk === "article")
    .slice(0, limit)
    .map((r) => r.id);
}

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const days = Number(val("--days") ?? 3) || 3;
  const limit = Number(val("--limit") ?? 5) || 5;

  const db = createD1Client();
  // Indexed on discovered_at; ~1,400 rows for 3 days. Award words are matched in
  // code (isSeasonAward has tests); SQL only narrows to drafting-ready UK stories.
  const rows = (await db.query<Candidate>(
    `SELECT s.id, s.headline,
            (SELECT d.decision FROM desk_decisions d WHERE d.story_id = s.id AND d.mode = 'live' LIMIT 1) AS desk
       FROM stories s JOIN athletes a ON a.id = s.athlete_id
      WHERE s.discovered_at >= datetime('now', '-' || ? || ' days')
        AND s.status = 'new'
        AND s.merged_into IS NULL
        AND COALESCE(s.fact_status, '') <> 'no_substance'
        AND s.relevance_score >= ?
        AND a.home_country = 'UK'
      ORDER BY s.discovered_at DESC`,
    [days, MIN_RELEVANCE_GENERATE],
  )).results;

  const ids = pickAwardStories(rows, limit);
  console.log(`${rows.length} new UK stories in ${days} days · ${ids.length} season award(s)`);
  console.log(`STORIES=${ids.join(",")}`);
}

if (process.argv[1]?.endsWith("award-fast-lane.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
