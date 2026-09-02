import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Kanonisk vært + skema. Eliminerer duplikat-sider i Google Search Console
 * (http:// + www. udgaver) ved at 301-redirecte til sitets egen kanoniske vært.
 * Selve canonical-taggene peger samme sted (se generateMetadata), men en hård
 * 301 fjerner duplikaterne ved kilden i stedet for kun at signalere dem.
 *
 * Værten er IKKE en konstant her længere: den slås op i landeregistret, så
 * www.example.de sendes til example.de — ikke til det danske site. Ukendte
 * værter (workers.dev, previews) falder tilbage til standardsitet som før.
 */
import { siteFromHost } from "./lib/site";
import { COUNTRIES, DEFAULT_COUNTRY, countryProfile } from "./lib/countries";
import { routeKeyFromSlug, routeSlug, DEFAULT_LANGUAGE } from "./lib/i18n";

/** Cookien admin-landevælgeren sætter, og headeren serverkoden læser. */
const ADMIN_COUNTRY_COOKIE = "sa_country";
const COUNTRY_HEADER = "x-sa-country";


/**
 * Sektionsstien tilhører SITET, mapperne i app-routeren er danske.
 *
 * To ting sker her:
 *   1. Sitets egen sti skrives om til mappenavnet: `/athletes/x` → `/atleter/x`
 *      på .co.uk. Læseren og Google ser kun den engelske adresse.
 *   2. Et ANDET sprogs sti sendes videre med 308: `/atleter/x` → `/athletes/x`.
 *      Det er de adresser vi selv linkede til indtil 21. august 2026.
 *
 * På .dk er sitets sti og mappenavnet det samme, så der sker ingenting —
 * bortset fra at `/athletes` sendes hjem til `/atleter`.
 */
function localizedRoute(req: NextRequest, lang: string): NextResponse | null {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const key = routeKeyFromSlug(segments[0]);
  if (!key) return null;

  const own = routeSlug(key, lang);
  const physical = routeSlug(key, DEFAULT_LANGUAGE); // app-routerens mappenavn

  if (segments[0] !== own) {
    const url = req.nextUrl.clone();
    url.pathname = "/" + [own, ...segments.slice(1)].join("/");
    return NextResponse.redirect(url, 308);
  }

  if (own !== physical) {
    const url = req.nextUrl.clone();
    url.pathname = "/" + [physical, ...segments.slice(1)].join("/");
    return NextResponse.rewrite(url);
  }
  return null;
}

/**
 * Spærren mod Workers Cache' TO TIMERS standard (se wrangler.toml). Uden en
 * `Cache-Control`-header cacher den ethvert 200-svar i to timer — også en
 * admin-side og en artikel, der lige er rettet. `pages` og `site_content` har
 * ingen kladdetilstand, så en rettelse ville gå live og derefter kunne
 * forsvinde igen bag et to timer gammelt svar.
 *
 * To forskellige svar, fordi de to slags sider skal beskyttes mod hver sit:
 *
 *   `private`   læsersiderne. Forbyder DELTE caches — Cloudflares kant — at
 *               gemme svaret, men lader læserens egen browser beholde det.
 *               `no-store` her ville også tage browserens kopi, så et klik på
 *               «tilbage» hentede siden forfra. Det er en forringelse for
 *               læseren uden nogen gevinst; kanten er den vi skal holde ude.
 *
 *   `no-store`  `/admin` og `/api/admin`. Her ER browserens kopi et problem:
 *               den kan overleve et log-ud og vise en anden brugers arbejde
 *               fra historikken.
 *
 * Omdirigeringer røres ikke: en 301 fra www til apex er den samme i morgen,
 * og de to timers standard er fin for dem.
 */
function guardCache(req: NextRequest, res: NextResponse): NextResponse {
  if (res.status >= 300 && res.status < 400) return res;
  res.headers.set(
    "Cache-Control",
    isAdminPath(req.nextUrl.pathname) ? "no-store" : "private",
  );
  return res;
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

/**
 * Admin arbejder på ÉT lands indhold ad gangen, valgt i landevælgeren.
 *
 * Headeren sættes ubetinget på admin-stier — også når der ikke er valgt noget
 * (så falder den tilbage til værtens land). Dermed kan en klient ikke smugle
 * sin egen `x-sa-country` ind: på admin-stier overskriver vi den altid, og
 * alle andre steder læser serverkoden aldrig andet end værten.
 */
function adminCountry(req: NextRequest, host: string): string {
  const chosen = req.cookies.get(ADMIN_COUNTRY_COOKIE)?.value?.toUpperCase();
  if (chosen && COUNTRIES[chosen]) return chosen;
  return siteFromHost(host).code;
}

/**
 * Nedlagte atlet-slugs (navneskift hos skolen, eller to rækker flettet til én)
 * skal svare 301 — ikke 200.
 *
 * Opslaget hører hjemme HER og ikke i siden: roden har en loading.tsx, så
 * enhver side-render streamer skallen med status 200 med det samme. Et
 * redirect() i selve siden når derfor aldrig at sætte statuskoden — browseren
 * følger det klientside, men en crawler ser en 200 uden indhold (soft 404) og
 * den gamle URL's værdi går tabt i stedet for at blive ført videre.
 * Middleware kører FØR renderingen og kan sende en ægte 301.
 *
 * Koster ét indekseret opslag i en meget lille tabel, kun på /atleter/-stier.
 * Fejler åbent: kan D1 ikke nås, fortsætter requesten som før.
 */
async function athleteAliasRedirect(req: NextRequest): Promise<URL | null> {
  const m = /^\/atleter\/([^/]+)\/?$/.exec(req.nextUrl.pathname);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]);
  try {
    const { env } = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (env as any).DB;
    if (!db) return null;
    const row = (await db
      .prepare(
        `SELECT a.slug FROM athlete_aliases al
         JOIN athletes a ON a.id = al.athlete_id
         WHERE al.slug = ?`,
      )
      .bind(slug)
      .first()) as { slug: string } | null;
    if (!row?.slug || row.slug === slug) return null;
    return new URL(`/atleter/${row.slug}`, req.nextUrl.origin);
  } catch {
    return null;
  }
}

