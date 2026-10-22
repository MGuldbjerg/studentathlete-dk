/**
 * The enrichment motor: facts only StudentAthlete can state, computed from our
 * own tables and put on the fact sheet as `records` lines (Mikkel 2026-10-22).
 * ===========================================================================
 *
 *   rank      «Her 6 goals are the most by a British player in NCAA Division II
 *              women's soccer this season»                       (season stats)
 *   team      «Chowan University's 7 British men's soccer players have scored
 *              23 goals between them this season»                (season stats)
 *   home      «… one of 3 men's soccer players from Bolton at Conference
 *              Carolinas schools this season»                  (roster + hometown)
 *   class     «… one of 31 British first-year players in NCAA Division II
 *              women's soccer this season»                     (roster, year enrolled)
 *   awards    «British players have won 9 Big South weekly awards this season»
 *                                                              (athlete_events)
 *   milestone «… reached 10 goals for the season» (the stats fill, last 4 days)
 *   opponent  «Barton University's men's soccer roster includes 2 British players:
 *              Tom X (Leeds) and Sam Y (Hull)»                 (roster)
 *
 * Every line is a count or a ranking over our data, dated where it can move;
 * a line that cannot be computed exactly is not written. Wording keeps the
 * NCAA's «soccer», as rosterLine does; the writer's prompt localises.
 *
 * Cost: loadEnrichData() reads the site countries' athletes, schools, this
 * season's stats and awards ONCE per generate run (a few thousand rows); every
 * story is then computed in memory. Nothing per story touches D1.
 */
import type { D1Client } from "../lib/d1-client";
import { siteCountrySql } from "../../src/lib/countries";
import { seasonFromDate } from "../../src/lib/athlete-events";
import { NATIONALITY, rosterLabel } from "./records";

export interface EAthlete {
  id: number; name: string; university: string; sport: string; gender: string | null;
  home_country: string; hometown: string | null; year_enrolled: number | null;
  division: string | null; conference: string | null;
}
export interface EStats { athlete_id: number; kind: string; games: number; goals: number; assists: number; shutouts: number; school: string; fetched_on: string }
export interface EAward { athlete_id: number; award_name: string; kind: string; occurred_on: string | null; summary: string }
export interface ESchool { name: string; common_name: string | null }
export interface EnrichData { athletes: EAthlete[]; stats: EStats[]; awards: EAward[]; schools: ESchool[]; season: string; seasonStart: number }

const num = (v: string | undefined) => (v && /^\d+$/.test(v.trim()) ? Number(v) : 0);

export async function loadEnrichData(db: D1Client, now = new Date()): Promise<EnrichData> {
  const season = seasonFromDate(now.toISOString());
  const seasonStart = Number(season.slice(0, 4));
  const athletes = (await db.query<EAthlete>(
    `SELECT a.id, a.name, a.university, a.sport, a.gender, a.home_country, a.hometown, a.year_enrolled,
            sc.division, sc.conference
       FROM athletes a LEFT JOIN schools sc ON sc.name = a.university
      WHERE a.active = 1 AND ${siteCountrySql("a.home_country")}`)).results;
  const stats = (await db.query<{ athlete_id: number; kind: string; games: number; cells: string; school: string; fetched_on: string }>(
    `SELECT athlete_id, kind, games, cells, school, fetched_on FROM athlete_season_stats WHERE season = ?`, [season]))
    .results.map((r) => {
      let c: Record<string, string> = {};
      try { c = JSON.parse(r.cells) as Record<string, string>; } catch { /* no cells: zeros */ }
      return { athlete_id: r.athlete_id, kind: r.kind, games: r.games, school: r.school, fetched_on: r.fetched_on,
        goals: r.kind === "outfield" ? num(c["g"]) : 0, assists: r.kind === "outfield" ? num(c["a"]) : 0,
        shutouts: r.kind === "keeper" ? num((c["sho"] ?? c["sho/cbo"] ?? "").split(/[-/]/)[0]) : 0 };
    });
  const awards = (await db.query<EAward>(
    `SELECT athlete_id, award_name, kind, occurred_on, summary FROM athlete_events
      WHERE season = ? AND kind IN ('award', 'milestone') AND award_name IS NOT NULL`, [season])).results;
  const schools = (await db.query<ESchool>(`SELECT name, common_name FROM schools`)).results;
  return { athletes, stats, awards, schools, season, seasonStart };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIVISION_NAMES: Record<string, string> = {
  "NCAA D1": "NCAA Division I", "NCAA D2": "NCAA Division II", "NCAA D3": "NCAA Division III",
};
export const divisionName = (d: string | null) => (d ? DIVISION_NAMES[d.trim()] ?? d.trim() : null);

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const longDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** «Bolton, England» → «Bolton». */
export const town = (h: string | null) => (h ?? "").split(",")[0].trim() || null;
/** The home nation where the hometown names one: Scotland, Wales, Northern Ireland, England. */
export function nation(h: string | null): string | null {
  const m = /\b(Scotland|Wales|Northern Ireland|England)\b/i.exec(h ?? "");
  return m ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()).replace("Of", "of") : null;
}

