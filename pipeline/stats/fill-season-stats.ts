/**
 * Every athlete's current-season stats, from the school's own stats page
 * (PLAN-adsense-uk.md, 2026-10-12, migration 067).
 * =======================================================================
 *
 * Why: AdSense rejected .co.uk for low value content, so profiles with nothing
 * but a name were taken off the site — and with them 84 % of the site's Google
 * clicks, people searching a player's name. A profile with this season's
 * numbers, dated and sourced, is worth a visit, so such a profile comes back.
 *
 * How: one fetch per TEAM, not per athlete. Athletes of every site country are
 * grouped by (school, sport, gender); each group's stats page (season-stats.ts:
 * Sidearm — soccer and field hockey, and tennis win-loss records) is fetched once, robots.txt respected, one
 * request per host at a time, and a row is written for every athlete of ours
 * found on it by exact full-name match with at least one game played.
 *
 * Runs in Actions (stats-daily.yml) and by hand. Cloudflare: one read of the
 * athletes and roster tables, then batched upserts — about one row per athlete
 * with games. No Worker work, no Browser Rendering, no LLM.
 *
 *   npx tsx pipeline/stats/fill-season-stats.ts [--dry-run] [--country UK] [--limit N]
 */
import { createD1Client } from "../lib/d1-client";
import { robotsAllows } from "../lib/robots";
import { pipelineUserAgent } from "../../src/lib/site";
import { seasonFromDate } from "../../src/lib/athlete-events";
import { currentSeasonStart } from "../generate/timeline";
import { STATS_SPORTS, nameKey, pageSeason, parseSeasonTables, parseTennisTables, seasonLine, statsUrl, tennisLine, tennisRecord, type SeasonTables, type StatsRow } from "./season-stats";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const val = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] ?? null : null; };
const ONLY_COUNTRY = val("--country")?.toUpperCase() ?? null;
const LIMIT = val("--limit") ? Number(val("--limit")) : Infinity;
const HOSTS_AT_ONCE = 6;

interface Athlete { id: number; name: string; university: string; sport: string; gender: string | null; home_country: string }
interface Group { university: string; sport: string; gender: string | null; athletes: Athlete[]; url?: string; school?: string }

const UPSERT_SQL = `INSERT INTO athlete_season_stats (athlete_id, season, sport, kind, games, cells, line, school, source_url, fetched_on)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(athlete_id, season) DO UPDATE SET sport = excluded.sport, kind = excluded.kind,
    games = excluded.games, cells = excluded.cells, line = excluded.line, school = excluded.school,
    source_url = excluded.source_url, fetched_on = excluded.fetched_on`;

const num = (v: string | undefined) => (v && /^\d+$/.test(v.trim()) ? Number(v) : 0);

/** The athlete's row: goalkeeping table first (a keeper's outfield row is empty), exact name. */
export function findRow(name: string, t: SeasonTables): { kind: "keeper" | "outfield"; row: StatsRow } | null {
  const key = nameKey(name);
  const keeper = t.keepers.find((r) => nameKey(r.name) === key);
  if (keeper && num(keeper.cells["gp"]) > 0) return { kind: "keeper", row: keeper };
  const out = t.outfield.find((r) => nameKey(r.name) === key);
  if (out && num(out.cells["gp"]) > 0) return { kind: "outfield", row: out };
  return null;
}

