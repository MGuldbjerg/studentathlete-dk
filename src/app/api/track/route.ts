import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isbot } from "isbot";
import { getDB, getEnv } from "@/lib/db";
import { classify, deviceFromUA, hashVisitor, isClickKind } from "@/lib/analytics";

const SITE_HOST = "studentathlete.dk";
const NO_CONTENT = new NextResponse(null, { status: 204 });

/** Tom 204 — vi lækker aldrig om en hændelse blev gemt. */
function ack() {
  return NO_CONTENT;
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";

    // 1) Bots der eksekverer JS og bevarer bot-UA — frasortér.
    if (isbot(ua)) return ack();

    // 2) Same-origin-værn: afvis hvis Origin findes og ikke matcher os.
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        const h = new URL(origin).hostname;
        const ok = h === SITE_HOST || h.endsWith(`.${SITE_HOST}`) || h === "localhost";
        if (!ok) return ack();
      } catch {
        return ack();
      }
    }

    const body = (await req.json().catch(() => null)) as {
      type?: string;
      path?: string;
      referrer?: string;
      clickKind?: string;
      clickTarget?: string;
    } | null;
    if (!body || typeof body.path !== "string") return ack();

    const path = body.path.slice(0, 512);
    if (path.startsWith("/admin") || path.startsWith("/api")) return ack();

    const type = body.type;
    if (type !== "pageview" && type !== "click") return ack();
    if (type === "click" && !isClickKind(body.clickKind)) return ack();

    const db = await getDB();
    if (!db) return ack();

    // Server udleder selv sidetype/sport (stol ikke på klienten).
    const { pageType, sport } = classify(path);
    const country = req.headers.get("cf-ipcountry");
    const device = deviceFromUA(ua);
    const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";

    const env = await getEnv();

    // Intern trafik: ekskludér konfigurerede IP'er (fx ejerens eget netværk).
    // Sat som Cloudflare-secret ANALYTICS_EXCLUDE_IPS (kommasepareret) — ikke i repoet.
    const excludeRaw = (env.ANALYTICS_EXCLUDE_IPS as string | undefined) ?? "";
    if (excludeRaw) {
      const excluded = excludeRaw.split(",").map((s) => s.trim()).filter(Boolean);
      if (excluded.includes(ip)) return ack();
    }

    const salt = (env.ANALYTICS_SALT as string | undefined) ?? "studentathlete-dev-salt";
    const visitorHash = await hashVisitor(ip, ua, salt);

    // Ekstern referrer-host (kun pageviews; intern/tom referrer ignoreres).
    let referrer: string | null = null;
    if (type === "pageview" && body.referrer) {
      try {
        const h = new URL(body.referrer).hostname;
        if (h && h !== SITE_HOST && !h.endsWith(`.${SITE_HOST}`)) referrer = h.slice(0, 255);
      } catch {
        /* ignorér ugyldig referrer */
      }
    }

    const clickKind = type === "click" ? body.clickKind! : null;
    const clickTarget =
      type === "click" && typeof body.clickTarget === "string"
        ? body.clickTarget.slice(0, 300)
        : null;

    await db
      .prepare(
        `INSERT INTO events
           (event_type, path, page_type, sport, referrer, country, device_type, visitor_hash, click_kind, click_target)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(type, path, pageType, sport, referrer, country, device, visitorHash, clickKind, clickTarget)
      .run();

    return ack();
  } catch {
    // Analytics må aldrig fejle synligt.
    return ack();
  }
}
