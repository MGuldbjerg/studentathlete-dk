/**
 * Google Search Console for BEGGE sites — tal, ikke et dashboard.
 * ===========================================================================
 *
 * Formålet er at kunne sammenligne .dk og .co.uk i samme skærmbillede: hvilke
 * søgninger de faktisk findes på, hvilke sider der trækker, og om sitemappet er
 * blevet læst. Search Console kan det samme i browseren — men ikke for to
 * properties side om side, og ikke i en ugentlig kørsel.
 *
 * ADGANG (service-konto, ingen browser-login):
 *   1. Google Cloud Console → aktivér «Google Search Console API».
 *   2. Opret en service-konto → opret en JSON-nøgle → hent den.
 *   3. Search Console → property → Indstillinger → Brugere og tilladelser →
 *      tilføj service-kontoens e-mail. «Begrænset» rækker til at LÆSE;
 *      «Fuld» kræves for at indsende sitemap (--submit-sitemap).
 *   4. `export GOOGLE_SEARCH_CONSOLE_KEY=~/.config/gcloud/sa-searchconsole.json`
 *      (eller GOOGLE_SEARCH_CONSOLE_KEY_JSON med selve JSON'en — til Actions).
 *
 * En service-konto kan IKKE verificere en property. Domænet skal være
 * verificeret i forvejen (DNS-TXT i Cloudflare er nemmest, da zonen ligger der).
 *
 * Kør:
 *   npx tsx pipeline/report/search-console.ts                    # begge sites, 28 dage
 *   npx tsx pipeline/report/search-console.ts --site=uk --days=7
 *   npx tsx pipeline/report/search-console.ts --dimension=page --limit=25
 *   npx tsx pipeline/report/search-console.ts --sitemaps         # er sitemappet læst?
 *   npx tsx pipeline/report/search-console.ts --submit-sitemap   # kræver «Fuld»
 *   npx tsx pipeline/report/search-console.ts --inspect https://…  # indekseringsstatus
 *   npx tsx pipeline/report/search-console.ts --json             # maskinlæsbart
 *
 * $0: API'et er gratis. Ingen nye afhængigheder — `jose` ligger i forvejen.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { SignJWT, importPKCS8 } from "jose";
import { COUNTRIES, countryProfile } from "../../src/lib/countries";

const API = "https://searchconsole.googleapis.com/webmasters/v3";
const INSPECT_API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const SCOPE = "https://www.googleapis.com/auth/webmasters";

// ── Nøgle + token ───────────────────────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

export function readKey(): ServiceAccountKey {
  const inline = process.env.GOOGLE_SEARCH_CONSOLE_KEY_JSON;
  const path = process.env.GOOGLE_SEARCH_CONSOLE_KEY;
  const raw = inline ?? (path ? readFileSync(path.replace(/^~/, homedir()), "utf-8") : null);
  if (!raw) {
    throw new Error(
      "Mangler GOOGLE_SEARCH_CONSOLE_KEY (sti til service-konto-JSON) eller " +
        "GOOGLE_SEARCH_CONSOLE_KEY_JSON (selve nøglen). Se filhovedet for opsætning.",
    );
  }
  const key = JSON.parse(raw) as Partial<ServiceAccountKey>;
  if (!key.client_email || !key.private_key) {
    throw new Error("Nøglefilen mangler client_email eller private_key — er det en service-konto-nøgle?");
  }
  return { client_email: key.client_email, private_key: key.private_key };
}

/**
 * Service-konto → access token (OAuth 2.0 JWT-bearer flow).
 *
 * Bevidst uden `googleapis`-pakken: den trækker et halvt SDK ind for ét kald,
 * og signeringen er tyve linjer med `jose`, som allerede er en afhængighed.
 */
export async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(key.private_key.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(key.client_email)
    .setSubject(key.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token-udveksling fejlede (${res.status}): ${await res.text()}`);
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

// ── Property-navne ──────────────────────────────────────────────────────────

/**
 * Search Console kender to slags properties for samme domæne, og navnet SKAL
 * matche præcis den, der er oprettet:
 *
 *   sc-domain:student-athlete.co.uk      (domæne-property — dækker alle værter)
 *   https://student-athlete.co.uk/       (URL-præfiks — kun denne vært)
 *
 * Vi gætter ikke: `listSites()` fortæller hvad kontoen faktisk har adgang til,
 * og vi vælger den der matcher værten. Rækkefølgen her er kun fallback, når
 * listen ikke kan hentes.
 */
export function propertyCandidates(host: string): string[] {
  return [`sc-domain:${host}`, `https://${host}/`, `https://www.${host}/`];
}

/** Hører property-navnet til denne vært? Bruges til at vælge fra listen. */
export function propertyMatchesHost(property: string, host: string): boolean {
  if (property.startsWith("sc-domain:")) return property.slice("sc-domain:".length) === host;
  try {
    return new URL(property).hostname.replace(/^www\./, "") === host;
  } catch {
    return false;
  }
}

async function api<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    // 403 her betyder næsten altid at service-kontoen ikke er tilføjet som
    // bruger på propertyen — ikke at nøglen er forkert.
    throw new Error(`${res.status} ${url}\n${body}`);
  }
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

