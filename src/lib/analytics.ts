/**
 * Server-side analytics-hjælpere til first-party event-tracking.
 * Bruges af /api/track (ingest) og /admin/analytics (dashboard).
 *
 * Privatliv: vi gemmer aldrig rå IP — kun en daglig-saltet SHA-256-hash, så en
 * besøgende kan tælles som unik pr. dag uden at kunne identificeres eller
 * spores på tværs af dage.
 */
import { sportKeyFromSlug } from "./i18n";

// ── Sidetype-klassificering (flyttet fra middleware.ts) ──────────────────────

/** Faste sektioner. Alt andet med ét segment PRØVES som en sportsgren. */
const SECTIONS: Record<string, string> = {
  atleter: "athlete",
  skoler: "school",
  viden: "guide",
  artikler: "archive",
};

/**
 * Afgør sidetype og sport ud fra URL-sti.
 *
 * Tidligere blev ETHVERT ét-segments-navn regnet for en sportsgren, så /viden
 * og den nu nedlagte /ig blev logget som sportsgrene ved navn "viden" og "ig"
 * — og /viden/[slug] som en ARTIKEL i sporten "viden". Sport-nøglen slås derfor
 * nu op i sprogpakkens slug-tabel (/fodbold → soccer), og ukendte navne bliver
 * "other" i stedet for at opfinde en sportsgren.
 *
 * NB: gamle rækker beholder deres oprindelige værdier — tallene er først
 * sammenlignelige fremadrettet.
 */
export function classify(path: string): { pageType: string; sport: string | null } {
  if (path === "/") return { pageType: "home", sport: null };
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { pageType: "home", sport: null };

  const section = SECTIONS[parts[0]];
  if (section) return { pageType: section, sport: null };

  // Sport-slugs er læservendte (/fodbold), nøglen i basen er kanonisk (soccer).
  const sport = sportKeyFromSlug(parts[0]);

  // /[sport]/[slug] → artikel   /[sport] → sport-landingsside
  if (parts.length === 2 && sport) return { pageType: "article", sport };
  if (parts.length === 1 && sport) return { pageType: "sport", sport };

  return { pageType: "other", sport: null };
}

/**
 * Saniteret trafikkilde fra `?kilde=` (eller `utm_source`). Vi gemmer et
 * kanalnavn, ikke fri tekst: små bogstaver, kun [a-z0-9_-], maks 40 tegn.
 * Returnerer null når der intet brugbart er.
 */
export function normalizeSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return clean.length > 0 ? clean : null;
}

/** Udled enhedstype fra User-Agent. */
export function deviceFromUA(ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet/.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone/.test(ua)) return "mobile";
  return "desktop";
}

/** Tilladte klik-typer — alt andet afvises i ingest. */
export const CLICK_KINDS = ["bio_out", "internal", "search", "ad", "outbound"] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];

export function isClickKind(v: unknown): v is ClickKind {
  return typeof v === "string" && (CLICK_KINDS as readonly string[]).includes(v);
}

/**
 * Daglig-saltet besøgende-hash. Salt + UTC-dato roterer hver dag, så den samme
 * person får en ny hash dagen efter (privatlivsdesign à la Plausible/Umami).
 */
export async function hashVisitor(ip: string, ua: string, salt: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const data = new TextEncoder().encode(`${salt}:${day}:${ip}:${ua}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Dashboard-queries ────────────────────────────────────────────────────────
// Tynde, typede wrappers så admin-siden forbliver præsentationel. Fejl sluges
// (returnér tom/0) så et manglende skema aldrig vælter dashboardet.

type Row = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rows(db: any, sql: string, params: (string | number)[]): Promise<Row[]> {
  try {
    const r = await db.prepare(sql).bind(...params).all();
    return (r.results ?? []) as Row[];
  } catch {
    return [];
  }
}

export interface AnalyticsData {
  totalViews: number;
  activeDays: number;
  uniqueVisitors: number;
  topPages: Row[];
  byType: Row[];
  bySport: Row[];
  byDevice: Row[];
  byCountry: Row[];
  bySource: Row[];
  clicksByKind: Row[];
  topClickTargets: Row[];
}

const PV = "FROM events WHERE event_type='pageview' AND DATE(created_at) BETWEEN ? AND ?";

/** Hent alle dashboard-tal for et datointerval i ét kald. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAnalytics(db: any, from: string, to: string): Promise<AnalyticsData> {
  const p: [string, string] = [from, to];
  const [totals, uniques, topPages, byType, bySport, byDevice, byCountry, bySource, clicksByKind, topClickTargets] =
    await Promise.all([
      rows(db, `SELECT COUNT(*) AS total, COUNT(DISTINCT DATE(created_at)) AS days ${PV}`, p),
      // Daglig salt ⇒ unik pr. dag; et interval = summen af daglige unikke.
      rows(
        db,
        `SELECT SUM(daily) AS uniques FROM (
           SELECT COUNT(DISTINCT visitor_hash) AS daily
           ${PV} AND visitor_hash IS NOT NULL
           GROUP BY DATE(created_at)
         )`,
        p
      ),
      rows(db, `SELECT path, COUNT(*) AS views ${PV} GROUP BY path ORDER BY views DESC LIMIT 10`, p),
      rows(db, `SELECT page_type, COUNT(*) AS views ${PV} GROUP BY page_type ORDER BY views DESC`, p),
      rows(
        db,
        `SELECT sport, COUNT(*) AS views ${PV} AND sport IS NOT NULL GROUP BY sport ORDER BY views DESC`,
        p
      ),
      rows(db, `SELECT device_type, COUNT(*) AS views ${PV} GROUP BY device_type ORDER BY views DESC`, p),
      rows(
        db,
        `SELECT COALESCE(country, 'Ukendt') AS country, COUNT(*) AS views ${PV} GROUP BY country ORDER BY views DESC LIMIT 5`,
        p
      ),
      // Kun ankomster med en eksplicit ?kilde=/utm_source. Alt andet er
      // "direkte eller ukendt" og tælles ikke med her.
      rows(
        db,
        `SELECT source, COUNT(*) AS views ${PV} AND source IS NOT NULL
         GROUP BY source ORDER BY views DESC LIMIT 10`,
        p
      ),
      rows(
        db,
        `SELECT click_kind, COUNT(*) AS clicks
         FROM events WHERE event_type='click' AND DATE(created_at) BETWEEN ? AND ?
         GROUP BY click_kind ORDER BY clicks DESC`,
        p
      ),
      rows(
        db,
        `SELECT click_target, COUNT(*) AS clicks
         FROM events WHERE event_type='click' AND DATE(created_at) BETWEEN ? AND ? AND click_target IS NOT NULL
         GROUP BY click_target ORDER BY clicks DESC LIMIT 10`,
        p
      ),
    ]);

  return {
    totalViews: Number(totals[0]?.total ?? 0),
    activeDays: Math.max(Number(totals[0]?.days ?? 1), 1),
    uniqueVisitors: Number(uniques[0]?.uniques ?? 0),
    topPages,
    byType,
    bySport,
    byDevice,
    byCountry,
    bySource,
    clicksByKind,
    topClickTargets,
  };
}
