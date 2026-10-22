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
import { siteCountrySql, siteCountryCodes } from "../../src/lib/countries";
import { LEADERBOARD_KEY, buildLeaderboard, crossed, milestoneEvent, type BoardInput } from "../../src/lib/leaderboard";
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
  // Tennis is OFF (2026-10-12). Its stats page is headed with the current
  // season («2026-27 … Cumulative Statistics») but at Georgia State it held a
  // full spring of dual matches (4-16) in October — last season's numbers
  // under this season's label. The heading cannot tell them apart, so the
  // reader (parseTennisTables) waits until the page's freshness can be shown,
  // e.g. against the schedule's dated results. «Season so far» must be.
  const sports = [...STATS_SPORTS];
  if (args.includes("--with-tennis")) sports.push("tennis");
  const now = new Date();
  const season = seasonFromDate(now.toISOString());
  const today = now.toISOString().slice(0, 10);

  const athletes = (await db.query<Athlete>(
    // Only countries with a SITE: a collecting country's athletes are shown
    // nowhere, so their numbers would be fetches and personal data for nothing.
    `SELECT id, name, university, sport, gender, home_country FROM athletes
      WHERE active = 1 AND ${siteCountrySql("home_country")} AND university IS NOT NULL
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
  /** Today's season totals per athlete, for the history, milestones and leaderboard. */
  const totals = new Map<number, { athlete: Athlete; kind: "outfield" | "keeper"; games: number; goals: number; assists: number; shutouts: number; url: string }>();
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
            const c = hit.row.cells;
            totals.set(a.id, {
              athlete: a, kind: hit.kind, games: num(c["gp"]), url: g.url!,
              goals: hit.kind === "outfield" ? num(c["g"]) : 0,
              assists: hit.kind === "outfield" ? num(c["a"]) : 0,
              shutouts: hit.kind === "keeper" ? num((c["sho"] ?? c["sho/cbo"] ?? "").split(/[-/]/)[0]) : 0,
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

  // ── Milestones: yesterday's stored totals against today's ─────────────────
  // Only for an athlete we already had a row for: on first sight we cannot
  // know WHEN a total was crossed, and a line dated today would be false.
  const before = new Map<number, { goals: number; assists: number; shutouts: number }>();
  for (const r of (await db.query<{ athlete_id: number; goals: number; assists: number; shutouts: number }>(
    `SELECT h.athlete_id, h.goals, h.assists, h.shutouts FROM athlete_season_stats_history h
      WHERE h.season = ? AND h.day = (SELECT MAX(day) FROM athlete_season_stats_history WHERE season = ? AND day < ?)`,
    [season, season, today])).results) before.set(r.athlete_id, r);
  const milestoneWrites: Array<{ sql: string; params: unknown[] }> = [];
  for (const [id, t] of totals) {
    const b = before.get(id);
    if (!b) continue;
    const lang = t.athlete.home_country === "DK" ? "da" : "en";
    for (const stat of ["goals", "assists", "shutouts"] as const) {
      for (const n of crossed(b[stat], t[stat])) {
        const m = milestoneEvent(stat, n, lang);
        milestoneWrites.push({
          sql: `INSERT OR IGNORE INTO athlete_events
                  (athlete_id, occurred_on, season, kind, award_name, summary, significance, source_url, article_id, created_at)
                VALUES (?, ?, ?, 'milestone', ?, ?, 'notable', ?, NULL, datetime('now'))`,
          params: [id, today, season, m.award, m.summary, t.url],
        });
      }
    }
  }
  console.log(`milestones crossed since the last fill: ${milestoneWrites.length}`);

  const historyWrites = [...totals].map(([id, t]) => ({
    sql: `INSERT INTO athlete_season_stats_history (athlete_id, season, day, games, goals, assists, shutouts)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(athlete_id, season, day) DO UPDATE SET games = excluded.games, goals = excluded.goals,
            assists = excluded.assists, shutouts = excluded.shutouts`,
    params: [id, season, today, t.games, t.goals, t.assists, t.shutouts],
  }));

  if (DRY) { console.log("[dry-run] nothing written"); return; }
  const all = [...writes, ...historyWrites, ...milestoneWrites];
  for (let i = 0; i < all.length; i += 50) await db.batch(all.slice(i, i + 50));
  console.log(`written: ${writes.length} stats rows, ${historyWrites.length} history rows, ${milestoneWrites.length} milestones`);

  await storeLeaderboards(db, season, today);
}

/**
 * The national leaderboard per site (src/lib/leaderboard.ts), from what is
 * stored now — so a partial fetch day still ranks everyone — against the
 * history snapshot nearest a week back. One stats_cache row per site.
 */
async function storeLeaderboards(db: ReturnType<typeof createD1Client>, season: string, today: string): Promise<void> {
  const weekAgoDay = (await db.query<{ day: string | null }>(
    `SELECT MAX(day) AS day FROM athlete_season_stats_history WHERE season = ? AND day <= date(?, '-7 days')`,
    [season, today])).results[0]?.day ?? null;
  const rows = (await db.query<BoardInput & { home_country: string; cells: string }>(
    `SELECT st.athlete_id, a.name, a.slug, a.university, st.school, a.sport, a.gender, sc.division, st.kind, st.games,
            st.cells, a.home_country, 0 AS goals, 0 AS assists, 0 AS shutouts
       FROM athlete_season_stats st JOIN athletes a ON a.id = st.athlete_id
       LEFT JOIN schools sc ON sc.name = a.university
      WHERE st.season = ? AND st.kind IN ('outfield', 'keeper') AND ${siteCountrySql("a.home_country")}`,
    [season])).results.map((r) => {
      const c = JSON.parse(r.cells) as Record<string, string>;
      return { ...r,
        goals: r.kind === "outfield" ? num(c["g"]) : 0,
        assists: r.kind === "outfield" ? num(c["a"]) : 0,
        shutouts: r.kind === "keeper" ? num((c["sho"] ?? c["sho/cbo"] ?? "").split(/[-/]/)[0]) : 0 };
    });
  const prev = weekAgoDay ? (await db.query<{ athlete_id: number; goals: number; assists: number; shutouts: number; games: number }>(
    `SELECT athlete_id, goals, assists, shutouts, games FROM athlete_season_stats_history WHERE season = ? AND day = ?`,
    [season, weekAgoDay])).results : null;
  for (const country of siteCountryCodes()) {
    const mine = rows.filter((r) => r.home_country === country);
    const previous = prev
      ? mine.filter((r) => prev.some((p) => p.athlete_id === r.athlete_id)).map((r) => {
          const p = prev.find((x) => x.athlete_id === r.athlete_id)!;
          return { ...r, goals: p.goals, assists: p.assists, shutouts: p.shutouts, games: p.games };
        })
      : null;
    const board = buildLeaderboard(country, today, mine, previous, weekAgoDay);
    await db.execute(
      `INSERT INTO stats_cache (key, country, value, computed_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key, country) DO UPDATE SET value = excluded.value, computed_at = excluded.computed_at`,
      [LEADERBOARD_KEY, country, JSON.stringify(board)],
    );
    console.log(`leaderboard ${country}: ${board.tables.length} tables${weekAgoDay ? `, movement against ${weekAgoDay}` : ""}`);
  }
}

if (/fill-season-stats\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
