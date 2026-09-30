/**
 * Engangs-backfill: udtræk athlete_events fra allerede publicerede artikler,
 * så karriere-tidslinjen har data fra start. Idempotent (INSERT OR IGNORE).
 * Kør: npx tsx pipeline/seed/backfill-events.ts
 */
import { createD1Client } from "../lib/d1-client";
import { HARVEST_INSERT_SQL, harvestRows } from "../../src/lib/athlete-events";

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
    for (const r of harvestRows({
      athleteId: a.athlete_id, articleId: a.id, sourceUrl: a.source_url,
      publishedAt: a.published_at, title: a.title, summary: a.summary,
    })) {
      const res2 = await db.execute(HARVEST_INSERT_SQL, r);
      inserted += (res2 as { meta?: { changes?: number } }).meta?.changes ?? 0;
    }
  }
  console.log(`Scanned ${scanned} published articles, inserted ${inserted} events.`);
}

// Kør kun når filen ER kommandoen. Uden den her kører `main()` også når en
// anden fil bare importerer noget herfra — se import-schools-csv.ts.
if (process.argv[1] && process.argv[1].endsWith("backfill-events.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
