/**
 * The athlete's official box-score line from NCAA.com, through ncaa-api.
 * ======================================================================
 *
 * The box score has been the ground truth for numbers since v2 of the fact
 * sheet (box-score.ts) — but reached the hard way: find a «Box Score» link on
 * the source page, render it in a browser (8 a run, paid browser minutes), and
 * ask a model to copy one player's line out of 16 kB of table text.
 *
 * For NCAA soccer and field hockey the same box score exists as data.
 * ncaa-api (github.com/henrygd/ncaa-api, free, no key, 3 requests a second)
 * serves NCAA.com's scoreboard and box scores as JSON: per player, minutes,
 * starter, goals, assists, shots, shots on goal, cards, and for a keeper saves
 * and goals allowed. Checked 2026-10-08/09: soccer D1/D2/D3 and field hockey.
 *
 * So the line is computed in code — no render, no model:
 *
 *   «started», «90 minutes», «1 goal», «0 assists», «3 shots (2 on goal)»
 *   final score «Fairfield 2, Quinnipiac 1»
 *
 * Matching is exact or nothing, as everywhere else in this project:
 *   game     our school is one of the two teams (schoolKeys, as the rankings
 *            use), on the event date or the days before the story; with an
 *            opponent in the sheet, the other team must be that opponent
 *   player   the box score's first + last name equals the athlete's name (or
 *            the school's preferred first name + last name). «Roos» is not
 *            a player; a surname alone matches nobody.
 *
 * NCAA only: NAIA and junior colleges are not on NCAA.com.
 */

import { ncaaDivision, ncaaSport, schoolKeys, teamKey } from "./ncaa-rankings";

const API = "https://ncaa-api.henrygd.me";
/** The public instance allows 3 requests a second per IP. */
const PACE_MS = 400;

export interface ScoreboardTeam {
  score: string;
  names: { short: string; seo: string; full?: string };
}
export interface ScoreboardGame {
  gameID: string;
  away: ScoreboardTeam;
  home: ScoreboardTeam;
  gameState: string;
  startDate: string;
}

export interface SoccerPlayerStats {
  firstName: string;
  lastName: string;
  position?: string | null;
  minutesPlayed?: string | null;
  goals?: string | null;
  assists?: string | null;
  shots?: string | null;
  shotsOnGoal?: string | null;
  starter?: boolean | null;
  participated?: boolean | null;
  saves?: string | null;
  goalsAllowed?: string | null;
  goalie?: unknown;
  penalties?: { yellowCards?: string | null; redCards?: string | null; greenCards?: string | null } | null;
}

export interface Boxscore {
  teams: Array<{ teamId: string; seoname: string; nameShort: string; isHome: boolean }>;
  teamBoxscore: Array<{ teamId: number | string; playerStats: SoccerPlayerStats[] }>;
}

export interface OfficialLine {
  gameId: string;
  url: string;
  finalScore: string;
  statLine: string[];
}

const FILLER = new Set(["at", "of", "the", "and"]);

/** Are the letters of `abbr` in `word`, in order, starting with the same one? «ga» ⊂ «georgia». */
function abbreviates(abbr: string, word: string): boolean {
  if (abbr.length < 2 || abbr[0] !== word[0]) return false;
  let i = 0;
  for (const ch of word) if (ch === abbr[i]) i++;
  return i === abbr.length;
}

/**
 * NCAA.com abbreviates: «Ga. Southern», «Southern Conn. St.», seo «aub-montgomery».
 * Token by token, with the same number of tokens: a full word must be equal; a
 * shortened one (written with a full stop, or any seo token) may abbreviate ours.
 * Checked 2026-10-09 against Georgia Southern, Southern Connecticut State and
 * Auburn at Montgomery.
 */
export function abbreviatedNameMatches(ncaaName: string, ourKey: string, fromSeo = false): boolean {
  const raw = ncaaName.replace(/-/g, " ").split(/\s+/).filter(Boolean);
  const theirs = raw
    .map((t) => ({ word: teamKey(t), short: fromSeo || t.endsWith(".") }))
    .filter((t) => t.word && !FILLER.has(t.word));
  const ours = ourKey.split(" ").filter((w) => w && !FILLER.has(w));
  if (theirs.length === 0 || theirs.length !== ours.length) return false;
  return theirs.every((t, i) => t.word === ours[i] || (t.short && t.word !== "state" && abbreviates(t.word, ours[i])));
}

