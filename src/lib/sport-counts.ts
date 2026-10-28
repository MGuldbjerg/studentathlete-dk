/**
 * Athletes per sport on a site, active and former, as one cached aggregate
 * (`cachedStat("sport_active_counts")` in db.ts).
 *
 * Two readers used to ask D1 separately: the home page's sport bands (active
 * per sport, cached) and every sport landing page (active + former for one
 * sport, NOT cached — 610 runs × 1,841 rows = 1.12M rows on 2026-10-27, the
 * largest single query of the day). Both now read the same hourly row; the
 * functions below are the two views of it.
 */
export interface SportActiveCount {
  sport: string;
  active: number;
  n: number;
}

/** The query that fills the cache: one row per (sport, active). */
export const SPORT_ACTIVE_COUNTS_SQL =
  `SELECT sport, active, COUNT(*) AS n FROM athletes
   WHERE home_country = ? AND sport IS NOT NULL
   GROUP BY sport, active`;

/** Active athletes per sport — the home page's sport bands. */
export function activeBySport(rows: SportActiveCount[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (r.active === 1) out.set(r.sport, (out.get(r.sport) ?? 0) + r.n);
  }
  return out;
}

/** Active and former athletes in one sport — the sport landing page. Anything not active is former. */
export function countsForSport(rows: SportActiveCount[], sport: string): { active: number; alumni: number } {
  let active = 0, alumni = 0;
  for (const r of rows) {
    if (r.sport !== sport) continue;
    if (r.active === 1) active += r.n;
    else alumni += r.n;
  }
  return { active, alumni };
}
