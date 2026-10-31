/**
 * How a run shares its BODY_FETCHES pages between schools (2026-10-31, Mikkel: «Y»).
 *
 * Before: schools took pages in run order until the 600 were gone, around school
 * 150 of 200. The order is the same every run (oldest check first), so the same
 * tail never had an article opened — 174 of 638 schools with UK/DK athletes, 750
 * athletes. Josh Lane's program record (18 career shutouts) sat in the body of a
 * recap titled "RMU Earns a Point …" and was never read.
 *
 * Now: schools with a site athlete go first, and each school gets an even share of
 * what is left. A school that needs less leaves the rest to the next one; an item
 * a school had no share for stays unseen and is taken next run, newest first.
 */

/** Schools with a site-country athlete first; otherwise the run order is kept. */
export function siteFirst<T extends { site_count: number }>(schools: T[]): T[] {
  return [...schools.filter((s) => s.site_count > 0), ...schools.filter((s) => s.site_count <= 0)];
}

/** This school's pages: an even share of what is left, at least 1 while any is left. */
export function bodyShare(left: number, schoolsLeft: number): number {
  if (left <= 0 || schoolsLeft <= 0) return 0;
  return Math.min(left, Math.max(1, Math.ceil(left / schoolsLeft)));
}

/** Newest first, so a school short on pages opens today's recap before last week's. Undated items last. */
export function newestFirst<T extends { pubDate: Date | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.pubDate?.getTime() ?? -Infinity) - (a.pubDate?.getTime() ?? -Infinity));
}
