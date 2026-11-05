/**
 * Ingest for the first-party analytics beacon (`POST /api/track`).
 *
 * Kept free of Next imports so the Worker entry (`workers/entry.ts`) can answer
 * the beacon itself. Through Next, every beacon booted the whole app router for
 * one INSERT: ~180 ms CPU per call, measured 2026-11-04. The Next route
 * (`src/app/api/track/route.ts`) calls the same function, so local dev and the
 * Worker behave alike.
 *
 * Privacy: the raw IP is never stored — only a daily-salted SHA-256 hash.
 * Never throws: analytics must not fail visibly.
 */
import { isbot } from "isbot";
import { classify, deviceFromUA, hashVisitor, isClickKind, isDatacenterAsn, normalizeSource } from "./analytics";
import { isKnownHost, siteFromHost } from "./site";

/** The slice of a D1 binding used here. */
interface D1Like {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

export interface TrackContext {
  db: D1Like | null;
  env: Record<string, unknown>;
  /** Cloudflare's ASN for the caller, when known. */
  asn?: number;
}

export async function ingestTrack(req: Request, ctx: TrackContext): Promise<void> {
  try {
    const ua = req.headers.get("user-agent") ?? "";

    // 1) Bots that run JS and keep a bot UA.
    if (isbot(ua)) return;

    // 1b) Bots that run JS with a normal browser UA, recognised by their network
    // (Meta's link checkers, cloud servers). Unknown network → keep the visit.
    if (isDatacenterAsn(ctx.asn)) return;

    // 2) Same-origin guard: refuse when Origin is set and is not us.
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        const h = new URL(origin).hostname;
        if (!(isKnownHost(h) || h === "localhost")) return;
      } catch {
        return;
      }
    }

    const body = (await req.json().catch(() => null)) as {
      type?: string;
      path?: string;
      referrer?: string;
      clickKind?: string;
      clickTarget?: string;
      source?: string;
    } | null;
    if (!body || typeof body.path !== "string") return;

    const path = body.path.slice(0, 512);
    if (path.startsWith("/admin") || path.startsWith("/api")) return;

    const type = body.type;
    if (type !== "pageview" && type !== "click") return;
    if (type === "click" && !isClickKind(body.clickKind)) return;

    const db = ctx.db;
    if (!db) return;

    // The site the call came FROM decides language and site code: the sport
    // slug in the path is that site's, not the default site's.
    const site = siteFromHost(req.headers.get("host") ?? new URL(req.url).host);
    const { pageType, sport } = classify(path, site.language);
    // `country` is the VISITOR's country, not the site's (migration 061).
    const country = req.headers.get("cf-ipcountry");
    const device = deviceFromUA(ua);
    const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";

    // Internal traffic: excluded IPs (Cloudflare secret ANALYTICS_EXCLUDE_IPS, comma-separated).
    const excludeRaw = (ctx.env.ANALYTICS_EXCLUDE_IPS as string | undefined) ?? "";
    if (excludeRaw && excludeRaw.split(",").map((s) => s.trim()).filter(Boolean).includes(ip)) return;

    const salt = (ctx.env.ANALYTICS_SALT as string | undefined) ?? "studentathlete-dev-salt";
    const visitorHash = await hashVisitor(ip, ua, salt);

    // External referrer host (pageviews only; own hosts are not a referral).
    let referrer: string | null = null;
    if (type === "pageview" && body.referrer) {
      try {
        const h = new URL(body.referrer).hostname;
        if (h && !isKnownHost(h)) referrer = h.slice(0, 255);
      } catch {
        /* invalid referrer */
      }
    }

    const clickKind = type === "click" ? body.clickKind! : null;
    const clickTarget =
      type === "click" && typeof body.clickTarget === "string" ? body.clickTarget.slice(0, 300) : null;

    // Traffic source (?kilde=/utm_source): landing pageview only, sanitised channel name.
    const source = type === "pageview" ? normalizeSource(body.source) : null;

    await db
      .prepare(
        `INSERT INTO events
           (event_type, path, page_type, sport, referrer, country, device_type, visitor_hash, click_kind, click_target, source, site)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(type, path, pageType, sport, referrer, country, device, visitorHash, clickKind, clickTarget, source, site.code)
      .run();
  } catch {
    // Analytics must never fail visibly.
  }
}

/** Empty 204 — never reveal whether an event was stored. */
export function trackAck(): Response {
  return new Response(null, { status: 204 });
}
