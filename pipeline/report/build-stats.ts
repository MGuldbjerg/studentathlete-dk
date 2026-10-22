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
import { countryProfile } from "../../src/lib/countries";
import { seasonFromDate } from "../../src/lib/athlete-events";
import { AWARDS_KEY, buildAwardTally, type AwardInput } from "../../src/lib/award-tally";

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
  await storeAwardTallies(db, dry);
}

/**
 * This season's awards per site (src/lib/award-tally.ts) — the awards page and
 * the monthly Instagram roundup read it. A name links to the profile only when
 * the profile is public on that site (article or this season's stats).
 */
async function storeAwardTallies(db: ReturnType<typeof createD1Client>, dry: boolean): Promise<void> {
  const season = seasonFromDate(null);
  const today = new Date().toISOString().slice(0, 10);
  for (const country of Object.keys(COUNTRIES)) {
    const publicSql = countryProfile(country).profilePublicMinArticles > 0
      ? `(EXISTS (SELECT 1 FROM articles ar WHERE ar.athlete_id = a.id AND ar.published = 1)
          OR EXISTS (SELECT 1 FROM article_athletes aa JOIN articles ar ON ar.id = aa.article_id WHERE aa.athlete_id = a.id AND ar.published = 1)
          OR EXISTS (SELECT 1 FROM athlete_season_stats st WHERE st.athlete_id = a.id AND st.season = '${season}' AND st.games > 0))`
      : "1";
    const rows = (await db.query<AwardInput>(
      `SELECT e.athlete_id, a.name, CASE WHEN ${publicSql} THEN a.slug END AS slug,
              COALESCE(NULLIF(trim(substr(sc.common_name, 1, instr(sc.common_name || '/', '/') - 1)), ''), a.university) AS school,
              sc.conference, a.sport, a.gender, e.award_name, e.occurred_on, e.source_url
         FROM athlete_events e JOIN athletes a ON a.id = e.athlete_id
         LEFT JOIN schools sc ON sc.name = a.university
        WHERE e.kind = 'award' AND e.season = ? AND a.home_country = ? AND e.award_name IS NOT NULL`,
      [season, country])).results;
    const tally = buildAwardTally(country, season, today, rows);
    console.log(`${country}: ${tally.total} awards to ${tally.athletes} athletes this season, ${tally.months.length} months`);
    if (dry) continue;
    await db.execute(
      `INSERT INTO stats_cache (key, country, value, computed_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key, country) DO UPDATE SET value = excluded.value, computed_at = excluded.computed_at`,
      [AWARDS_KEY, country, JSON.stringify(tally)],
    );
  }
}

if (process.argv[1] && /build-stats\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("build-stats failed:", err);
    process.exit(1);
  });
}
