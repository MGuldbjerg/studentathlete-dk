/**
 * Earlier seasons for the profiles (PLAN-content-floor-uk.md, P1): the
 * school's ARCHIVED stats pages, one per team and season, read once.
 * ===========================================================================
 *
 * Sidearm keeps each season at /sports/<sport>/stats/<year> (Furman 2025 and
 * 2024 checked 2026-10-26: real archives, «2025 Men's Soccer Cumulative
 * Statistics», games dated that autumn). An unknown year falls back to
 * another page, so a page counts only when its <title> names the year asked
 * for (`archiveYear`).
 *
 * Who is looked for, and how far back: the roster's class year
 * (`seasonsBack`: So. 1, Jr. 2, Sr. 3, Gr. 4, a redshirt one more). The walk
 * goes back one season at a time and STOPS for an athlete the first season
 * they are not on the page with games: a transfer is never matched to an
 * older roster of their new school, and a namesake two seasons back is not
 * reached. Exact full-name match, as in the daily fill.
 *
 * Written into athlete_season_stats under the past season's key («2025-26»),
 * with that season's team context (its final record) in `team`. Every reader
 * filters on the current season. An archive does not change, so a team-season
 * that was read is remembered (stats_cache 'career_checked') and not fetched
 * again. Site countries by default; --all-countries adds the collecting ones.
 *
 *   npx tsx pipeline/stats/backfill-career.ts --dry-run --limit 20
 *   npx tsx pipeline/stats/backfill-career.ts [--limit N] [--country UK] [--all-countries]
 */
import { createD1Client } from "../lib/d1-client";
import { robotsAllows } from "../lib/robots";
import { pipelineUserAgent } from "../../src/lib/site";
import { classifierCountries, siteCountryCodes } from "../../src/lib/countries";
import { careerParagraph, seasonsBack, type CareerSeason } from "../../src/lib/career";
import { currentSeasonStart } from "../generate/timeline";
import { findRow } from "./fill-season-stats";
import { STATS_SPORTS, archiveYear, parseSeasonTables, parseTeamPage, statsUrl, teamContextFor } from "./season-stats";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const val = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] ?? null : null; };
const ONLY_COUNTRY = val("--country")?.toUpperCase() ?? null;
const LIMIT = val("--limit") ? Number(val("--limit")) : Infinity;
const HOSTS_AT_ONCE = 6;
const CHECKED_KEY = "career_checked";

interface Athlete { id: number; name: string; university: string; sport: string; gender: string | null; class_year: string | null; back: number }
interface Team { university: string; sport: string; gender: string | null; roster: string; school: string; athletes: Athlete[] }

const seasonKey = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;

