/**
 * Reglerne for kant-cachen — uden at røre workeren.
 * =================================================
 *
 * Skilt fra `worker-entry.ts` af én grund: den importerer
 * `.open-next/worker.js`, et byggeartefakt der ikke findes i et rent tjek-ud.
 * Så snart testen importerede indgangen, døde hele suiten på et modul der
 * skulle bygges først. Beslutningerne er rene og hører til her, hvor de kan
 * prøves uden et build — samme snit som `interpretContainerStatus` i
 * Instagram-adapteren.
 */

/** Hvor længe et svar må ligge på kanten. Samme 5 minutter som `s-maxage`. */
export const EDGE_TTL_SECONDS = 300;

/**
 * How long a rendered 404 may sit at the edge.
 *
 * Measured 2026-11-04: ~30 % of all Worker calls were 404s (scanners, and
 * Googlebot re-crawling removed profiles), each a full Next render at
 * ~250 ms CPU, and none cached — Next stamps `no-store` on its not-found page.
 * The cost of caching one: a URL that 404s and is then published stays a 404
 * for up to this long in that data centre. Publishing a slug someone already
 * requested is rare, so an hour is the trade.
 */
export const NOT_FOUND_EDGE_TTL = 3600;

/**
 * The routes under `src/app/api/` (folders starting with `_` are private and
 * not routed). Anything else under /api/ is a probe (`/api/.env`, `/api/stripe`,
 * `/api/actuator` …) and gets a plain 404 without starting Next.
 * `_worker-cache-test.ts` fails if a new route folder is missing here.
 */
export const KNOWN_API_ROUTES = ["admin", "digest", "mcp", "og", "track"] as const;

/** File types this site never serves from the Worker — only scanners ask for them. */
const PROBE_EXTENSION = /\.(php\d?|phtml|aspx?|ashx|jsp|cgi|pl|env|ini|cfg|conf|config|json|sql|sqlite|db|bak|backup|old|orig|save|swp|tmp|log|ya?ml|toml|lock|git|npmrc|zip|tar|gz|tgz|rar|7z|pem|key|crt|sh|bat|ps1|htaccess|htpasswd)$/i;

/** Path segments that only show up in vulnerability scans. */
const PROBE_SEGMENT = /^(wp-admin|wp-content|wp-includes|wp-login\.php|xmlrpc\.php|cgi-bin|phpmyadmin|actuator|node_modules|server-status|telescope|_profiler)$/i;

/**
 * Is this a vulnerability probe the Worker can answer with a plain 404?
 *
 * Static files (`public/`, `_next/static`, the OG images) are served by the
 * assets layer before the Worker runs, so nothing that reaches this check is a
 * real file. Must never match a reader page: reader URLs are lowercase slugs
 * without dots, which the tests pin.
 */
export function isProbe(pathname: string): boolean {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch { /* keep raw */ }
  const segs = p.split("/").filter(Boolean);
  if (segs.length === 0) return false;
  if (segs[0] === ".well-known") return false;
  if (segs[0] === "api") {
    return segs.length < 2 || !(KNOWN_API_ROUTES as readonly string[]).includes(segs[1]);
  }
  // A dot-segment (`/.env`, `/.git/config`, `/static../.env`) is never ours.
  if (segs.some((s) => s.startsWith(".") || s.endsWith("..") || PROBE_SEGMENT.test(s))) return true;
  return PROBE_EXTENSION.test(segs[segs.length - 1]);
}

/** The answer to a probe: tiny, cacheable, no Next. */
export function probeResponse(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

/**
 * The edge TTL for one response. The entry used to stamp EDGE_TTL_SECONDS on
 * everything, which silently overrode the middleware's longer window for the
 * stats pages (2026-09-29: /statistics came back `s-maxage=300`, not 21600).
 * Now the page's own `s-maxage` wins when it asks for longer — never shorter
 * than the default, and never more than a day.
 */
export function edgeTtl(res: Response): number {
  if (res.status === 404) return NOT_FOUND_EDGE_TTL;
  const m = /s-maxage=(\d+)/i.exec(res.headers.get("cache-control") ?? "");
  const asked = m ? parseInt(m[1], 10) : 0;
  return Math.min(Math.max(asked, EDGE_TTL_SECONDS), 86400);
}

/**
 * Stier der ALDRIG må caches.
 *
 * `/api/` er med som helhed, ikke stykvis: `/api/og` klarer sig fint på
 * Cloudflares standard-cache (den har gjort det i ugevis — det var det eneste
 * svar på hele sitet der overhovedet cachede), og en liste med undtagelser
 * skulle vedligeholdes hver gang der kom en rute til. Den fejl skal ikke kunne
 * laves i tavshed.
 */
function alwaysDynamic(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/");
}

/**
 * Må dette svar gemmes?
 *
 * `Set-Cookie` er den klassiske måde at lække en session gennem en delt cache,
 * og Cache API'et gemmer den glad. I dag sætter kun `/api/admin/land` en cookie,
 * og den ligger allerede i `alwaysDynamic` — men tjekket hører hjemme HER, hvor
 * det også holder når en ny rute en dag får en cookie.
 */
export function isCacheable(res: Response): boolean {
  if (res.headers.has("set-cookie")) return false;
  // Next's not-found page always says `no-store`; the page is the same for
  // every reader, so that header is overridden here (see NOT_FOUND_EDGE_TTL).
  // Only reader paths get this far — /admin and /api bypass the cache.
  if (res.status === 404) return true;
  if (res.status !== 200) return false;
  const cc = res.headers.get("cache-control") ?? "";
  return !/no-store|private/i.test(cc);
}

/**
 * Skal anmodningen uden om cachen?
 *
 * RSC-headeren er den vigtige: Next serverer to forskellige ting på samme URL —
 * siden, og en `text/x-component`-nyttelast ved klient-navigation. Cachen har
 * én plads pr. URL, så uden det her kunne en prefetch lægge nyttelasten på
 * forsidens plads, og den næste læser ville få en datadump i stedet for et
 * website. Det er værre end de CPU-fejl vi er i gang med at fjerne.
 */
export function bypasses(req: Request): boolean {
  if (req.method !== "GET") return true;
  if (req.headers.has("rsc")) return true;
  return alwaysDynamic(new URL(req.url).pathname);
}
