/**
 * The statistics dashboard's three newer views (2026-10-05):
 *
 *  - trend:     page views per day, one series per site (events.site, migration 061)
 *  - followers: one count per account per day (follower_counts, collect-followers.ts)
 *  - funnel:    per channel, posts sent vs visits those posts brought
 *
 * The funnel works because social links carry `?kilde=<channel>` (DK) or
 * `?source=<channel>` (UK) since 2026-10-05 — see taggedArticleUrl() in
 * pipeline/social/post-social.ts. Visits are only counted for visitors who
 * accepted the cookie banner, so every number here is a floor, not a total.
 *
 * Pure helpers first (tested in _social-stats-test.ts), queries after.
 */

type Row = Record<string, unknown>;

export interface SeriesPoint {
  day: string;
  value: number;
}

export interface Series {
  key: string;
  points: SeriesPoint[];
}

/** Every day from `from` to `to`, inclusive (YYYY-MM-DD, UTC). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  // A guard, not a limit anyone should meet: a typo'd year must not build a
  // million-point array in a Worker.
  for (let i = 0; d <= end && i < 1000; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/**
 * Rows of (day, key, value) → one series per key, with a point on EVERY day.
 * A day without traffic is a zero, not a gap: a line that skips a day lies
 * about the slope.
 */
export function toDailySeries(rows: Row[], keyCol: string, keys: string[], from: string, to: string): Series[] {
  const days = daysBetween(from, to);
  const byKey = new Map<string, Map<string, number>>();
  for (const k of keys) byKey.set(k, new Map());
  for (const r of rows) {
    const k = String(r[keyCol]);
    const m = byKey.get(k);
    if (m) m.set(String(r.day), Number(r.value ?? 0));
  }
  return keys.map((key) => ({ key, points: days.map((day) => ({ day, value: byKey.get(key)!.get(day) ?? 0 })) }));
}

/**
 * Follower rows → one series per channel, with ONLY the days that were
 * measured. Unlike page views, a missing day is unknown, not zero — filling it
 * with 0 would draw a crash that never happened.
 */
