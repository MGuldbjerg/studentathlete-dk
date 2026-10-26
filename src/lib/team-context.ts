/**
 * Team context on a profile (PLAN-content-floor-uk.md, P2): the team's record
 * and totals, the athlete's share and rank on the team, the games they scored
 * in — from the stats page the daily fill already reads (Total/Opponent rows,
 * the game-by-game results table). Nothing new is fetched.
 * ===========================================================================
 *
 * Stored per athlete as JSON in athlete_season_stats.team (migration 070) by
 * pipeline/stats/fill-season-stats.ts; written into sentences here, in the
 * reader's language. A table cell does not count towards the 200-word floor
 * (the plan's decision 1), so this block is prose: every sentence is a number
 * we hold, and a sentence with nothing to say is left out — never «no data».
 *
 * No pronouns: the athlete is named, then called by surname.
 */

export interface WLT { w: number; l: number; t: number }

export interface LastGame {
  date: string;            // YYYY-MM-DD
  opponent: string;
  away: boolean;           // «at X»; false = home or neutral («vs X»)
  result: "W" | "L" | "T";
  us: number;
  them: number;
}

/** The athlete's rank on the team in one column: 1 = the most. */
export interface TeamRank { value: number; rank: number; tied: boolean }

export interface TeamContext {
  team: string;            // the short name the stats page goes by
  games: number | null;    // games the team has played
  record: WLT | null;      // overall
  conf: WLT | null;        // conference
  goals: number | null;    // scored
  against: number | null;  // conceded
  last: LastGame | null;
  /** g, a, pts, min, gs — only columns where the athlete has more than 0. */
  ranks: Partial<Record<"g" | "a" | "pts" | "min" | "gs", TeamRank>>;
  /** Games the athlete scored in, and the latest of them; null when the page lists no scorers. */
  scoredIn: { games: number; last: { date: string; opponent: string } } | null;
}

export interface TeamSubject {
  name: string;
  kind: "outfield" | "keeper" | "tennis";
  cells: Record<string, string>;
}

const n = (v: string | undefined): number | null => (v && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : null);
const surname = (name: string) => name.trim().split(/\s+/).pop() ?? name;

function ordinalEn(k: number): string {
  const s = k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] ?? "th";
  return `${k}${s}`;
}