async function main(): Promise<void> {
  const db = createD1Client();
  const ua = pipelineUserAgent();
  // Tennis reads its own tables (win-loss records, season-stats.ts); it is not in
  // STATS_SPORTS because the article writer's records line has no tennis form.
  const sports = [...STATS_SPORTS, "tennis"];
  const now = new Date();
  const season = seasonFromDate(now.toISOString());
  const today = now.toISOString().slice(0, 10);

  const athletes = (await db.query<Athlete>(
    `SELECT id, name, university, sport, gender, home_country FROM athletes
      WHERE active = 1 AND home_country IS NOT NULL AND university IS NOT NULL
        AND sport IN (${sports.map(() => "?").join(",")})${ONLY_COUNTRY ? " AND home_country = ?" : ""}`,
    ONLY_COUNTRY ? [...sports, ONLY_COUNTRY] : sports,
  )).results;

  const groups = new Map<string, Group>();
  for (const a of athletes) {
    const k = `${a.university}|${a.sport}|${a.gender ?? ""}`;
    if (!groups.has(k)) groups.set(k, { university: a.university, sport: a.sport, gender: a.gender, athletes: [] });
    groups.get(k)!.athletes.push(a);
  }

  // The roster URL per (school, sport, gender), as generate-articles looks it up — one query for all.
  const rosters = (await db.query<{ name: string; sport: string; gender: string | null; roster_url: string; common_name: string | null }>(
    `SELECT s.name, r.sport, r.gender, r.roster_url, s.common_name FROM roster_checks r JOIN schools s ON s.id = r.school_id
      WHERE r.status = 'success' AND r.roster_url IS NOT NULL AND r.sport IN (${sports.map(() => "?").join(",")})`,
    sports,
  )).results;
  const season0 = currentSeasonStart();
  for (const g of groups.values()) {
    const cands = rosters.filter((r) => r.name === g.university && r.sport === g.sport && (r.gender === g.gender || r.gender == null));
    const r = cands.find((c) => c.gender === g.gender) ?? cands[0];
    if (!r) continue;
    g.url = statsUrl(r.roster_url, season0) ?? undefined;
    g.school = r.common_name?.split("/")[0].trim() || g.university;
  }

  const todo = [...groups.values()].filter((g) => g.url).slice(0, LIMIT);
  console.log(`${athletes.length} athletes in ${groups.size} teams; ${todo.length} teams with a Sidearm stats page to fetch (season ${season})`);

  // One request per host at a time; HOSTS_AT_ONCE hosts in parallel.
  const byHost = new Map<string, Group[]>();
  for (const g of todo) { const h = new URL(g.url!).host; byHost.set(h, [...(byHost.get(h) ?? []), g]); }
  const hosts = [...byHost.keys()];
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  let fetched = 0, failed = 0, found = 0, missing = 0;

  let next = 0;
  await Promise.all(Array.from({ length: HOSTS_AT_ONCE }, async () => {
    while (next < hosts.length) {
      const host = hosts[next++];
      for (const g of byHost.get(host)!) {
        try {
          if (!(await robotsAllows(g.url!, ua))) { failed++; continue; }
          const res = await fetch(g.url!, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(20_000) });
          if (!res.ok) { failed++; continue; }
          const html = await res.text();
          // Sidearm serves the current season for any year in the URL; a page
          // saying another season (a school still on last year's) is skipped.
          const said = pageSeason(html);
          if (said && said !== season) { failed++; continue; }
          fetched++;
          if (g.sport === "tennis") {
            const tt = parseTennisTables(html);
            for (const a of g.athletes) {
              const rec = tennisRecord(a.name, tt);
              if (!rec) { missing++; continue; }
              found++;
              writes.push({
                sql: UPSERT_SQL,
                params: [a.id, season, a.sport, "tennis", rec.matches, JSON.stringify(rec.cells),
                  tennisLine(a.name, g.school!, rec.cells, now), g.school, g.url, today],
              });
            }
            continue;
          }
          const tables = parseSeasonTables(html);
          for (const a of g.athletes) {
            const hit = findRow(a.name, tables);
            if (!hit) { missing++; continue; }
            found++;
            writes.push({
              sql: UPSERT_SQL,
              params: [a.id, season, a.sport, hit.kind, num(hit.row.cells["gp"]), JSON.stringify(hit.row.cells),
                seasonLine(a.name, g.school!, tables, now), g.school, g.url, today],
            });
          }
        } catch {
          failed++;
        }
        await new Promise((r) => setTimeout(r, 800)); // politeness, per host
      }
    }
  }));

  console.log(`stats pages read: ${fetched} · not readable/allowed: ${failed} · athletes found with games: ${found} · not on the page or no games: ${missing}`);
  if (DRY) { console.log("[dry-run] nothing written"); return; }
  for (let i = 0; i < writes.length; i += 50) await db.batch(writes.slice(i, i + 50));
  console.log(`written: ${writes.length} rows`);
}

if (/fill-season-stats\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