export async function listSites(token: string): Promise<string[]> {
  const data = await api<{ siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }>(
    token,
    `${API}/sites`,
  );
  return (data.siteEntry ?? []).map((s) => s.siteUrl);
}

// ── Datoer ──────────────────────────────────────────────────────────────────

/**
 * Search Console-data halter 2-3 dage. Vinduet slutter derfor i går og ikke i
 * dag — ellers ser hver kørsel ud som om trafikken faldt.
 */
export function dateRange(days: number, today = new Date()): { start: string; end: string } {
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

// ── Search Analytics ────────────────────────────────────────────────────────

export interface Row {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function searchAnalytics(
  token: string,
  property: string,
  opts: { start: string; end: string; dimension: string; limit: number },
): Promise<Row[]> {
  const data = await api<{ rows?: Row[] }>(
    token,
    `${API}/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      body: JSON.stringify({
        startDate: opts.start,
        endDate: opts.end,
        dimensions: [opts.dimension],
        rowLimit: opts.limit,
        // Vi vil have SØGERESULTATER, ikke Discover/News — ellers blandes
        // to helt forskellige trafikkilder i samme tal.
        type: "web",
      }),
    },
  );
  return data.rows ?? [];
}

/** Totalerne for hele vinduet (uden dimension) — én række, eller ingen. */
async function totals(token: string, property: string, start: string, end: string): Promise<Row | null> {
  const data = await api<{ rows?: Row[] }>(
    token,
    `${API}/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    { method: "POST", body: JSON.stringify({ startDate: start, endDate: end, type: "web" }) },
  );
  return data.rows?.[0] ?? null;
}

// ── Sitemaps ────────────────────────────────────────────────────────────────

interface SitemapEntry {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  warnings?: string;
  errors?: string;
  contents?: Array<{ type: string; submitted: string; indexed?: string }>;
}

async function sitemaps(token: string, property: string): Promise<SitemapEntry[]> {
  const data = await api<{ sitemap?: SitemapEntry[] }>(
    token,
    `${API}/sites/${encodeURIComponent(property)}/sitemaps`,
  );
  return data.sitemap ?? [];
}

async function submitSitemap(token: string, property: string, feedUrl: string): Promise<void> {
  await api<void>(
    token,
    `${API}/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(feedUrl)}`,
    { method: "PUT" },
  );
}

// ── URL-inspektion ──────────────────────────────────────────────────────────

interface InspectionResult {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      lastCrawlTime?: string;
      googleCanonical?: string;
      userCanonical?: string;
      robotsTxtState?: string;
    };
    mobileUsabilityResult?: { verdict?: string };
  };
}

async function inspect(token: string, property: string, url: string): Promise<InspectionResult> {
  return api<InspectionResult>(token, INSPECT_API, {
    method: "POST",
    body: JSON.stringify({ inspectionUrl: url, siteUrl: property }),
  });
}

// ── Formatering ─────────────────────────────────────────────────────────────

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatRows(rows: Row[], label: string): string[] {
  if (rows.length === 0) return [`  (ingen ${label} i vinduet endnu)`];
  const width = Math.min(60, Math.max(...rows.map((r) => r.keys[0].length)));
  const out = [`  ${"".padEnd(width)}  klik   visn.    CTR   pos.`];
  for (const r of rows) {
    const key = r.keys[0].length > width ? `${r.keys[0].slice(0, width - 1)}…` : r.keys[0].padEnd(width);
    out.push(
      `  ${key}  ${String(r.clicks).padStart(4)}  ${String(r.impressions).padStart(6)}  ` +
        `${pct(r.ctr).padStart(6)}  ${r.position.toFixed(1).padStart(5)}`,
    );
  }
  return out;
}

// ── Kørsel ──────────────────────────────────────────────────────────────────

interface Args {
  sites: string[];
  days: number;
  dimension: string;
  limit: number;
  showSitemaps: boolean;
  submit: boolean;
  inspectUrl: string | null;
  json: boolean;
}