/** Does a scoreboard team name belong to our school? */
export function isOurTeam(team: ScoreboardTeam, keys: string[]): boolean {
  const names = [team.names.short, team.names.full ?? "", team.names.seo.replace(/-/g, " ")].filter(Boolean);
  if (names.some((n) => keys.includes(teamKey(n)))) return true;
  return keys.some(
    (k) => abbreviatedNameMatches(team.names.short, k) || abbreviatedNameMatches(team.names.seo, k, true),
  );
}

/**
 * Is this team the opponent the sheet names? «Holy Family University» and
 * «Holy Family» are one team; «Georgia Southern» is «Ga. Southern».
 */
export function isOpponent(team: ScoreboardTeam, opponent: string): boolean {
  const opp = teamKey(opponent.replace(/\([^)]*\)/g, " "))
    .replace(/^(the |no \d+ |\d+ )+/, "")
    .replace(/ (university|college)$/, "")
    .trim();
  if (opp.length < 4) return false;
  const names = [team.names.short, team.names.full ?? "", team.names.seo.replace(/-/g, " ")]
    .filter(Boolean)
    .map(teamKey);
  // The sheet may add a mascot («Cal State Fullerton Titans»), so NCAA.com's
  // name may be the START of the sheet's — never the other way round: «Kansas»
  // is not «Kansas City».
  return names.some((n) => n.length >= 4 && ` ${opp} `.startsWith(` ${n} `)) ||
    abbreviatedNameMatches(team.names.short, opp);
}

/**
 * The one finished game of our team on that day. With an opponent, the other
 * team must be it; without one, a single game is required — two games on a
 * day (a double-header) without an opponent to tell them apart is no match.
 */
export function pickGame(games: ScoreboardGame[], keys: string[], opponent: string | null): ScoreboardGame | null {
  const ours = games.filter(
    (g) => g.gameState === "final" && (isOurTeam(g.home, keys) || isOurTeam(g.away, keys)),
  );
  if (opponent) {
    const hit = ours.filter((g) => isOpponent(isOurTeam(g.home, keys) ? g.away : g.home, opponent));
    return hit.length === 1 ? hit[0] : null;
  }
  return ours.length === 1 ? ours[0] : null;
}

function nameKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

/** The athlete's row, by full name — or the school's preferred first name + surname. */
export function findPlayer(
  players: SoccerPlayerStats[],
  athleteName: string,
  preferredName: string | null = null,
): SoccerPlayerStats | null {
  const wanted = new Set([nameKey(athleteName)]);
  const parts = athleteName.trim().split(/\s+/);
  if (preferredName && parts.length >= 2) wanted.add(nameKey(`${preferredName} ${parts[parts.length - 1]}`));
  const hits = players.filter((p) => wanted.has(nameKey(`${p.firstName} ${p.lastName}`)));
  return hits.length === 1 ? hits[0] : null;
}

function n(v: string | null | undefined): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The stat line, in the box score's own terms. */
export function statLine(p: SoccerPlayerStats): string[] {
  if (p.participated === false) return ["did not play (official box score)"];
  const out: string[] = [];
  if (p.starter === true) out.push("started");
  else if (p.starter === false) out.push("came on as a substitute");
  const mins = n(p.minutesPlayed);
  if (mins !== null && mins > 0) out.push(plural(Math.round(mins), "minute", "minutes"));
  const goals = n(p.goals);
  const assists = n(p.assists);
  if (goals !== null) out.push(plural(goals, "goal", "goals"));
  if (assists !== null) out.push(plural(assists, "assist", "assists"));
  const shots = n(p.shots);
  const onGoal = n(p.shotsOnGoal);
  if (shots !== null && shots > 0) out.push(`${plural(shots, "shot", "shots")}${onGoal !== null ? ` (${onGoal} on goal)` : ""}`);
  // Field players carry «0 saves, 0 goals allowed» in some feeds; only a
  // keeper's row is read as one.
  const keeper = /^g(k)?$/i.test((p.position ?? "").trim()) || (n(p.saves) ?? 0) > 0;
  if (keeper) {
    const saves = n(p.saves);
    const allowed = n(p.goalsAllowed);
    if (saves !== null) out.push(plural(saves, "save", "saves"));
    if (allowed !== null) out.push(plural(allowed, "goal conceded", "goals conceded"));
  }
  const yellow = n(p.penalties?.yellowCards);
  const red = n(p.penalties?.redCards);
  const green = n(p.penalties?.greenCards);
  if (yellow) out.push(plural(yellow, "yellow card", "yellow cards"));
  if (red) out.push(plural(red, "red card", "red cards"));
  if (green) out.push(plural(green, "green card", "green cards"));
  return out;
}