/**
 * Nedlagte stier der skal føre et sted hen permanent. Samme begrundelse som
 * atlet-aliasserne ovenfor: et redirect() inde i siden når aldrig at sætte
 * statuskoden, fordi loading.tsx allerede har streamet en 200 — Next falder da
 * tilbage til et `<meta http-equiv="refresh">`, som crawlere behandler langt
 * svagere end en 301.
 *
 * `/ig` var Instagram-bio'ens egen landingsside; arkivet gør nu det samme,
 * responsivt og indekserbart. Kilden bevares som ?kilde=, så et gammelt
 * bio-link stadig kan tælles.
 */
const GONE_PATHS: Record<string, string> = {
  "/ig": "/artikler?kilde=ig",
};

export async function middleware(req: NextRequest) {
  const gone = GONE_PATHS[req.nextUrl.pathname.replace(/\/+$/, "") || "/"];
  if (gone) {
    return NextResponse.redirect(new URL(gone, req.nextUrl.origin), 301);
  }

  const host = (req.headers.get("host") ?? "").toLowerCase();
  const adminPath = isAdminPath(req.nextUrl.pathname);

  /** `NextResponse.next()` med landevalget vedhæftet på admin-stier. */
  const proceed = () => {
    if (!adminPath) return NextResponse.next();
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(COUNTRY_HEADER, adminCountry(req, host));
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  // Lokal udvikling (next dev / wrangler dev) røres ikke — bortset fra
  // landevalget, så admin kan testes uden Cloudflare foran.
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return proceed();
  }

  /**
   * Admin bor KUN på standardsitet.
   *
   * Cloudflare Access er bundet til ét værtsnavn, så /admin på et nyt
   * landedomæne ville stå uden login foran (app-laget afviste stadig, men
   * siden var der). Ét admin-domæne betyder også ét Access-app for al fremtid
   * — landet vælges i stedet inde i admin.
   */
  if (adminPath && siteFromHost(host).code !== DEFAULT_COUNTRY) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return new NextResponse("Not found", { status: 404 });
    }
    const adminHost = countryProfile(DEFAULT_COUNTRY).host;
    return NextResponse.redirect(
      new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${adminHost}`),
      302,
    );
  }

  // Cloudflare sætter x-forwarded-proto; fald tilbage til URL-skemaet.
  const proto =
    req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");

  // Kendt vært → dens eget site; ukendt (workers.dev, preview) → standardsitet.
  const canonicalHost = siteFromHost(host).host;
  const wrongHost = host !== canonicalHost; // fanger www. og *.workers.dev
  const wrongProto = proto !== "https";

  if (wrongHost || wrongProto) {
    const target = new URL(
      req.nextUrl.pathname + req.nextUrl.search,
      `https://${canonicalHost}`,
    );
    return NextResponse.redirect(target, 301);
  }

  const alias = await athleteAliasRedirect(req);
  if (alias) return NextResponse.redirect(alias, 301);

  // Sektionsstier på sitets eget sprog (se localizedRoute).
  const localized = localizedRoute(req, siteFromHost(host).language);
  if (localized) {
    if (siteFromHost(host).darkLaunch) {
      localized.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return guardCache(req, localized);
  }

  // Dark launch (se `darkLaunch` i landeprofilen): headeren gælder ALT hvad
  // sitet svarer med — også de sider der selv sætter `robots: index: true` i
  // deres metadata og derfor overskriver layoutets noindex.
  const res = proceed();
  if (siteFromHost(host).darkLaunch) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return guardCache(req, res);
}

// Kør ikke på API-ruter (track-beacon/OG bruger allerede https samme-origin),
// Next-interne assets, sitemap/robots/feed eller statiske filer med endelse.
// UNDTAGEN /api/admin: de ruter skal have landevalget med, og de må ikke
// kunne rammes fra et landedomæne.
export const config = {
  matcher: ["/((?!api/|_next/|.*\\..*).*)", "/api/admin/:path*"],
};
