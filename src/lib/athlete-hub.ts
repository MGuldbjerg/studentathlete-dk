/**
 * The profile as a hub (PLAN-adsense-uk.md, step 2): numbers we already hold,
 * dated and sourced, shown on the athlete's page.
 * ==========================================================================
 *
 * Two sources, no new text:
 *   · the records lines on the athlete's latest fact sheet (pipeline/generate/
 *     records.ts, season-stats.ts, ncaa-rankings.ts) — written in English, with
 *     their own date and source, so they are shown on the English site only;
 *   · a count from our roster data: UK players on the athlete's own team.
 *
 * The regexes match the exact wording those pipeline steps write; a line that
 * does not match is left out, never guessed at (same rule as the reels).
 */

export interface HubLine {
  /** «6 goals and 2 assists in 11 games — the team lead in goals» */
  text: string;
  /** «Chowan University stats page, 8 October 2026» */
  source: string;
}

const SEASON_RE = /^(.+?)'s season statistics \(stats page, ([^)]+)\): .+? has (.+)$/;
const RANKING_RE = /^NCAA statistics through games of ([^:]+): (.+?) rank (.+)$/;

/** The football site says football; the NCAA lines say soccer. */
const british = (s: string) => s.replace(/\bsoccer\b/g, "football");

export function seasonHubLine(line: string): HubLine | null {
  const m = SEASON_RE.exec(line);
  if (!m) return null;
  const [, school, date, rest] = m;
  return { text: rest.charAt(0).toUpperCase() + rest.slice(1), source: `${school} stats page, ${date}` };
}

export function rankingHubLine(line: string): HubLine | null {
  const m = RANKING_RE.exec(line);
  if (!m) return null;
  const [, date, team, rest] = m;
  return { text: british(`${team}: ${rest}`), source: `NCAA statistics through ${date}` };
}

/** Season first, then the team's ranking; at most one of each. */
export function hubLines(records: string[]): HubLine[] {
  const season = records.map(seasonHubLine).find(Boolean) ?? null;
  const ranking = records.map(rankingHubLine).find(Boolean) ?? null;
  return [season, ranking].filter((l): l is HubLine => l !== null);
}

/** Columns shown from a stats row, in this order, with each language's label. */
const COLUMNS: Record<"outfield" | "keeper" | "tennis", Array<[string[], string, string]>> = {
  outfield: [
    [["gp"], "Games", "Kampe"], [["gs"], "Starts", "Startet"], [["min", "mins"], "Minutes", "Minutter"],
    [["g"], "Goals", "Mål"], [["a"], "Assists", "Assists"], [["pts"], "Points", "Point"],
    [["sh"], "Shots", "Skud"], [["sog"], "On target", "På mål"],
  ],
  keeper: [
    [["gp"], "Games", "Kampe"], [["gs"], "Starts", "Startet"], [["min", "mins"], "Minutes", "Minutter"],
    [["ga"], "Goals against", "Mål imod"], [["gaa"], "Per game", "Pr. kamp"], [["sv", "saves"], "Saves", "Redninger"],
    [["sv%", "pct", "sv pct"], "Save %", "Rednings-%"], [["sho", "sho/cbo"], "Clean sheets", "Clean sheets"],
  ],
  tennis: [
    [["singles"], "Singles", "Single"], [["dual"], "Singles, dual matches", "Single, holdkampe"],
    [["conf"], "Singles, conference", "Single, konference"], [["doubles"], "Doubles", "Double"],
    [["streak"], "Streak", "Stime"],
  ],
};

/** The row's cells as labelled columns; a column the page lacks is left out. */
export function statColumns(kind: "outfield" | "keeper" | "tennis", cellsJson: string, lang: string): Array<{ key: string; label: string; value: string }> {
  let cells: Record<string, string> = {};
  try { cells = JSON.parse(cellsJson) as Record<string, string>; } catch { return []; }
  const da = (lang ?? "").toLowerCase() === "da";
  const out: Array<{ key: string; label: string; value: string }> = [];
  for (const [keys, en, dk] of COLUMNS[kind] ?? []) {
    const key = keys.find((k) => typeof cells[k] === "string" && cells[k].trim() !== "" && cells[k].trim() !== "-");
    if (key) out.push({ key, label: da ? dk : en, value: cells[key].trim() });
  }
  return out;
}

/** The `records` texts of a stored fact sheet; [] for anything unreadable. */
export function recordsOf(factSheetJson: string | null): string[] {
  try {
    const fs = JSON.parse(factSheetJson ?? "null") as { records?: Array<{ text?: unknown }> } | null;
    return (fs?.records ?? []).map((r) => r.text).filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}
