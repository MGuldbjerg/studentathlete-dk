/**
 * OG images as static files — served by Cloudflare WITHOUT starting the Worker.
 * ============================================================================
 *
 * WHY. Every `/api/og` request started the Worker, and on the free plan a
 * Worker gets 10 ms CPU per request. A cold isolate plus a D1 read plus a
 * base64 decode is over that often enough; a satori render always is. `/api/og`
 * was the single path with the most 1102 errors (~460 in the three days to
 * 23-09-2026). Static assets are free, unlimited, and never invoke the Worker.
 *
 * HOW. The image URL points at `/og/…` with the SAME query string `/api/og`
 * used to get. Two outcomes, and both are correct:
 *
 *   - The file exists in the build (exported by `pipeline/render/export-og-assets.ts`
 *     at deploy): Cloudflare's asset layer answers. The asset layer matches on
 *     the PATH only, so the query string is ignored.
 *   - It does not (an article published since the last deploy): the request
 *     falls through to the Worker, and `workers/entry.ts` hands it to `/api/og`
 *     with the query string intact — exactly what it served before.
 *
 * So a missing file costs what every image cost before this, and nothing breaks.
 *
 * Pure functions only: this module is imported by the Worker entry, the Next
 * app and the Node export script alike.
 */

/** Prefix of every static OG path. `workers/entry.ts` routes misses on it to /api/og. */
export const OG_STATIC_PREFIX = "/og/";

/** The Worker route that renders what the static layer did not have. */
export const OG_DYNAMIC_PATH = "/api/og";

/** Path (relative to public/) of a pre-rendered landscape match card. */
export function cardAssetPath(articleId: number, version: number): string {
  return `${OG_STATIC_PREFIX}cards/card-${articleId}-v${version}.webp`;
}

// ─── Cards in R2, on their own public domain ────────────────────────────────
//
// The rendered cards (`card-<id>-v<N>` WebP, `ig-<id>-v<N>` JPEG) can live in
// an R2 bucket served by a public custom domain, so neither D1 nor the deploy
// carries them and no request starts the Worker. pipeline/lib/card-store.ts
// writes them; these pure functions name them, for the site and the pipeline.

/**
 * Public base URL of the media bucket — the switch that points pages and social
 * posts at R2. Empty = cards keep the static `/og/cards/…` path (today).
 *
 * A build-time constant, not a Worker var: client components (Carousel) build
 * the same URL in the browser, and a runtime var would differ between server
 * HTML and hydration. Set it only AFTER the backfill (docs/RUNBOOK.md, «Cards
 * in R2»). `NEXT_PUBLIC_MEDIA_BASE_URL` overrides it for tests and trial builds.
 */
export const MEDIA_BASE_URL_CONFIG = "https://media.studentathlete.dk";

/** The media base URL without trailing slash, or null when cards are not in R2. */
export function mediaBaseUrl(): string | null {
  const fromEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MEDIA_BASE_URL : undefined;
  const v = (fromEnv || MEDIA_BASE_URL_CONFIG).trim().replace(/\/+$/, "");
  return v || null;
}

/** A rendered card's store key: `card-<id>-v<N>` (landscape) or `ig-<id>-v<N>` (Instagram). */
export function isCardKey(key: string): boolean {
  return /^(card|ig)-\d+-v\d+$/.test(key);
}

/** The format each card kind is rendered in (render-cards.ts): WebP for the site, JPEG for Instagram. */
export function cardContentType(key: string): "image/webp" | "image/jpeg" {
  return key.startsWith("ig-") ? "image/jpeg" : "image/webp";
}

/** Object key in the bucket: `cards/card-12-v9.webp`, `cards/ig-12-v9.jpg`. */
export function cardObjectKey(key: string): string {
  if (!isCardKey(key)) throw new Error(`Not a card key: ${key}`);
  return `cards/${key}.${cardContentType(key) === "image/jpeg" ? "jpg" : "webp"}`;
}

/** Public URL of a card in the bucket, or null while no media domain is configured. */
export function cardMediaUrl(key: string): string | null {
  const base = mediaBaseUrl();
  return base ? `${base}/${cardObjectKey(key)}` : null;
}

/** `base + url` for a site-relative path; an absolute URL (the media domain) is left alone. */
export function absoluteUrl(base: string, url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${base}${url}`;
}

/**
 * Path of a generic OG image (athlete without photo, sport page, guide).
 *
 * The file name is a hash of everything the image SHOWS. When a name,
 * university or title changes, the address changes with it — so a stale image
 * can never be served from an old file, and the export script needs no mapping
 * table: it computes the same hash from the same parameters.
 */
export function genericAssetPath(params: GenericOgParams): string {
  return `${OG_STATIC_PREFIX}g/${hashParams(params)}.webp`;
}

export interface GenericOgParams {
  title: string;
  subtitle?: string;
  sport?: string | null;
  type?: "article" | "athlete" | "sport";
  /** Design version — bump in seo.ts when the generic design changes. */
  version: number;
}

/** The query string `/api/og` needs to render these parameters itself. */
export function genericQuery(params: GenericOgParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set("title", params.title);
  if (params.subtitle) q.set("subtitle", params.subtitle);
  if (params.sport) q.set("sport", params.sport);
  if (params.type) q.set("type", params.type);
  return q;
}

/**
 * FNV-1a, 64-bit via two 32-bit halves. Not cryptographic and does not need to
 * be — it names files. It must be synchronous and identical in the Worker, in
 * Next's server components and in Node, which rules out crypto.subtle.
 */
function hashParams(p: GenericOgParams): string {
  const s = [p.version, p.type ?? "", p.sport ?? "", p.title, p.subtitle ?? ""].join("␟");
  let h1 = 0x811c9dc5;
  let h2 = 0x050c5d1f;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x01000193 + 2) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

/**
 * Where a static-layer MISS should go: the same query string on `/api/og`.
 * Returns null for anything that is not an OG path.
 */
export function dynamicFallbackUrl(url: URL): URL | null {
  if (!url.pathname.startsWith(OG_STATIC_PREFIX)) return null;
  const target = new URL(url.toString());
  target.pathname = OG_DYNAMIC_PATH;
  return target;
}
