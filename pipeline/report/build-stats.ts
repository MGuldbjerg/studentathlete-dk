/**
 * Compute the stats page's numbers and store one row per site (site_stats,
 * migration 059). Runs daily from stats-daily.yml; the page only reads.
 *
 *   npx tsx pipeline/report/build-stats.ts            compute + store
 *   npx tsx pipeline/report/build-stats.ts --dry-run  print, store nothing
 */
import { createD1Client } from "../lib/d1-client";
import { COUNTRIES } from "../../src/lib/countries";
import { siteStats, type StatsRow } from "../../src/lib/athlete-stats";

async function main(): Promise<void> {
  const dry = process.argv.includes("--dry-run");
  const db = createD1Client();
  for (const country of Object.keys(COUNTRIES)) {
    const rows = await db.query<StatsRow>(
      `SELECT sport, division, gender, hometown FROM athletes WHERE active = 1 AND home_country = ?`,
      [country],
    );
    const stats = siteStats(rows.results, country);
    const t = stats.all.totals;
    console.log(
      `${country}: ${t.total} athletes (f ${t.f} · m ${t.m} · unknown ${t.u}), ` +
        `${stats.all.bySport.length} sports` +
        (country === "UK" ? `, nation unknown ${stats.nationUnknown}, excluded ${stats.excluded}` : ""),
    );
    if (dry) continue;
    await db.execute(
      `INSERT INTO site_stats (country, data, computed_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(country) DO UPDATE SET data = excluded.data, computed_at = excluded.computed_at`,
      [country, JSON.stringify(stats)],
    );
  }
}

if (process.argv[1] && /build-stats\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("build-stats failed:", err);
    process.exit(1);
  });
}
