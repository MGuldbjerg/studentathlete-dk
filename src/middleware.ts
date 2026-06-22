import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Kanonisk vært + skema. Eliminerer duplikat-sider i Google Search Console
 * (http:// + www. udgaver) ved at 301-redirecte ALT til https://studentathlete.dk.
 * Selve canonical-taggene peger samme sted (se generateMetadata), men en hård
 * 301 fjerner duplikaterne ved kilden i stedet for kun at signalere dem.
 */
const CANONICAL_HOST = "studentathlete.dk";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();

  // Lokal udvikling (next dev / wrangler dev) røres ikke.
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return NextResponse.next();
  }

  // Cloudflare sætter x-forwarded-proto; fald tilbage til URL-skemaet.
  const proto =
    req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");

  const wrongHost = host !== CANONICAL_HOST; // fanger www. og *.workers.dev
  const wrongProto = proto !== "https";

  if (wrongHost || wrongProto) {
    const target = new URL(
      req.nextUrl.pathname + req.nextUrl.search,
      `https://${CANONICAL_HOST}`,
    );
    return NextResponse.redirect(target, 301);
  }

  return NextResponse.next();
}

// Kør ikke på API-ruter (track-beacon/OG bruger allerede https samme-origin),
// Next-interne assets, sitemap/robots/feed eller statiske filer med endelse.
export const config = {
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