const sameTeam = (a: EAthlete, b: EAthlete) =>
  a.university === b.university && a.sport === b.sport && (a.gender ?? "") === (b.gender ?? "");
const sameEvent = (a: EAthlete, b: EAthlete) =>
  a.home_country === b.home_country && a.sport === b.sport && (a.gender ?? "") === (b.gender ?? "");

// ─── The lines ──────────────────────────────────────────────────────────────

/** Rank among the site country's players in the same sport, gender and division (top 5, goals or clean sheets). */
export function rankLine(me: EAthlete, d: EnrichData): string | null {
  const mine = d.stats.find((s) => s.athlete_id === me.id);
  const nat = NATIONALITY[me.home_country];
  if (!mine || !nat || !me.division) return null;
  const stat = mine.kind === "keeper" ? "shutouts" : "goals";
  const value = mine[stat];
  if (value < 1) return null;
  const peers = d.athletes.filter((a) => sameEvent(a, me) && a.division === me.division);
  const values = peers.map((p) => d.stats.find((s) => s.athlete_id === p.id && s.kind === mine.kind)?.[stat] ?? 0).filter((v) => v > 0);
  const rank = values.filter((v) => v > value).length + 1;
  const tied = values.filter((v) => v === value).length > 1;
  if (rank > 5) return null;
  const noun = stat === "goals" ? plural(value, "goal", "goals") : plural(value, "shutout", "shutouts");
  // «Among the N … with stats on file», never «the most by a British player»:
  // we read the stats pages we can, not every school's, so the pool is ours.
  const pool = `the ${peers.filter((p) => d.stats.some((s) => s.athlete_id === p.id && s.kind === mine.kind)).length} ${nat} players in ${divisionName(me.division)} ${rosterLabel(me.sport, me.gender)} with stats on file`;
  const asOf = `(school stats pages, as of ${longDate(mine.fetched_on)})`;
  if (rank === 1) return `${me.name}'s ${noun} are ${tied ? "joint " : ""}the most among ${pool} this season ${asOf}`;
  return `${me.name}'s ${noun} rank ${tied ? "joint " : ""}${ordinal(rank)} among ${pool} this season ${asOf}`;
}

/** The team's players from the site country, together. */
export function teamLine(me: EAthlete, d: EnrichData): string | null {
  const nat = NATIONALITY[me.home_country];
  if (!nat) return null;
  const team = d.athletes.filter((a) => sameTeam(a, me) && a.home_country === me.home_country);
  const withStats = team.map((a) => d.stats.find((s) => s.athlete_id === a.id && s.kind === "outfield")).filter((s): s is EStats => !!s);
  if (withStats.length < 2) return null;
  const goals = withStats.reduce((n, s) => n + s.goals, 0);
  if (goals < 1) return null;
  const school = withStats[0].school || me.university;
  const asOf = withStats.map((s) => s.fetched_on).sort().pop()!;
  return `${school}'s ${withStats.length} ${nat} ${rosterLabel(me.sport, me.gender)} players with appearances have scored ${plural(goals, "goal", "goals")} between them this season (stats page, as of ${longDate(asOf)})`;
}

/**
 * Hometown: the narrowest true group from 2 to 30 — town at conference schools,
 * then town in the division, then the home nation (not England: too broad) at
 * conference schools. A group of one is the athlete alone and says nothing.
 */
export function homeLine(me: EAthlete, d: EnrichData, asOf: Date): string | null {
  const t = town(me.hometown);
  const n = nation(me.hometown);
  const label = rosterLabel(me.sport, me.gender);
  const date = longDate(asOf.toISOString());
  const peers = d.athletes.filter((a) => sameEvent(a, me));
  const tries: Array<[EAthlete[], string]> = [];
  if (t && me.conference) tries.push([peers.filter((a) => town(a.hometown)?.toLowerCase() === t.toLowerCase() && a.conference === me.conference), `from ${t} at ${me.conference} schools`]);
  if (t && me.division) tries.push([peers.filter((a) => town(a.hometown)?.toLowerCase() === t.toLowerCase() && a.division === me.division), `from ${t} in ${divisionName(me.division)}`]);
  if (n && n !== "England" && me.conference) tries.push([peers.filter((a) => nation(a.hometown) === n && a.conference === me.conference), `from ${n} at ${me.conference} schools`]);
  for (const [group, where] of tries) {
    if (group.length >= 2 && group.length <= 30) return `${me.name} is one of ${group.length} ${label} players ${where} this season (our rosters, as of ${date})`;
  }
  return null;
}

