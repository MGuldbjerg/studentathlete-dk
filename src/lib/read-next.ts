/**
 * «Read next» under an article: always up to four articles, so a reader who
 * arrived from social media has somewhere to go.
 * ========================================================================
 *
 * The old list showed only the same athlete's other articles. Most athletes
 * have one article, so it was empty under 47 % of the UK and 36 % of the DK
 * articles (2026-10-28). It now fills in tiers:
 *
 *   1. the same athlete (subject, or named via article_athletes)
 *   2. the same sport
 *   3. the same school (the primary athlete's `university`)
 *   4. the site's newest articles
 *
 * Every tier is this site's published articles minus the current one. The SQL
 * is ONE round trip: a UNION ALL of four small sub-selects, each newest first
 * with a LIMIT, each tagged with its tier. Each one walks an index and stops at
 * its LIMIT (`_read-next-test.ts` holds the plan to that). The merge — tier
 * order, de-dup, cut to four — is the pure function below.
 *
 * Kept apart from db.ts (no Cloudflare import) so the test can run the SQL on
 * a real SQLite.
 */
import { ARTICLE_LIST_SELECT } from "./article-list";

export const READ_NEXT_LIMIT = 4;

export interface ReadNextKeys {
  articleId: number;
  /** Site country, upper case (articles.country). */
  country: string;
  /** The article's primary athlete, or null. Also the key to the school. */
  athleteId: number | null;
  /** The athlete's sport as stored (athletes.sport), or null. */
  sport: string | null;
}

/**
 * The read-next SQL and its parameters. A tier whose key is missing (no
 * athlete, no sport) is left out rather than bound to NULL: `at.sport = NULL`
 * matches nothing but could still walk every article of the site to find that
 * out.
 */
export function readNextQuery(k: ReadNextKeys, limit = READ_NEXT_LIMIT): { sql: string; params: (string | number)[] } {
  const parts: string[] = [];
  const params: (string | number)[] = [];
  const DEFAULT_FROM = `articles a LEFT JOIN athletes at ON a.athlete_id = at.id`;
  const tier = (n: number, from: string, fromParams: (string | number)[], extra: string, extraParams: (string | number)[], siteIndex = true) => {
    // `+col` keeps a term out of index selection (SQLite's documented way).
    const p = siteIndex ? "" : "+";
    // A compound SELECT allows ORDER BY/LIMIT only at the end, so each tier is
    // wrapped in its own sub-select.
    parts.push(`SELECT * FROM (
      SELECT ${ARTICLE_LIST_SELECT}, ${n} AS tier
        FROM ${from}
       WHERE ${p}a.published = 1 AND ${p}a.country = ? AND a.id <> ?${extra}
       ORDER BY a.published_at DESC LIMIT ${limit})`);
    params.push(...fromParams, k.country, k.articleId, ...extraParams);
  };
  if (k.athleteId != null) {
    // The athlete's own few articles drive this tier: both halves of the
    // inner UNION are index lookups (articles.athlete_id,
    // article_athletes.athlete_id), and CROSS JOIN pins that join order —
    // left to itself SQLite walks the site's date index instead, through
    // every article, hunting for the athlete's one or two.
    tier(1,
      `(SELECT id FROM articles WHERE athlete_id = ?
         UNION SELECT article_id FROM article_athletes WHERE athlete_id = ?) ids
       CROSS JOIN articles a ON a.id = ids.id
       LEFT JOIN athletes at ON a.athlete_id = at.id`,
      [k.athleteId, k.athleteId], "", []);
  }
  // Sport: the same shape as getArticlesBySport; the planner picks between the
  // site's date index (stops at the LIMIT) and athletes(sport).
  if (k.sport) tier(2, DEFAULT_FROM, [], ` AND at.sport = ?`, [k.sport]);
  if (k.athleteId != null) {
    // The school is the primary athlete's: a primary-key lookup inside the
    // query, so the page needs no extra round trip to learn it. A school has
    // a few dozen athletes, so they drive (athletes(university), then
    // articles(athlete_id)); the date index would walk the whole site for a
    // small school — once per athlete, with the country terms left indexable.
    tier(3,
      `athletes at CROSS JOIN articles a ON a.athlete_id = at.id`,
      [], ` AND at.university = (SELECT university FROM athletes WHERE id = ?)`, [k.athleteId], false);
  }
  tier(4, DEFAULT_FROM, [], "", []);
  return { sql: parts.join("\nUNION ALL\n"), params };
}

/**
 * Tier order, newest first within a tier, each article once (in its best
 * tier), never the current article, at most `limit`. The `tier` column is
 * dropped.
 */
export function pickReadNext<T extends { id: number; published_at: string | null; tier: number }>(
  rows: T[],
  currentId: number,
  limit = READ_NEXT_LIMIT,
): Omit<T, "tier">[] {
  const sorted = [...rows].sort((x, y) =>
    x.tier - y.tier || (y.published_at ?? "").localeCompare(x.published_at ?? ""));
  const seen = new Set<number>([currentId]);
  const out: Omit<T, "tier">[] = [];
  for (const row of sorted) {
    if (out.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tier, ...rest } = row;
    out.push(rest);
  }
  return out;
}
