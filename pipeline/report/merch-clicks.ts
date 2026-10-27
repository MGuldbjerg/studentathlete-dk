/**
 * Clicks to the athletes' Influxer stores (events, click_kind 'merch').
 * Mikkel, 2026-10-27: «tracking clicks specifically to Influxer so we can go with
 * a "I've got you 300 clicks the last 30 days, why don't we make a deal?"».
 * Bots are filtered at /api/track (isbot) and the owner's IPs excluded; the
 * visitor hash is salted per day, so «visitors» counts a person once a day.
 *
 *   npx tsx pipeline/report/merch-clicks.ts [--days 30]
 */
import { createD1Client } from "../lib/d1-client";

async function main() {
  const args = process.argv.slice(2);
  const days = Number(args[args.indexOf("--days") + 1]) || 30;
  const db = createD1Client();
  const since = `-${days} days`;
  const total = (await db.query<{ clicks: number; visitors: number; athletes: number }>(
    `SELECT COUNT(*) AS clicks, COUNT(DISTINCT visitor_hash || date(created_at)) AS visitors, COUNT(DISTINCT click_target) AS athletes
       FROM events WHERE event_type = 'click' AND click_kind = 'merch' AND created_at >= datetime('now', ?)`, [since])).results[0];
  const bySite = (await db.query<{ site: string; clicks: number }>(
    `SELECT site, COUNT(*) AS clicks FROM events
      WHERE event_type = 'click' AND click_kind = 'merch' AND created_at >= datetime('now', ?) GROUP BY site`, [since])).results;
  const top = (await db.query<{ target: string; clicks: number }>(
    `SELECT click_target AS target, COUNT(*) AS clicks FROM events
      WHERE event_type = 'click' AND click_kind = 'merch' AND created_at >= datetime('now', ?)
      GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, [since])).results;
  const stores = (await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM athletes WHERE merch_url IS NOT NULL`)).results[0];

  console.log(`Influxer store clicks, last ${days} days`);
  console.log(`  ${total?.clicks ?? 0} clicks from ${total?.visitors ?? 0} visitor-days, to ${total?.athletes ?? 0} of ${stores?.n ?? 0} linked stores`);
  if (bySite.length) console.log(`  by site: ${bySite.map((s) => `${s.site} ${s.clicks}`).join(" · ")}`);
  for (const t of top) console.log(`  ${String(t.clicks).padStart(4)}  ${t.target}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