export function toFollowerSeries(rows: Row[]): Series[] {
  const by = new Map<string, SeriesPoint[]>();
  for (const r of rows) {
    const k = String(r.channel);
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push({ day: String(r.day), value: Number(r.followers ?? 0) });
  }
  return [...by.entries()]
    .map(([key, points]) => ({ key, points: points.sort((a, b) => a.day.localeCompare(b.day)) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** First and last measured value, and the change between them. */
export function followerSummary(s: Series): { first: number; last: number; change: number } {
  const first = s.points[0]?.value ?? 0;
  const last = s.points[s.points.length - 1]?.value ?? 0;
  return { first, last, change: last - first };
}

export interface FunnelRow {
  channel: string;
  posts: number;
  visits: number;
  /** null when nothing was posted — "visits per 0 posts" is not a number. */
  perPost: number | null;
}

/**
 * Posts per channel joined with visits per source. A channel appears when it
 * posted OR brought visits (an old post can still send readers). Sources that
 * are not a channel (`ig` = the Instagram bio link, campaign tags) are left
 * for the plain source table.
 */
export function buildFunnel(posts: Row[], visits: Row[], channels: string[]): FunnelRow[] {
  const p = new Map(posts.map((r) => [String(r.channel), Number(r.posts ?? 0)]));
  const v = new Map(visits.map((r) => [String(r.source), Number(r.visits ?? 0)]));
  return channels
    .filter((c) => (p.get(c) ?? 0) > 0 || (v.get(c) ?? 0) > 0)
    .map((channel) => {
      const posts = p.get(channel) ?? 0;
      const visits = v.get(channel) ?? 0;
      return { channel, posts, visits, perPost: posts > 0 ? Math.round((visits / posts) * 10) / 10 : null };
    })
    .sort((a, b) => b.visits - a.visits || b.posts - a.posts || a.channel.localeCompare(b.channel));
}

/** Hosts that mean "came from social" for visits without a tag (pre-2026-10-05). */
export const SOCIAL_REFERRER_HOSTS = [
  "facebook.com", "instagram.com", "threads.net", "threads.com", "bsky.app",
];

export function isSocialReferrer(host: string): boolean {
  return SOCIAL_REFERRER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * The channels the dashboard knows, with a readable label.
 *
 * ⚠️ The names are social_posts.channel values and MUST match
 * pipeline/social/registry.ts (`channelNameFor`). The registry cannot be
 * imported here (pipeline/ is outside the Next build), so
 * pipeline/social/_social-test.ts asserts the two lists are identical.
 */
const PLATFORM_LABELS: Record<string, string> = {
  bluesky: "Bluesky",
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
};
const LEGACY_CHANNELS: Record<string, string> = {
  "bluesky:DK": "bluesky",
  "bluesky:UK": "bluesky_uk",
  "facebook:DK": "facebook",
  "instagram:DK": "instagram",
};

export function dashboardChannels(countries: string[]): { channel: string; label: string }[] {
  return countries.flatMap((cc) =>
    Object.keys(PLATFORM_LABELS).map((platform) => ({
      channel: LEGACY_CHANNELS[`${platform}:${cc}`] ?? `${platform}_${cc.toLowerCase()}`,
      label: `${PLATFORM_LABELS[platform]} ${cc}`,
    })),
  );
}

// ── Queries ─────────────────────────────────────────────────────────────────
// Same contract as analytics.ts: errors become empty results, so a missing
// table (migration not run) never takes the dashboard down.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rows(db: any, sql: string, params: (string | number)[]): Promise<Row[]> {
  try {
    const r = await db.prepare(sql).bind(...params).all();
    return (r.results ?? []) as Row[];
  } catch {
    return [];
  }
}

export interface SocialStats {
  trend: Series[];
  /** Views before events.site existed, which the backfill could not place. */
  unknownSiteViews: number;
  followers: Series[];
  funnel: FunnelRow[];
  topPosts: { channel: string; path: string; title: string | null; visits: number }[];
  untaggedSocial: Row[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSocialStats(db: any, from: string, to: string, sites: string[], channels: string[]): Promise<SocialStats> {
  const p: [string, string] = [from, to];
  const PV = "FROM events WHERE event_type='pageview' AND DATE(created_at) BETWEEN ? AND ?";
  const [trendRows, followerRows, postRows, visitRows, topRows, untagged] = await Promise.all([
    rows(db, `SELECT DATE(created_at) AS day, COALESCE(site, '?') AS site, COUNT(*) AS value ${PV} GROUP BY 1, 2`, p),
    rows(db, `SELECT channel, day, followers FROM follower_counts WHERE day BETWEEN ? AND ? ORDER BY channel, day`, p),
    rows(
      db,
      `SELECT channel, COUNT(*) AS posts FROM social_posts
       WHERE status = 'posted' AND DATE(posted_at) BETWEEN ? AND ? GROUP BY channel`,
      p,
    ),
    rows(db, `SELECT source, COUNT(*) AS visits ${PV} AND source IS NOT NULL GROUP BY source`, p),
    rows(
      db,
      `SELECT source AS channel, path, COUNT(*) AS visits ${PV} AND source IS NOT NULL AND page_type = 'article'
       GROUP BY source, path ORDER BY visits DESC LIMIT 10`,
      p,
    ),
    rows(
      db,
      `SELECT referrer, COUNT(*) AS views ${PV} AND source IS NULL AND referrer IS NOT NULL
       GROUP BY referrer ORDER BY views DESC`,
      p,
    ),
  ]);

  // Titles for the top posts: the path's last segment is the article slug.
  const slugs = [...new Set(topRows.map((r) => String(r.path).split("/").filter(Boolean).pop() ?? ""))].filter(Boolean);
  const titleRows = slugs.length
    ? await rows(db, `SELECT slug, title FROM articles WHERE slug IN (${slugs.map(() => "?").join(",")})`, slugs)
    : [];
  const titles = new Map(titleRows.map((r) => [String(r.slug), String(r.title)]));

  const unknownSiteViews = trendRows.filter((r) => r.site === "?").reduce((s, r) => s + Number(r.value ?? 0), 0);

  return {
    trend: toDailySeries(trendRows, "site", sites, from, to),
    unknownSiteViews,
    followers: toFollowerSeries(followerRows),
    funnel: buildFunnel(postRows, visitRows, channels),
    topPosts: topRows.map((r) => {
      const slug = String(r.path).split("/").filter(Boolean).pop() ?? "";
      return { channel: String(r.channel), path: String(r.path), title: titles.get(slug) ?? null, visits: Number(r.visits) };
    }),
    untaggedSocial: untagged.filter((r) => isSocialReferrer(String(r.referrer))),
  };
}
