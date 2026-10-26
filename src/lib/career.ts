/**
 * Career by season on a profile (PLAN-content-floor-uk.md, P1): the athlete's
 * earlier seasons at the same school, from the school's archived stats pages
 * (pipeline/stats/backfill-career.ts), stored in athlete_season_stats under
 * their own season key («2025-26»). Every reader of that table filters on the
 * current season, so a past row never makes a profile public on its own.
 * ===========================================================================
 *
 * The table cells do not count towards the 200-word floor, so each season
 * gets a sentence, plus one summing up — every number one we hold. No pronouns:
 * the athlete is called by surname.
 */
import { seasonFromDate } from "./athlete-events";
import type { WLT } from "./team-context";

export interface CareerSeason {
  season: string;          // «2025-26»
  kind: "outfield" | "keeper";
  games: number;
  cells: Record<string, string>;
  school: string;
  record: WLT | null;      // the team's final record that season
}

/** Earlier seasons a player can have, from the roster's class year; 0 when unknown. */
export function seasonsBack(classYear: string | null): number {
  const c = (classYear ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const red = c.startsWith("r-") || c.startsWith("rs") ? 1 : 0;
  const base = c.replace(/^(r-|rs-?)/, "");
  const year =
    /^(fr|fy|1st|first|freshman)/.test(base) ? 0 :
    /^(so|2nd|second|sophomore)/.test(base) ? 1 :
    /^(jr|3rd|third|junior)/.test(base) ? 2 :
    /^(sr|4th|fourth|senior)/.test(base) ? 3 :
    /^(gr|grad|5th|6th)/.test(base) ? 4 : -1;
  return year < 0 ? 0 : year + red;
}

/** «2025-26» → «2025», the autumn the season was played. */
export const seasonYear = (season: string) => season.slice(0, 4);

const n = (v: string | undefined) => (v && /^\d+$/.test(v.trim()) ? Number(v) : 0);
const surname = (name: string) => name.trim().split(/\s+/).pop() ?? name;
const count = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
const sho = (c: Record<string, string>) => n((c["sho"] ?? c["sho/cbo"] ?? "").split(/[-/]/)[0]);

function recordText(r: WLT, lang: string): string {
  return r.t ? `${r.w}-${r.l}-${r.t}` : `${r.w}-${r.l}`;
}

function seasonEn(s: CareerSeason, who: string): string {
  const y = seasonYear(s.season);
  const gs = n(s.cells["gs"]);
  const team = s.record ? `, as ${s.school} went ${recordText(s.record, "en")}` : "";
  if (s.kind === "keeper") {
    const k = sho(s.cells), sv = n(s.cells["sv"]);
    const extra = [k ? count(k, "clean sheet", "clean sheets") : null, sv ? count(sv, "save", "saves") : null].filter(Boolean);
    return `In ${y} ${who} played ${count(s.games, "game", "games")} in goal${extra.length ? ` with ${extra.join(" and ")}` : ""}${team}.`;
  }
  const g = n(s.cells["g"]), a = n(s.cells["a"]);
  const scoring = g || a ? ` with ${count(g, "goal", "goals")} and ${count(a, "assist", "assists")}` : "";
  return `In ${y} ${who} played ${count(s.games, "game", "games")}${gs ? ` (${gs} as a starter)` : ""}${scoring}${team}.`;
}

function seasonDa(s: CareerSeason, who: string): string {
  const y = seasonYear(s.season);
  const gs = n(s.cells["gs"]);
  const team = s.record ? `, mens ${s.school} endte på ${recordText(s.record, "da")}` : "";
  if (s.kind === "keeper") {
    const k = sho(s.cells), sv = n(s.cells["sv"]);
    const extra = [k ? `${k} clean sheet${k === 1 ? "" : "s"}` : null, sv ? count(sv, "redning", "redninger") : null].filter(Boolean);
    return `I ${y} spillede ${who} ${count(s.games, "kamp", "kampe")} i målet${extra.length ? ` med ${extra.join(" og ")}` : ""}${team}.`;
  }
  const g = n(s.cells["g"]), a = n(s.cells["a"]);
  const scoring = g || a ? ` med ${count(g, "mål", "mål")} og ${count(a, "assist", "assists")}` : "";
  return `I ${y} spillede ${who} ${count(s.games, "kamp", "kampe")}${gs ? ` (${gs} fra start)` : ""}${scoring}${team}.`;
}

/**
 * One paragraph: the total over all seasons on file (this one included), a
 * season best when this season beats every earlier one, then one sentence per
 * earlier season, newest first. Empty when there is no earlier season.
 */
export function careerParagraph(
  past: CareerSeason[],
  current: { kind: string; games: number; cells: Record<string, string>; school: string } | null,
  name: string,
  lang: string,
): string {
  if (!past.length) return "";
  const da = lang === "da";
  const who = surname(name);
  const seasons = [...past].sort((a, b) => b.season.localeCompare(a.season));
  const outfield = (current?.kind ?? seasons[0].kind) === "outfield" && seasons.every((s) => s.kind === "outfield");
  const all = [...seasons.map((s) => ({ games: s.games, cells: s.cells })), ...(current ? [{ games: current.games, cells: current.cells }] : [])];
  const years = [...seasons.map((s) => Number(seasonYear(s.season))), ...(current ? [Number(seasonYear(seasonFromDate(null)))] : [])];
  const span = Math.min(...years) === Math.max(...years) ? `${years[0]}` : `${Math.min(...years)}–${Math.max(...years)}`;
  const school = current?.school ?? seasons[0].school;
  const games = all.reduce((t, s) => t + s.games, 0);
  const out: string[] = [];

  if (outfield) {
    const g = all.reduce((t, s) => t + n(s.cells["g"]), 0), a = all.reduce((t, s) => t + n(s.cells["a"]), 0);
    out.push(da
      ? `På ${count(all.length, "sæson", "sæsoner")} hos ${school} (${span}) har ${who} ${g || a ? `${count(g, "mål", "mål")} og ${count(a, "assist", "assists")} i ` : "spillet "}${count(games, "kamp", "kampe")}.`
      : `Over ${count(all.length, "season", "seasons")} at ${school} (${span}), ${who} has ${g || a ? `${count(g, "goal", "goals")} and ${count(a, "assist", "assists")} in ` : "played "}${count(games, "game", "games")}.`);
    const now = current ? n(current.cells["g"]) : 0;
    const best = Math.max(...seasons.map((s) => n(s.cells["g"])));
    const bestYear = seasonYear(seasons.find((s) => n(s.cells["g"]) === best)!.season);
    if (current && now > best && best > 0) {
      out.push(da
        ? `Sæsonens ${now} mål er allerede flere end i nogen tidligere sæson (bedst før: ${best} i ${bestYear}).`
        : `This season's ${now} goals are already more than in any earlier season (previous best: ${best} in ${bestYear}).`);
    }
  } else {
    const k = all.reduce((t, s) => t + sho(s.cells), 0);
    out.push(da
      ? `På ${count(all.length, "sæson", "sæsoner")} hos ${school} (${span}) har ${who} spillet ${count(games, "kamp", "kampe")}${k ? ` og holdt buret rent ${count(k, "gang", "gange")}` : ""}.`
      : `Over ${count(all.length, "season", "seasons")} at ${school} (${span}), ${who} has played ${count(games, "game", "games")}${k ? ` and kept ${count(k, "clean sheet", "clean sheets")}` : ""}.`);
  }
  for (const s of seasons) out.push(da ? seasonDa(s, who) : seasonEn(s, who));
  return out.join(" ");
}

/** The career table's rows: season, games, starts and the stat that matters. */
export function careerRows(past: CareerSeason[], lang: string): Array<{ season: string; cells: Array<[string, string]> }> {
  const L = lang === "da"
    ? { gp: "Kampe", gs: "Fra start", g: "Mål", a: "Assists", pts: "Point", sho: "Clean sheets", sv: "Redninger", rec: "Holdet" }
    : { gp: "Games", gs: "Starts", g: "Goals", a: "Assists", pts: "Points", sho: "Clean sheets", sv: "Saves", rec: "Team" };
  return [...past].sort((a, b) => b.season.localeCompare(a.season)).map((s) => ({
    season: seasonYear(s.season),
    cells: s.kind === "keeper"
      ? [[L.gp, String(s.games)], [L.sv, s.cells["sv"] ?? ""], [L.sho, String(sho(s.cells))], [L.rec, s.record ? recordText(s.record, lang) : ""]]
      : [[L.gp, String(s.games)], [L.gs, s.cells["gs"] ?? ""], [L.g, s.cells["g"] ?? ""], [L.a, s.cells["a"] ?? ""], [L.pts, s.cells["pts"] ?? ""], [L.rec, s.record ? recordText(s.record, lang) : ""]],
  }));
}