/** «Fairfield 2, Quinnipiac 1» — winner first, as results are written. */
export function finalScore(g: ScoreboardGame): string {
  const a = { name: g.away.names.short, s: Number(g.away.score) };
  const h = { name: g.home.names.short, s: Number(g.home.score) };
  const [first, second] = a.s >= h.s ? [a, h] : [h, a];
  return `${first.name} ${first.s}, ${second.name} ${second.s}`;
}

/**
 * Candidate dates, most likely first: the sheet's own event date when it can
 * be read, then the story's day and the six before it: recaps run the morning
 * after, a weekly award a week later (Belmont–Drake was played on the 3rd, the
 * Player of the Week story found on the 7th). The opponent check and the
 * exact player name keep the wider window honest.
 */
export function candidateDates(eventDate: string | null, storyDate: string, now = new Date()): string[] {
  const out: string[] = [];
  const add = (d: Date) => {
    if (Number.isNaN(d.getTime()) || d > now) return;
    const iso = d.toISOString().slice(0, 10);
    if (!out.includes(iso)) out.push(iso);
  };
  if (eventDate) {
    // «October 7, 2026», «2026-10-07», «Oct. 7» (year from the story).
    const year = storyDate.slice(0, 4);
    const cleaned = eventDate.replace(/\./g, "").replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s*/i, "");
    const parsed = new Date(/\d{4}/.test(cleaned) ? `${cleaned} UTC` : `${cleaned} ${year} UTC`);
    // The sheet's date can be the release's (an award, a weekly honour), so
    // the story's own days follow it rather than being skipped.
    if (!Number.isNaN(parsed.getTime())) add(parsed);
  }
  const base = new Date(`${storyDate.slice(0, 10)}T00:00:00Z`);
  for (let back = 0; back <= 6; back++) add(new Date(base.getTime() - back * 86_400_000));
  return out;
}

export interface LookupInput {
  athleteName: string;
  preferredName: string | null;
  sport: string;
  gender: string | null;
  division: string | null;
  university: string;
  commonName: string | null;
  opponent: string | null;
  eventDate: string | null;
  /** When the story was found (stories.discovered_at). */
  storyDate: string;
}

export interface Fetcher {
  json<T>(url: string): Promise<T | null>;
}

export const httpFetcher: Fetcher = {
  async json<T>(url: string): Promise<T | null> {
    await new Promise((r) => setTimeout(r, PACE_MS));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  },
};

/** Can this athlete have a box score on NCAA.com at all? Saves the calls when not. */
export function lookupApplies(input: Pick<LookupInput, "sport" | "gender" | "division">): boolean {
  return ["soccer", "field-hockey"].includes(input.sport) && !!ncaaSport(input.sport, input.gender) && !!ncaaDivision(input.division);
}

export async function officialLine(input: LookupInput, fetcher: Fetcher = httpFetcher): Promise<OfficialLine | null> {
  if (!lookupApplies(input)) return null;
  const sport = ncaaSport(input.sport, input.gender)!;
  const division = ncaaDivision(input.division)!;
  const keys = schoolKeys(input.university, input.commonName);

  // Without an opponent to check against, the week-long window could land on
  // another game: then only the sheet's own date is tried, and without that
  // nothing is.
  const dates = input.opponent
    ? candidateDates(input.eventDate, input.storyDate)
    : candidateDates(input.eventDate, input.storyDate).slice(0, input.eventDate ? 1 : 0);
  if (!input.opponent && input.eventDate && dates.length && !/\d/.test(input.eventDate)) return null;
  for (const date of dates) {
    const [y, m, d] = date.split("-");
    const board = await fetcher.json<{ games?: Array<{ game: ScoreboardGame }> }>(
      `${API}/scoreboard/${sport}/${division}/${y}/${m}/${d}`,
    );
    const game = pickGame((board?.games ?? []).map((g) => g.game), keys, input.opponent);
    if (!game) continue;

    const box = await fetcher.json<Boxscore>(`${API}/game/${game.gameID}/boxscore`);
    if (!box?.teams || !box.teamBoxscore) return null;
    const ourSide = isOurTeam(game.home, keys) ? game.home : game.away;
    const team = box.teams.find((t) => t.seoname === ourSide.names.seo);
    const players = box.teamBoxscore.find((t) => String(t.teamId) === String(team?.teamId))?.playerStats ?? [];
    const player = findPlayer(players, input.athleteName, input.preferredName);
    // The game is right but the athlete is not in it under that name: say
    // nothing rather than guess. «Did not play» comes only from a row that says so.
    if (!player) return null;
    return {
      gameId: game.gameID,
      url: `https://www.ncaa.com/game/${game.gameID}`,
      finalScore: finalScore(game),
      statLine: statLine(player),
    };
  }
  return null;
}
