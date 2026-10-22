/**
 * The national leaderboard: our athletes ranked on this season's numbers from
 * the schools' own stats pages (athlete_season_stats). Mikkel 2026-10-22: a
 * standing page with numbers that update, plus a weekly update on how it moved.
 * ===========================================================================
 *
 * Computed once a day by pipeline/stats/fill-season-stats.ts and stored as one
 * JSON value (stats_cache key 'leaderboard'), so the page reads one row. Pure:
 * no database here — the pipeline passes rows in, the page passes the JSON.
 *
 * Also the milestone rule: the day a season total crosses 1, 5, 10, 15, 20 …
 */

export const LEADERBOARD_KEY = "leaderboard";
export const TOP_N = 10;

export interface BoardInput {
  athlete_id: number;
  name: string;
  slug: string;
  university: string;
  school: string;          // the short name the stats page goes by
  sport: string;
  gender: string | null;
  division: string | null;
  kind: "outfield" | "keeper";
  games: number;
  goals: number;
  assists: number;
  shutouts: number;
}

export interface BoardRow {
  rank: number;
  tied: boolean;
  name: string;
  slug: string;
  school: string;
  division: string | null;
  value: number;
  games: number;
  /** Rank a week ago in the same table; null = not in it then. */
  prevRank: number | null;
}

export interface BoardTable {
  sport: string;
  gender: string | null;
  stat: "goals" | "assists" | "shutouts";
  /** null = the national table across divisions; «D1», «D2», «NAIA» … = that division only. */
  division: string | null;
  rows: BoardRow[];
}

export interface Leaderboard {
  country: string;
  asOf: string;           // YYYY-MM-DD, the stats' date
  weekAgo: string | null; // the snapshot movement is measured against
  tables: BoardTable[];
}

/** «NCAA D2» → «D2», «NAIA» → «NAIA»: short enough for a table cell. */
export function shortDivision(d: string | null): string | null {
  if (!d) return null;
  const m = /^NCAA\s+(D[123])$/i.exec(d.trim());
  return m ? m[1].toUpperCase() : d.trim();
}

/** Competition ranks with ties («1, 2, 2, 4»), highest value first, fewer games breaks nothing. */
export function rankRows<T>(items: T[], value: (t: T) => number): Array<{ item: T; rank: number; tied: boolean }> {
  const sorted = [...items].sort((a, b) => value(b) - value(a));
  return sorted.map((item) => {
    const v = value(item);
    const rank = sorted.findIndex((x) => value(x) === v) + 1;
    const tied = sorted.filter((x) => value(x) === v).length > 1;
    return { item, rank, tied };
  });
}

const STATS: Array<{ stat: BoardTable["stat"]; kind: BoardInput["kind"]; of: (r: BoardInput) => number }> = [
  { stat: "goals", kind: "outfield", of: (r) => r.goals },
  { stat: "assists", kind: "outfield", of: (r) => r.assists },
  { stat: "shutouts", kind: "keeper", of: (r) => r.shutouts },
];

/** One ranked table: the top TOP_N with at least one, ties at the cut kept together. */
function table(
  sport: string, gender: string | null, s: (typeof STATS)[number], division: string | null,
  pool: BoardInput[], prevPool: BoardInput[] | null,
): BoardTable | null {
  const now = pool.filter((r) => r.kind === s.kind && s.of(r) > 0);
  if (!now.length) return null;
  const ranked = rankRows(now, s.of);
  const cutRank = ranked[Math.min(TOP_N, ranked.length) - 1].rank;
  const prevRanked = prevPool ? rankRows(prevPool.filter((r) => r.kind === s.kind && s.of(r) > 0), s.of) : null;
  return {
    sport, gender, stat: s.stat, division,
    rows: ranked.filter((x) => x.rank <= cutRank).map((x) => ({
      rank: x.rank, tied: x.tied, name: x.item.name, slug: x.item.slug, school: x.item.school,
      division: shortDivision(x.item.division), value: s.of(x.item), games: x.item.games,
      prevRank: prevRanked?.find((p) => p.item.athlete_id === x.item.athlete_id)?.rank ?? null,
    })),
  };
}

/**
 * Per sport, gender and stat: the national table, then one per division
 * (Mikkel 2026-10-22: «national and split by division, show both»). A
 * division table is left out when it is the national table (one division only).
 * `previous` is the same input from a week ago, for movement.
 */
export function buildLeaderboard(country: string, asOf: string, rows: BoardInput[], previous: BoardInput[] | null, weekAgo: string | null): Leaderboard {
  const tables: BoardTable[] = [];
  const keyOf = (r: BoardInput) => `${r.sport}|${r.gender ?? ""}`;
  const groups = [...new Set(rows.map(keyOf))].sort();
  for (const g of groups) {
    const [sport, genderKey] = g.split("|");
    const gender = genderKey || null;
    const pool = rows.filter((r) => keyOf(r) === g);
    const prevPool = previous?.filter((r) => keyOf(r) === g) ?? null;
    for (const s of STATS) {
      const national = table(sport, gender, s, null, pool, prevPool);
      if (!national) continue;
      tables.push(national);
      const divisions = [...new Set(pool.filter((r) => r.kind === s.kind && s.of(r) > 0).map((r) => shortDivision(r.division) ?? "—"))].sort();
      if (divisions.length < 2) continue;
      for (const d of divisions) {
        const inDiv = (r: BoardInput) => (shortDivision(r.division) ?? "—") === d;
        const t = table(sport, gender, s, d, pool.filter(inDiv), prevPool?.filter(inDiv) ?? null);
        if (t) tables.push(t);
      }
    }
  }
  return { country, asOf, weekAgo, tables };
}

/** Season totals that count as a milestone. */
export const MILESTONES = [1, 5, 10, 15, 20, 25, 30];

/** The milestones crossed between yesterday's total and today's (usually none, sometimes one). */
export function crossed(before: number, after: number): number[] {
  return MILESTONES.filter((m) => before < m && after >= m);
}

/** The timeline line (in the athlete's site language) and canonical name for a milestone. */
export function milestoneEvent(stat: "goals" | "assists" | "shutouts", n: number, lang = "en"): { award: string; summary: string } {
  if (lang === "da") {
    const noun = stat === "goals" ? ["mål", "mål"] : stat === "assists" ? ["assist", "assists"] : ["clean sheet", "clean sheets"];
    const summary = n === 1 ? `Sæsonens første ${noun[0]}` : `Nåede ${n} ${noun[1]} i sæsonen`;
    return { award: `milestone:${stat}:${n}`, summary };
  }
  const noun = stat === "goals" ? ["goal", "goals"] : stat === "assists" ? ["assist", "assists"] : ["clean sheet", "clean sheets"];
  const summary = n === 1 ? `First ${noun[0]} of the season` : `Reached ${n} ${noun[1]} for the season`;
  return { award: `milestone:${stat}:${n}`, summary };
}
