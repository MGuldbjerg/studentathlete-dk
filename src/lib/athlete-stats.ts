/**
 * The stats page's numbers: active athletes by gender, sport and division, and
 * on the UK site by home nation. Pure — the page fetches rows, this counts.
 * Tested in pipeline/checks/_athlete-stats-test.ts.
 */
import { NATIONS, learnTowns, resolveNation, type Nation } from "./home-nation";

export interface StatsRow {
  sport: string | null;
  division: string | null;
  gender: string | null;
  hometown: string | null;
}

export type Gender = "f" | "m" | "u";

export interface Tally {
  f: number;
  m: number;
  u: number;
  total: number;
}

export interface StatsBlock {
  totals: Tally;
  bySport: Array<{ sport: string } & Tally>;
  byDivision: Array<{ division: string } & Tally>;
}

export interface SiteStats {
  all: StatsBlock;
  /** UK only: one block per home nation. */
  nations: Partial<Record<Nation, StatsBlock>>;
  /** UK athletes whose nation we could not place (counted in `all`). */
  nationUnknown: number;
  /** Rows left out entirely because the hometown is not in the country at all. */
  excluded: number;
}

/**
 * NCAA sponsors these for one gender only, so a missing gender is not unknown.
 * Rugby, soccer, lacrosse etc. are played by both and stay unknown.
 */
const SINGLE_GENDER_SPORTS: Record<string, Gender> = {
  "field-hockey": "f",
  softball: "f",
  "acrobatics-tumbling": "f",
  football: "m",
  baseball: "m",
};

export function genderOf(row: StatsRow): Gender {
  if (row.gender === "f" || row.gender === "m") return row.gender;
  return SINGLE_GENDER_SPORTS[row.sport ?? ""] ?? "u";
}

const DIVISION_ORDER = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA D1", "NJCAA D2", "NJCAA D3"];

function empty(): Tally {
  return { f: 0, m: 0, u: 0, total: 0 };
}

function add(t: Tally, g: Gender): void {
  t[g]++;
  t.total++;
}

export function tally(rows: StatsRow[]): StatsBlock {
  const totals = empty();
  const sports = new Map<string, Tally>();
  const divisions = new Map<string, Tally>();
  for (const r of rows) {
    const g = genderOf(r);
    add(totals, g);
    const s = r.sport ?? "other";
    if (!sports.has(s)) sports.set(s, empty());
    add(sports.get(s)!, g);
    const d = r.division ?? "?";
    if (!divisions.has(d)) divisions.set(d, empty());
    add(divisions.get(d)!, g);
  }
  const rank = (d: string) => {
    const i = DIVISION_ORDER.indexOf(d);
    return i < 0 ? DIVISION_ORDER.length : i;
  };
  return {
    totals,
    bySport: [...sports].map(([sport, t]) => ({ sport, ...t })).sort((a, b) => b.total - a.total || a.sport.localeCompare(b.sport)),
    byDivision: [...divisions].map(([division, t]) => ({ division, ...t })).sort((a, b) => rank(a.division) - rank(b.division)),
  };
}

export function siteStats(rows: StatsRow[], country: string): SiteStats {
  if (country !== "UK") {
    return { all: tally(rows), nations: {}, nationUnknown: 0, excluded: 0 };
  }
  const votes = learnTowns(rows.map((r) => r.hometown));
  const kept: StatsRow[] = [];
  const byNation = new Map<Nation, StatsRow[]>();
  let unknown = 0, excluded = 0;
  for (const r of rows) {
    const n = resolveNation(r.hometown, votes);
    if (n === "not-uk") { excluded++; continue; }
    kept.push(r);
    if (n === "unknown") { unknown++; continue; }
    const list = byNation.get(n);
    if (list) list.push(r);
    else byNation.set(n, [r]);
  }
  const nations: Partial<Record<Nation, StatsBlock>> = {};
  for (const n of NATIONS) nations[n] = tally(byNation.get(n) ?? []);
  return { all: tally(kept), nations, nationUnknown: unknown, excluded };
}