export function parseArgs(argv: string[]): Args {
  const get = (name: string): string | null => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const site = (get("site") ?? "all").toUpperCase();
  const known = Object.keys(COUNTRIES);
  return {
    sites: site === "ALL" ? known : site.split(",").filter((c) => known.includes(c)),
    days: Number.parseInt(get("days") ?? "28", 10) || 28,
    dimension: get("dimension") ?? "query",
    limit: Number.parseInt(get("limit") ?? "10", 10) || 10,
    showSitemaps: argv.includes("--sitemaps"),
    submit: argv.includes("--submit-sitemap"),
    inspectUrl: get("inspect") ?? (argv.includes("--inspect") ? argv[argv.indexOf("--inspect") + 1] ?? null : null),
    json: argv.includes("--json"),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const token = await getAccessToken(readKey());

  let available: string[] = [];
  try {
    available = await listSites(token);
  } catch (err) {
    console.error(`! Kunne ikke hente property-listen: ${err instanceof Error ? err.message : err}`);
  }

  const { start, end } = dateRange(args.days);
  const report: Record<string, unknown> = { window: { start, end }, sites: {} };

  for (const code of args.sites) {
    const profile = countryProfile(code);
    const host = profile.host;
    const property =
      available.find((p) => propertyMatchesHost(p, host)) ?? propertyCandidates(host)[0];
    const known = available.includes(property);

    if (!args.json) {
      console.log(`\n══ ${profile.brand} — ${property}`);
      console.log(`   ${start} → ${end} (${args.days} dage; data halter 2-3 dage)`);
    }

    // Ingen adgang → sig HVAD der skal gøres. Google svarer 403 med en tom
    // property-liste både når kontoen mangler som bruger, og når propertyen slet
    // ikke findes; forskellen kan vi ikke se, men handlingen er den samme.
    if (!known) {
      const msg =
        `Service-kontoen har ikke adgang til ${property}.\n` +
        `     Search Console → propertyen → Indstillinger → Brugere og tilladelser →\n` +
        `     Tilføj bruger → ${(await readKeyEmail()) ?? "service-kontoens e-mail"}\n` +
        `     («Fuld» hvis den også skal indsende sitemap, ellers «Begrænset»).\n` +
        `     Kontoen ser i dag: ${available.join(", ") || "(ingen properties)"}` +
        (available.length === 0
          ? `\n     Er domænet overhovedet verificeret? Det kan kun et menneske gøre.`
          : "");
      (report.sites as Record<string, unknown>)[code] = { property, hasAccess: false, error: msg };
      if (!args.json) console.log(`   ! ${msg}`);
      continue;
    }

    const siteReport: Record<string, unknown> = { property, hasAccess: known };

    try {
      const sum = await totals(token, property, start, end);
      siteReport.totals = sum;
      if (!args.json) {
        console.log(
          sum
            ? `   I alt: ${sum.clicks} klik · ${sum.impressions} visninger · CTR ${pct(sum.ctr)} · pos. ${sum.position.toFixed(1)}`
            : "   I alt: ingen data i vinduet endnu",
        );
      }

      const rows = await searchAnalytics(token, property, {
        start,
        end,
        dimension: args.dimension,
        limit: args.limit,
      });
      siteReport[args.dimension] = rows;
      if (!args.json) {
        console.log(`\n   Top ${args.limit} — ${args.dimension}:`);
        for (const line of formatRows(rows, args.dimension)) console.log(` ${line}`);
      }

      if (args.showSitemaps || args.submit) {
        const feedUrl = `https://${host}/sitemap.xml`;
        if (args.submit) {
          await submitSitemap(token, property, feedUrl);
          if (!args.json) console.log(`\n   Sitemap indsendt: ${feedUrl}`);
        }
        const maps = await sitemaps(token, property);
        siteReport.sitemaps = maps;
        if (!args.json) {
          console.log("\n   Sitemaps:");
          if (maps.length === 0) console.log("     (ingen indsendt — kør med --submit-sitemap)");
          for (const m of maps) {
            const web = m.contents?.find((c) => c.type === "web");
            console.log(
              `     ${m.path}\n       hentet ${m.lastDownloaded ?? "aldrig"} · ` +
                `${web ? `${web.submitted} indsendt${web.indexed ? `, ${web.indexed} indekseret` : ""}` : "ingen indhold endnu"}` +
                `${Number(m.errors ?? 0) > 0 ? ` · FEJL: ${m.errors}` : ""}` +
                `${Number(m.warnings ?? 0) > 0 ? ` · advarsler: ${m.warnings}` : ""}`,
            );
          }
        }
      }

      if (args.inspectUrl && args.inspectUrl.includes(host)) {
        const result = await inspect(token, property, args.inspectUrl);
        const idx = result.inspectionResult?.indexStatusResult;
        siteReport.inspection = idx;
        if (!args.json) {
          console.log(`\n   Inspektion af ${args.inspectUrl}:`);
          console.log(`     dom: ${idx?.verdict ?? "?"} · dækning: ${idx?.coverageState ?? "?"}`);
          console.log(`     sidst crawlet: ${idx?.lastCrawlTime ?? "aldrig"}`);
          if (idx?.googleCanonical && idx.googleCanonical !== idx.userCanonical) {
            console.log(`     ! Google vælger en ANDEN canonical: ${idx.googleCanonical}`);
          }
        }
      }
    } catch (err) {
      siteReport.error = err instanceof Error ? err.message : String(err);
      if (!args.json) console.error(`   ! ${siteReport.error}`);
    }

    (report.sites as Record<string, unknown>)[code] = siteReport;
  }

  if (args.json) console.log(JSON.stringify(report, null, 2));
}

/** Service-kontoens e-mail, kun til fejlbeskeden. */
async function readKeyEmail(): Promise<string | null> {
  try {
    return readKey().client_email;
  } catch {
    return null;
  }
}

if (process.argv[1] && /search-console\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