function dateText(iso: string, lang: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

function count(k: number, one: string, many: string): string {
  return `${k} ${k === 1 ? one : many}`;
}

/** «the most on the team», «joint most», «3rd on the team». */
function rankEn(r: TeamRank): string {
  if (r.rank === 1) return r.tied ? "joint most on the team" : "the most on the team";
  return `${r.tied ? "joint " : ""}${ordinalEn(r.rank)} on the team`;
}
function rankDa(r: TeamRank): string {
  if (r.rank === 1) return r.tied ? "delt flest på holdet" : "flest på holdet";
  return `${r.tied ? "delt " : ""}${r.rank}.-flest på holdet`;
}

function recordEn(r: WLT, draws: boolean): string {
  const parts = [count(r.w, "win", "wins"), count(r.l, "defeat", "defeats")];
  if (draws) parts.push(count(r.t, "draw", "draws"));
  return parts.length === 3 ? `${parts[0]}, ${parts[1]} and ${parts[2]}` : `${parts[0]} and ${parts[1]}`;
}
function recordDa(r: WLT, draws: boolean): string {
  const parts = [count(r.w, "sejr", "sejre"), count(r.l, "nederlag", "nederlag")];
  if (draws) parts.push(`${r.t} uafgjort${r.t === 1 ? "" : "e"}`);
  return parts.length === 3 ? `${parts[0]}, ${parts[1]} og ${parts[2]}` : `${parts[0]} og ${parts[1]}`;
}
/** «2-1-1», or «2-4» when the team has no draws at all (field hockey). */
const wlt = (r: WLT, draws: boolean) => (draws ? `${r.w}-${r.l}-${r.t}` : `${r.w}-${r.l}`);
const hasDraws = (c: TeamContext) => (c.record?.t ?? 0) + (c.conf?.t ?? 0) > 0;

function teamSentencesEn(c: TeamContext): string[] {
  const out: string[] = [];
  const draws = hasDraws(c);
  if (c.games && c.record) {
    let s = `${c.team} have played ${count(c.games, "game", "games")} this season: ${recordEn(c.record, draws)}`;
    if (c.conf && c.conf.w + c.conf.l + c.conf.t > 0) s += ` (${wlt(c.conf, draws)} in conference play)`;
    out.push(`${s}.`);
  }
  if (c.goals !== null && c.against !== null) out.push(`They have scored ${c.goals} and conceded ${c.against}.`);
  if (c.last) {
    const what = c.last.result === "W" ? "win" : c.last.result === "L" ? "defeat" : "draw";
    out.push(`Their most recent game was a ${c.last.us}-${c.last.them} ${what} ${c.last.away ? "at" : "against"} ${c.last.opponent} on ${dateText(c.last.date, "en")}.`);
  }
  return out;
}

function teamSentencesDa(c: TeamContext): string[] {
  const out: string[] = [];
  const draws = hasDraws(c);
  if (c.games && c.record) {
    let s = `${c.team} har spillet ${count(c.games, "kamp", "kampe")} i denne sæson: ${recordDa(c.record, draws)}`;
    if (c.conf && c.conf.w + c.conf.l + c.conf.t > 0) s += ` (${wlt(c.conf, draws)} i konferencen)`;
    out.push(`${s}.`);
  }
  if (c.goals !== null && c.against !== null) out.push(`Holdet har scoret ${c.goals} mål og lukket ${c.against} ind.`);
  if (c.last) {
    const where = `${c.last.away ? "ude mod" : "mod"} ${c.last.opponent} den ${dateText(c.last.date, "da")}`;
    out.push(c.last.result === "T"
      ? `Seneste kamp endte ${c.last.us}-${c.last.them} ${where}.`
      : `Seneste kamp var en ${c.last.us}-${c.last.them}-${c.last.result === "W" ? "sejr" : "nederlag"} ${where}.`);
  }
  return out;
}

function meEn(c: TeamContext, s: TeamSubject): string[] {
  const out: string[] = [];
  const who = surname(s.name);
  if (s.kind === "keeper") {
    const gs = n(s.cells["gs"]), w = n(s.cells["w"]), l = n(s.cells["l"]), t = n(s.cells["t"]);
    const sho = n((s.cells["sho"] ?? s.cells["sho/cbo"] ?? "").split(/[-/]/)[0]);
    if (gs) out.push(`${who} has started ${count(gs, "game", "games")} in goal${sho ? ` and kept ${count(sho, "clean sheet", "clean sheets")}` : ""}.`);
    if (w !== null && l !== null && w + l + (t ?? 0) > 0) out.push(`With ${who} in goal, ${c.team} have ${recordEn({ w, l, t: t ?? 0 }, t !== null)}.`);
    return out;
  }
  const g = c.ranks.g, a = c.ranks.a, pts = c.ranks.pts;
  if (g && c.goals) {
    const pct = Math.round((g.value / c.goals) * 100);
    out.push(`${s.name} has ${g.value} of the team's ${c.goals} goals (${pct}%), ${rankEn(g)}.`);
  }
  if (c.scoredIn && c.games) {
    out.push(`${who} has scored in ${c.scoredIn.games} of ${c.team}'s ${c.games} games, most recently against ${c.scoredIn.last.opponent} on ${dateText(c.scoredIn.last.date, "en")}.`);
  }
  if (a && a.rank <= 3) out.push(`${who}'s ${count(a.value, "assist", "assists")} ${a.value === 1 ? "is" : "are"} ${rankEn(a)}.`);
  if (pts && pts.rank === 1 && !(g && g.rank === 1)) out.push(`${who} also has ${pts.tied ? "a share of " : ""}the most points on the team (${pts.value}).`);
  const gp = n(s.cells["gp"]), gs = c.ranks.gs, min = c.ranks.min;
  if (gp && (gs || min)) {
    const parts: string[] = [];
    if (gs) parts.push(gs.value === gp ? `started all ${count(gp, "appearance", "appearances")}` : `started ${gs.value} of ${count(gp, "appearance", "appearances")}`);
    if (min) parts.push(`logged ${min.value.toLocaleString("en-GB")} minutes${min.rank <= 5 ? `, ${rankEn(min).replace("the most", "the most")}` : ""}`);
    out.push(`${who} has ${parts.join(" and ")}.`);
  }
  return out;
}

function meDa(c: TeamContext, s: TeamSubject): string[] {
  const out: string[] = [];
  const who = surname(s.name);
  if (s.kind === "keeper") {
    const gs = n(s.cells["gs"]), w = n(s.cells["w"]), l = n(s.cells["l"]), t = n(s.cells["t"]);
    const sho = n((s.cells["sho"] ?? s.cells["sho/cbo"] ?? "").split(/[-/]/)[0]);
    if (gs) out.push(`${who} har startet ${count(gs, "kamp", "kampe")} i målet${sho ? ` og holdt buret rent ${count(sho, "gang", "gange")}` : ""}.`);
    if (w !== null && l !== null && w + l + (t ?? 0) > 0) out.push(`Med ${who} i målet har ${c.team} ${recordDa({ w, l, t: t ?? 0 }, t !== null)}.`);
    return out;
  }
  const g = c.ranks.g, a = c.ranks.a, pts = c.ranks.pts;
  if (g && c.goals) {
    const pct = Math.round((g.value / c.goals) * 100);
    out.push(`${s.name} har ${g.value} af holdets ${c.goals} mål (${pct} %), ${rankDa(g)}.`);
  }
  if (c.scoredIn && c.games) {
    out.push(`${who} har scoret i ${c.scoredIn.games} af ${c.team}s ${c.games} kampe, senest mod ${c.scoredIn.last.opponent} den ${dateText(c.scoredIn.last.date, "da")}.`);
  }
  if (a && a.rank <= 3) out.push(`${who}s ${count(a.value, "assist", "assists")} er ${rankDa(a)}.`);
  if (pts && pts.rank === 1 && !(g && g.rank === 1)) out.push(`${who} har også ${pts.tied ? "delt " : ""}flest point på holdet (${pts.value}).`);
  const gp = n(s.cells["gp"]), gs = c.ranks.gs, min = c.ranks.min;
  if (gp && (gs || min)) {
    const parts: string[] = [];
    if (gs) parts.push(gs.value === gp ? `startet inde i alle ${count(gp, "kamp", "kampe")}` : `startet inde i ${gs.value} af ${count(gp, "kamp", "kampe")}`);
    if (min) parts.push(`spillet ${min.value.toLocaleString("da-DK")} minutter${min.rank <= 5 ? `, ${rankDa(min)}` : ""}`);
    out.push(`${who} har ${parts.join(" og ")}.`);
  }
  return out;
}

/**
 * Two paragraphs: the team, then the athlete on it. Draws are named only when
 * the team has drawn at all; field hockey records are wins and defeats.
 */
export function teamParagraphs(c: TeamContext, s: TeamSubject, lang: string): string[] {
  const team = lang === "da" ? teamSentencesDa(c) : teamSentencesEn(c);
  const me = lang === "da" ? meDa(c, s) : meEn(c, s);
  return [team.join(" "), me.join(" ")].filter(Boolean);
}

/** The stored JSON, read defensively: anything unreadable is no block. */
export function readTeamContext(json: string | null | undefined): TeamContext | null {
  if (!json) return null;
  try {
    const c = JSON.parse(json) as TeamContext;
    return c && typeof c.team === "string" && c.ranks ? c : null;
  } catch {
    return null;
  }
}