/** First-year players: the athlete among this year's intake from the same country. */
export function classLine(me: EAthlete, d: EnrichData, asOf: Date): string | null {
  const nat = NATIONALITY[me.home_country];
  if (!nat || me.year_enrolled !== d.seasonStart || !me.division) return null;
  const n = d.athletes.filter((a) => sameEvent(a, me) && a.division === me.division && a.year_enrolled === d.seasonStart).length;
  if (n < 2) return null;
  return `${me.name} is one of ${n} ${nat} first-year players in ${divisionName(me.division)} ${rosterLabel(me.sport, me.gender)} this season (our rosters, as of ${longDate(asOf.toISOString())})`;
}

/** Weekly awards to the site country's players in the athlete's conference this season (from 2). */
export function awardsLine(me: EAthlete, d: EnrichData): string | null {
  const nat = NATIONALITY[me.home_country];
  if (!nat || !me.conference) return null;
  const weekly = /of the Week|Honor Roll|Crew of the Week/i;
  const confIds = new Set(d.athletes.filter((a) => a.home_country === me.home_country && a.conference === me.conference).map((a) => a.id));
  const n = d.awards.filter((w) => w.kind === "award" && confIds.has(w.athlete_id) && weekly.test(w.award_name)).length;
  if (n < 2) return null;
  return `${nat} players across all sports have won ${n} ${me.conference} weekly or monthly awards this season (our records)`;
}

/** A season milestone the stats fill recorded in the last four days. */
export function milestoneLine(me: EAthlete, d: EnrichData, asOf: Date): string | null {
  const cutoff = new Date(asOf.getTime() - 4 * 86_400_000).toISOString().slice(0, 10);
  const m = d.awards
    .filter((w) => w.athlete_id === me.id && w.kind === "milestone" && (w.occurred_on ?? "") >= cutoff)
    .sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""))[0];
  if (!m) return null;
  const [, stat, n] = m.award_name.split(":");
  const noun = stat === "goals" ? "goal" : stat === "assists" ? "assist" : "shutout";
  const what = n === "1" ? `scored ${me.gender === "f" ? "her" : me.gender === "m" ? "his" : "a"} first ${noun} of the season` : `reached ${n} ${noun}s for the season`;
  return `${me.name} ${what} (school stats page, ${longDate(m.occurred_on ?? asOf.toISOString())})`;
}

/** Normalised school name: «Barton College» ≈ «barton», «The University of X» ≈ «x». */
export function schoolKey(s: string): string {
  return s.toLowerCase().replace(/&/g, " and ").replace(/\b(the|university|college|of|at)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Players from the site country on the opponent's roster — only on an exact school match. */
export function opponentLine(me: EAthlete, opponent: string | null, d: EnrichData): string | null {
  const nat = NATIONALITY[me.home_country];
  if (!nat || !opponent) return null;
  const key = schoolKey(opponent);
  if (!key) return null;
  const hits = d.schools.filter((s) => schoolKey(s.name) === key || (s.common_name && schoolKey(s.common_name) === key));
  if (hits.length !== 1 || hits[0].name === me.university) return null;
  const them = d.athletes.filter((a) => a.university === hits[0].name && sameEvent(a, me));
  if (!them.length) return null;
  const named = them.slice(0, 3).map((a) => `${a.name}${town(a.hometown) ? ` (${town(a.hometown)})` : ""}`);
  const list = named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
  const lead = `${hits[0].name}'s ${rosterLabel(me.sport, me.gender)} roster includes ${plural(them.length, `${nat} player`, `${nat} players`)}`;
  return them.length > 3 ? `${lead}, among them ${list}` : `${lead}: ${list}`;
}

/**
 * The lines for one story, most telling first, at most `max`. Lines the
 * article already carries (the roster count) are not repeated here.
 */
export function enrichmentLines(athleteId: number, opponent: string | null, d: EnrichData, asOf = new Date(), max = 4): string[] {
  const me = d.athletes.find((a) => a.id === athleteId);
  if (!me) return [];
  const lines = [
    milestoneLine(me, d, asOf), rankLine(me, d), teamLine(me, d), opponentLine(me, opponent, d),
    awardsLine(me, d), homeLine(me, d, asOf), classLine(me, d, asOf),
  ].filter((l): l is string => !!l);
  return lines.slice(0, max);
}
