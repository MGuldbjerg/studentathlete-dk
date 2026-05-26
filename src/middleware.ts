/**
 * Edge middleware: logger pageviews til D1 asynkront (efter response er sendt).
 * Kører på Cloudflare Workers — ingen latency-påvirkning via ctx.waitUntil().
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const SKIP_PREFIXES = ["/_next", "/api", "/admin", "/robots", "/sitemap", "/feed", "/favicon"];

/** Afgør sidetype og sport ud fra URL-sti. */
function classify(path: string): { pageType: string; sport: string | null } {
  if (path === "/") return { pageType: "home", sport: null };
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { pageType: "home", sport: null };

  if (parts[0] === "atleter") return { pageType: "athlete", sport: null };
  if (parts[0] === "skoler") return { pageType: "school", sport: null };

  // /[sport]/[slug] → artikel   /[sport] → sport-landingsside
  if (parts.length === 2) return { pageType: "article", sport: parts[0] };
  if (parts.length === 1) return { pageType: "sport", sport: parts[0] };

  return { pageType: "other", sport: null };
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Spring statiske filer og ikke-side-ruter over
  const skip =
    SKIP_PREFIXES.some((p) => path.startsWith(p)) ||
    /\.(ico|png|jpg|jpeg|svg|webp|css|js|woff|woff2|json|xml|txt|map)$/.test(path);

  if (!skip) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { env, ctx } = await getCloudflareContext({ async: true }) as any;
      const db = env?.DB;

      if (db) {
        const { pageType, sport } = classify(path);
        const ua = request.headers.get("user-agent") ?? "";
        const device = /Mobile|Android|iPhone/.test(ua)
          ? "mobile"
          : /iPad|Tablet/.test(ua)
            ? "tablet"
            : "desktop";

        // Asynkront — blokerer IKKE response-levering
        ctx.waitUntil(
          db
            .prepare(
              `INSERT INTO pageviews (path, referrer, country, device_type, page_type, sport)
               VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(
              path,
              request.headers.get("referer") ?? null,
              request.headers.get("cf-ipcountry") ?? null,
              device,
              pageType,
              sport
            )
            .run()
        );
      }
    } catch {
      // Fejl i analytics må aldrig påvirke sideleveringen
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