async function main(): Promise<void> {
  const db = createD1Client();
  const ua = pipelineUserAgent();
  const countries = args.includes("--all-countries") ? classifierCountries().map((c) => c.code) : siteCountryCodes();
  const sports = [...STATS_SPORTS];
  const y0 = currentSeasonStart();

  // Only athletes with this season's row: the profiles that show stats.
  const athletes = (await db.query<Omit<Athlete, "back">>(
    `SELECT a.id, a.name, a.university, a.sport, a.gender, a.class_year FROM athletes a
       JOIN athlete_season_stats st ON st.athlete_id = a.id AND st.season = ? AND st.games > 0
      WHERE a.active = 1 AND a.home_country IN (${countries.map(() => "?").join(",")})
        AND a.sport IN (${sports.map(() => "?").join(",")})${ONLY_COUNTRY ? " AND a.home_country = ?" : ""}`,
    [seasonKey(y0), ...countries, ...sports, ...(ONLY_COUNTRY ? [ONLY_COUNTRY] : [])],
  )).results.map((a) => ({ ...a, back: seasonsBack(a.class_year) })).filter((a) => a.back > 0);

  const rosters = (await db.query<{ name: string; sport: string; gender: string | null; roster_url: string; common_name: string | null }>(
    `SELECT s.name, r.sport, r.gender, r.roster_url, s.common_name FROM roster_checks r JOIN schools s ON s.id = r.school_id
      WHERE r.status = 'success' AND r.roster_url IS NOT NULL AND r.sport IN (${sports.map(() => "?").join(",")})`,
    sports,
  )).results;

  const teams = new Map<string, Team>();
  for (const a of athletes) {
    const k = `${a.university}|${a.sport}|${a.gender ?? ""}`;
    if (!teams.has(k)) {
      const cands = rosters.filter((r) => r.name === a.university && r.sport === a.sport && (r.gender === a.gender || r.gender == null));
      const r = cands.find((c) => c.gender === a.gender) ?? cands[0];
      if (!r || !statsUrl(r.roster_url, y0)) continue;
      teams.set(k, { university: a.university, sport: a.sport, gender: a.gender, roster: r.roster_url,
        school: r.common_name?.split("/")[0].trim() || a.university, athletes: [] });
    }
    teams.get(k)!.athletes.push(a);
  }
  const todo = [...teams.values()].slice(0, LIMIT);

  const checkedRow = (await db.query<{ value: string }>(`SELECT value FROM stats_cache WHERE key = ? AND country = 'ALL'`, [CHECKED_KEY])).results[0];
  const checked = new Set<string>(checkedRow ? (JSON.parse(checkedRow.value) as string[]) : []);
  const existing = new Set((await db.query<{ k: string }>(
    `SELECT athlete_id || '|' || season AS k FROM athlete_season_stats WHERE season < ?`, [seasonKey(y0)])).results.map((r) => r.k));

  console.log(`${todo.reduce((t, x) => t + x.athletes.length, 0)} returning athletes with stats in ${todo.length} teams (of ${teams.size}); ${checked.size} team-seasons read before`);

  const byHost = new Map<string, Team[]>();
  for (const t of todo) { const h = new URL(t.roster).host; byHost.set(h, [...(byHost.get(h) ?? []), t]); }
  const hosts = [...byHost.keys()];
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const samples: string[] = [];
  let fetched = 0, wrongYear = 0, failed = 0, found = 0;
  const seasonsOf = new Map<number, CareerSeason[]>();

  let next = 0;
  await Promise.all(Array.from({ length: HOSTS_AT_ONCE }, async () => {
    while (next < hosts.length) {
      for (const t of byHost.get(hosts[next++])!) {
        let chain = t.athletes.filter((a) => a.back > 0);
        for (let k = 1; chain.length; k++) {
          chain = chain.filter((a) => a.back >= k);
          if (!chain.length) break;
          const year = y0 - k, season = seasonKey(year);
          const url = statsUrl(t.roster, year)!;
          if (checked.has(url)) {
            // Read before: who was found is what was written.
            chain = chain.filter((a) => existing.has(`${a.id}|${season}`));
            continue;
          }
          let html: string;
          try {
            if (!(await robotsAllows(url, ua))) { failed++; break; }
            const res = await fetch(url, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(20_000) });
            if (!res.ok) { failed++; break; }
            html = await res.text();
          } catch { failed++; break; }
          finally { await new Promise((r) => setTimeout(r, 800)); }
          if (archiveYear(html) !== year) { wrongYear++; break; }
          fetched++;
          checked.add(url);
          const tables = parseSeasonTables(html), page = parseTeamPage(html);
          const kept: Athlete[] = [];
          for (const a of chain) {
            const hit = findRow(a.name, tables);
            if (!hit) continue;
            found++;
            kept.push(a);
            const ctx = teamContextFor(a.name, t.school, tables, page);
            const games = Number(hit.row.cells["gp"]) || 0;
            writes.push({
              sql: `INSERT INTO athlete_season_stats (athlete_id, season, sport, kind, games, cells, line, school, source_url, fetched_on, team)
                    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, date('now'), ?)
                    ON CONFLICT(athlete_id, season) DO UPDATE SET kind = excluded.kind, games = excluded.games, cells = excluded.cells,
                      school = excluded.school, source_url = excluded.source_url, fetched_on = excluded.fetched_on, team = excluded.team`,
              params: [a.id, season, a.sport, hit.kind, games, JSON.stringify(hit.row.cells), t.school, url, JSON.stringify(ctx)],
            });
            seasonsOf.set(a.id, [...(seasonsOf.get(a.id) ?? []), { season, kind: hit.kind, games, cells: hit.row.cells, school: t.school, record: ctx?.record ?? null }]);
          }
          chain = kept;
        }
        for (const a of t.athletes) {
          const past = seasonsOf.get(a.id);
          if (past && samples.length < 12) samples.push(`${a.name} (${a.class_year}): ${careerParagraph(past, null, a.name, "en")}`);
        }
      }
    }
  }));

  const withPast = [...seasonsOf.keys()].length;
  console.log(`archive pages read: ${fetched} · wrong or missing year: ${wrongYear} · not readable/allowed: ${failed}`);
  console.log(`athlete-seasons found: ${found} · athletes with at least one earlier season: ${withPast}`);
  for (const s of samples) console.log(`  ${s}`);
  if (DRY) { console.log("[dry-run] nothing written"); return; }
  for (let i = 0; i < writes.length; i += 50) await db.batch(writes.slice(i, i + 50));
  await db.execute(
    `INSERT INTO stats_cache (key, country, value, computed_at) VALUES (?, 'ALL', ?, datetime('now'))
     ON CONFLICT(key, country) DO UPDATE SET value = excluded.value, computed_at = excluded.computed_at`,
    [CHECKED_KEY, JSON.stringify([...checked])],
  );
  console.log(`written: ${writes.length} past-season rows; ${checked.size} team-seasons remembered`);
}

main().catch((err) => { console.error(err); process.exit(1); });
