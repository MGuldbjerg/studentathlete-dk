/**
 * Engangs-backfill: udtræk athlete_events fra allerede publicerede artikler,
 * så karriere-tidslinjen har data fra start. Idempotent (INSERT OR IGNORE).
 * Kør: npx tsx pipeline/seed/backfill-events.ts
 */
import { createD1Client } from "../lib/d1-client";
import { extractEvents, seasonFromDate } from "../../src/lib/athlete-events";

async function main() {
  const db = createD1Client();
  const res = await db.query<{
    id: number;
    athlete_id: number | null;
    title: string;
    summary: string | null;
    content: string | null;
    source_url: string | null;
    published_at: string | null;
    fact_sheet: string | null;
  }>(
    `SELECT a.id, a.athlete_id, a.title, a.summary, a.content, a.source_url, a.published_at, s.fact_sheet
     FROM articles a
     LEFT JOIN stories s ON a.story_id = s.id
     WHERE a.published = 1`,
  );

  let scanned = 0;
  let inserted = 0;
  for (const a of res.results) {
    if (!a.athlete_id) continue;
    scanned++;
    const text = [a.title, a.summary, a.content, a.fact_sheet].filter(Boolean).join("\n");
    const events = extractEvents(text);
    if (!events.length) continue;
    const season = seasonFromDate(a.published_at);
    const occurred = (a.published_at ?? new Date().toISOString()).slice(0, 10);
    for (const e of events) {
      await db.execute(
        `INSERT OR IGNORE INTO athlete_events
           (athlete_id, occurred_on, season, kind, award_name, summary, significance, source_url, article_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`,
        [a.athlete_id, occurred, season, e.kind, e.award_name, e.summary, e.significance, a.source_url ?? null, a.id],
      );
      inserted++;
    }
  }
  console.log(`Backfill færdig: ${scanned} publicerede artikler scannet, op til ${inserted} begivenheder indsat (dedup).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
