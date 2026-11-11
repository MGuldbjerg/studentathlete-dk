/**
 * Which local outlets could take a story about an athlete from this hometown?
 * Pure functions - the D1 read and the Discord alert live elsewhere.
 */
export type AreaLevel = "town" | "county" | "region" | "nation";

export interface OutletArea {
  outletId: number;
  areaKey: string;
  level: AreaLevel;
}

const LEVEL_RANK: Record<AreaLevel, number> = { town: 0, county: 1, region: 2, nation: 3 };

/** «Århus», «Aarhus», «Ærø», «St. Albans» -> stable ascii keys («aarhus», «aeroe», «stalbans»). */
export function normaliseArea(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Segment keys of a roster hometown, most specific first: «Bath, Somerset, UK» -> bath, somerset, uk. */
export function hometownKeys(hometown: string | null): string[] {
  if (!hometown) return [];
  return hometown.split(",").map(normaliseArea).filter(Boolean);
}

/**
 * Outlet ids for a hometown, best match first (a town match beats a county or nation one),
 * each outlet once. A nation-level outlet only comes back when nothing narrower matched.
 */
export function matchOutlets(hometown: string | null, areas: OutletArea[]): number[] {
  const keys = hometownKeys(hometown);
  const best = new Map<number, number>();
  for (const a of areas) {
    if (!keys.includes(a.areaKey)) continue;
    const rank = LEVEL_RANK[a.level];
    if (!best.has(a.outletId) || rank < best.get(a.outletId)!) best.set(a.outletId, rank);
  }
  const ranked = [...best.entries()].sort((x, y) => x[1] - y[1] || x[0] - y[0]);
  if (!ranked.length) return [];
  const narrowest = ranked[0][1];
  return ranked.filter(([, r]) => r < LEVEL_RANK.nation || narrowest === LEVEL_RANK.nation).map(([id]) => id);
}
