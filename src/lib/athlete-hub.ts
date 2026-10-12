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

/** The `records` texts of a stored fact sheet; [] for anything unreadable. */
export function recordsOf(factSheetJson: string | null): string[] {
  try {
    const fs = JSON.parse(factSheetJson ?? "null") as { records?: Array<{ text?: unknown }> } | null;
    return (fs?.records ?? []).map((r) => r.text).filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}
