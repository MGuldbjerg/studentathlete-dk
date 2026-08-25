/**
 * Scraper der henter rosters fra college-websites og finder danske atleter.
 * Bruger roster_checks-tabellen for inkrementel tracking.
 *
 * Kør med: npx tsx pipeline/scrape/scrape-rosters.ts [--division D1] [--limit 500] [--max-age-days 30]
 */

import { createD1Client } from "../lib/d1-client";
import type { D1Client } from "../lib/d1-client";
import { parseRoster } from "./parsers";
import { apiRosterUrl, parseApiRoster } from "./parsers/roster-api";
import { robotsAllows } from "../lib/robots";
import {
  renderPage,
  isBrowserRenderAvailable,
  BrowserRenderError,
} from "../lib/browser-render";
import { classifyHometown } from "../../src/lib/hometown";
import { activeCountries, countryProfile } from "../../src/lib/countries";
import { transferSentence } from "../../src/lib/i18n/profile-builders";
import { pipelineUserAgent } from "../../src/lib/site";
import { sportKeyFromSource } from "../../src/lib/sports";
import { generateSlug } from "../../src/lib/slug";
import { samePerson, rosterKey } from "../lib/athlete-identity";
import { genderFromTeamUrl } from "../../src/lib/gender";
import { sameInstitution } from "../../src/lib/school-name";
import { resolveClassYear, getAcademicYear } from "../lib/class-year";
import { cleanPosition, cleanRosterName } from "../../src/lib/roster-clean";
import { seasonFromDate } from "../../src/lib/athlete-events";
import type { School } from "../lib/types";

interface RosterCheckWithSchool {
  check_id: number;
  school_id: number;
  sport: string;
  roster_url: string | null;
  /** Skolens eget holdnavn ("womens-tennis"). Findes for alle inventar-rækker. */
  team_slug: string | null;
  /** 'sitemap' | 'api' | 'guess' | 'legacy' — hvor holdlisten kom fra. */
  inventory_source: string | null;
  /** Holdets id i skolens JSON-API (kun den nye Sidearm-platform). */
  api_sport_id: number | null;
  // School-felter
  name: string;
  slug: string;
  state: string | null;
  division: string;
  conference: string | null;
  website: string;
  platform_type: string | null;
}

// Ingen SPORT_MAP længere: roster_checks.sport ER den kanoniske nøgle
// (src/lib/sports.ts), og athletes.sport gemmer nu samme værdi. Tidligere
// oversatte vi til danske ord her — det gjorde databasen sprogafhængig.

const USER_AGENT = pipelineUserAgent();

/** PrestoSports bruger egne sport-koder i roster.aspx?path= */
const PRESTO_SPORT_CODES: Record<string, string[]> = {
  football: ["football"],
  basketball: ["mbball", "wbball"],
  baseball: ["baseball"],
  soccer: ["msoc", "wsoc"],
  "track-and-field": ["mtrack", "wtrack"],
  "swimming-and-diving": ["mswim", "wswim"],
  golf: ["mgolf", "wgolf"],
  tennis: ["mten", "wten"],
  rowing: ["rowing"],
  gymnastics: ["wgym"],
  "ice-hockey": ["mihockey", "wihockey"],
  volleyball: ["wvball"],
};

/**
 * Generér mulige roster-URLs for en skole/sport baseret på platform.
 * Returnerer flere kandidater i prioriteret rækkefølge.
 */
function getRosterUrls(website: string, sport: string, platformType: string | null): string[] {
  const urls: string[] = [];

  if (platformType === "prestosports") {
    const codes = PRESTO_SPORT_CODES[sport] ?? [sport];
    for (const code of codes) {
      urls.push(`${website}/roster.aspx?path=${code}`);
    }
  } else {
    // Sidearm og andre: prøv standard + mens/womens varianter
    urls.push(`${website}/sports/${sport}/roster`);
    urls.push(`${website}/sports/mens-${sport}/roster`);
    urls.push(`${website}/sports/womens-${sport}/roster`);
  }

  return urls;
}

/**
 * URL-kandidater for ÉT hold.
 *
 * Har sport-inventaret været forbi skolen (`inventory_source` = sitemap/api), er
 * `roster_url` skolens egen adresse på præcis det hold — så er der intet at gætte,
 * og vi sender ét request i stedet for tre. Kun `legacy`-rækker (fra før
 * inventaret) falder tilbage på det gamle gætteri, så en skole uden sitemap og
 * uden API stadig bliver scrapet som før.
 */
function rosterUrlsFor(check: RosterCheckWithSchool): string[] {
  // Vendt om med vilje: ALT der ikke er 'legacy' (eller uden kilde) kommer fra
  // inventaret og har skolens egen URL. Den første version listede kilderne
  // positivt ("sitemap" eller "api") og glemte "nav" — og så gættede scraperen
  // `/sports/mens-other/roster` for Santa Claras water polo-hold, som naturligvis
  // gav 404. En ny kilde må ikke kunne genindføre den fejl.
  const fromInventory =
    check.roster_url && check.inventory_source && check.inventory_source !== "legacy";
  if (fromInventory) return [check.roster_url as string];
  return getRosterUrls(check.website, check.sport, check.platform_type);
}

interface CliArgs {
  division: string | null;
  limit: number;
  maxAgeDays: number;
  render: boolean;
  renderBudget: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let division: string | null = null;
  let limit = 500;
  let maxAgeDays = 30;
  let render = true; // CF Browser Rendering fallback til JS-sider (slå fra med --no-render)
  let renderBudget = 60; // max render-kald per kørsel (beskytter gratis browser-tid ~10 min/dag)

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--division" && args[i + 1]) {
      division = args[i + 1];
      i++;
    } else if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!Number.isNaN(n)) limit = n;
      i++;
    } else if (args[i] === "--max-age-days" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!Number.isNaN(n)) maxAgeDays = n; // 0 = tving gen-tjek (var tidligere en bug: 0 → 30)
      i++;
    } else if (args[i] === "--no-render") {
      render = false;
    } else if (args[i] === "--render-budget" && args[i + 1]) {
      renderBudget = parseInt(args[i + 1], 10) || 60;
      i++;
    }
  }

  return { division, limit, maxAgeDays, render, renderBudget };
}

interface FetchResult {
  html: string | null;
  httpStatus: number;
  result: "ok" | "not_found" | "blocked" | "server_error" | "timeout" | "error";
  size: number;
}

/**
 * Resultater der betyder "spørg aldrig igen om denne URL". Alt ANDET er
 * forbigående og skal prøves igen ved næste kørsel.
 *
 * Hvorfor det er vigtigt: `fetchWithProbeLog` sprang tidligere enhver URL over,
 * hvis den ÉN gang havde fejlet — og hver ikke-ok status blev gemt som
 * 'not_found'. Ét 429 (skolen bad os sagtne) eller én timeout gjorde derfor
 * holdet permanent usynligt. Det er en oplagt kandidat til en pæn del af de
 * 6.361 'Fetch fejlede'-rækker, der stod i basen før i dag.
 */
const PERMANENT_FAILURES = new Set(["not_found", "robots_denied"]);

/** 429/403/5xx/timeout er forbigående — prøv igen, med luft imellem. */
function isTransient(result: FetchResult["result"]): boolean {
  return result === "blocked" || result === "server_error" || result === "timeout";
}

async function fetchOnce(url: string, timeoutMs: number): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    const text = response.ok ? await response.text() : null;
    let result: FetchResult["result"] = "ok";
    if (!response.ok) {
      if (response.status === 404 || response.status === 410) result = "not_found";
      else if (response.status === 429 || response.status === 403) result = "blocked";
      else if (response.status >= 500) result = "server_error";
      else result = "error";
    }
    return { html: text, httpStatus: response.status, result, size: text?.length ?? 0 };
  } catch {
    return { html: null, httpStatus: 0, result: "timeout", size: 0 };
  }
}

/**
 * Hent én roster-side. 15 s (ikke 5) fordi moderne Sidearm-sider er store —
 * Santa Claras cross country-roster er 858 KB — og ét forsøg mere ved
 * forbigående fejl, med 4 sekunders pause.
 */
async function fetchRosterPage(url: string): Promise<FetchResult> {
  const first = await fetchOnce(url, 15000);
  if (!isTransient(first.result)) return first;
  await new Promise((r) => setTimeout(r, 4000));
  const second = await fetchOnce(url, 20000);
  return second.result === "ok" ? second : first;
}

/** Log URL-forsøg til url_probes og skip allerede kendte fejl */
async function fetchWithProbeLog(
  db: D1Client,
  schoolId: number,
  url: string,
): Promise<string | null> {
  // Tjek om vi allerede har prøvet denne URL og den fejlede
  const existing = await db.query<{ result: string }>(
    "SELECT result FROM url_probes WHERE school_id = ? AND url = ? AND purpose = 'roster_scrape'",
    [schoolId, url],
  );
  if (existing.results.length > 0 && PERMANENT_FAILURES.has(existing.results[0].result)) {
    return null; // Findes ikke (404/410) eller forbudt af robots — spørg ikke igen
  }

  // robots.txt afgør om vi må hente. Politikken caches pr. vært, så det koster ét
  // request pr. skole — og det er den betingelse interesseafvejningen hviler på.
  if (!(await robotsAllows(url, USER_AGENT))) {
    try {
      await db.execute(
        `INSERT OR REPLACE INTO url_probes (school_id, url, purpose, http_status, result, response_size)
         VALUES (?, ?, 'roster_scrape', 0, 'robots_denied', 0)`,
        [schoolId, url],
      );
    } catch { /* log-fejl må ikke stoppe kørslen */ }
    return null;
  }

  const { html, httpStatus, result, size } = await fetchRosterPage(url);

  // Log forsøget
  try {
    await db.execute(
      `INSERT OR REPLACE INTO url_probes (school_id, url, purpose, http_status, result, response_size)
       VALUES (?, ?, 'roster_scrape', ?, ?, ?)`,
      [schoolId, url, httpStatus, result, size],
    );
  } catch {
    // Log-fejl skal ikke stoppe scrapingen
  }

  return html;
}

/** Opløs et rå href (relativt eller absolut) til absolut URL mod skolens website. */
function toAbsoluteUrl(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

interface ExistingAthlete {
  id: number;
  name: string;
  roster_name: string | null;
  slug: string;
  sport: string;
  hometown: string | null;
  university: string;
  bio_url: string | null;
  roster_key: string | null;
  name_locked: number | null;
}

/**
 * Find en eksisterende atlet der er SAMME person. Rækkefølgen er bevidst:
 *
 *  1. Skolens eget spiller-id fra bio_url'en (athlete-identity.rosterKey) — det
 *     eneste signal der overlever at skolen ÆNDRER navnet på atleten.
 *  2. samePerson() (navne-identitet + sport, hometown-vagt) — dækker rækker uden
 *     numerisk spiller-id og skoleskift, hvor id'et nødvendigvis er nyt.
 *
 * Returnerer null hvis personen ikke findes endnu. Sport-puljen er lille, så et
 * fuldt sport-scan er billigt.
 */
async function findExistingAthleteByIdentity(
  db: D1Client,
  name: string,
  sport: string,
  hometown: string | null,
  bioUrl: string | null,
): Promise<ExistingAthlete | null> {
  const r = await db.query<ExistingAthlete>(
    `SELECT id, name, roster_name, slug, sport, hometown, university, bio_url,
            roster_key, name_locked
     FROM athletes WHERE sport = ?`,
    [sport],
  );

  const key = rosterKey(bioUrl);
  if (key) {
    const byKey = r.results.find((row) => (row.roster_key ?? rosterKey(row.bio_url)) === key);
    if (byKey) return byKey;
  }

  const probe = { name, sport, hometown, bio_url: bioUrl };
  return r.results.find((row) => samePerson(probe, row)) ?? null;
}

async function main(): Promise<void> {
  const { division, limit, maxAgeDays, render, renderBudget } = parseArgs();
  const db = createD1Client();

  const renderEnabled = render && isBrowserRenderAvailable();
  let rendersUsed = 0;
  let renderQuotaExhausted = false;
  if (render && !isBrowserRenderAvailable()) {
    console.log(
      "  ℹ Browser Rendering ikke konfigureret (mangler CLOUDFLARE_API_TOKEN/ACCOUNT_ID) — kører uden render-fallback.",
    );
  } else if (renderEnabled) {
    console.log(`  Browser Rendering-fallback aktiv (budget: ${renderBudget} sider/kørsel).`);
  }

  // Registrér pipeline-kørsel
  await db.execute(
    `INSERT INTO pipeline_runs (run_type, status) VALUES ('roster_scrape', 'running')`,
  );
  const runResult = await db.query<{ id: number }>(
    "SELECT id FROM pipeline_runs ORDER BY id DESC LIMIT 1",
  );
  const runId = runResult.results[0]?.id;

  // Byg division-filter
  const divisionFilter = division ? `NCAA ${division}` : "%";

  console.log(
    `Henter roster-checks (division: ${division ?? "alle"}, limit: ${limit}, max-age: ${maxAgeDays} dage)...`,
  );

  // Når render er aktiv kan vi nu håndtere JS-renderede sider: medtag 'js_required'
  // (uanset alder — de er aldrig blevet parset) og prioritér dem først, da deres
  // roster-URL allerede er bekræftet 200 OK.
  const jsStatusFilter = renderEnabled ? "" : "AND rc.status != 'js_required'";
  const jsAgeBypass = renderEnabled ? "OR rc.status = 'js_required'" : "";
  const jsOrder = renderEnabled
    ? "CASE WHEN rc.status = 'js_required' THEN 0 ELSE 1 END,"
    : "";

  // Prioritér skoler der ALLEREDE har mindst én dansk atlet — de er klart mest
  // sandsynlige til at have flere (rekrutterings-netværk). Fokuserer de begrænsede
  // fetches/renders på de mest produktive skoler først.
  const result = await db.query<RosterCheckWithSchool>(
    `SELECT
       rc.id as check_id, rc.school_id, rc.sport, rc.roster_url,
       rc.team_slug, rc.inventory_source, rc.api_sport_id,
       s.name, s.slug, s.state, s.division, s.conference, s.website, s.platform_type
     FROM roster_checks rc
     JOIN schools s ON rc.school_id = s.id
     LEFT JOIN (
       SELECT university, COUNT(*) AS dane_count
       FROM athletes WHERE active = 1 GROUP BY university
     ) da ON da.university = s.name
     WHERE s.website IS NOT NULL
       AND s.division LIKE ?
       -- Det negative register: hold skolen ikke har, spørger vi aldrig om igen.
       -- Sport-inventaret sætter rækken tilbage til 'pending', hvis holdet dukker op.
       AND rc.sponsored = 1
       AND (rc.checked_at IS NULL
            OR datetime(rc.checked_at, '+' || ? || ' days') < datetime('now')
            ${jsAgeBypass})
       ${jsStatusFilter}
     ORDER BY ${jsOrder}
       CASE WHEN da.dane_count > 0 THEN 0 ELSE 1 END,
       rc.checked_at ASC NULLS FIRST
     LIMIT ?`,
    [divisionFilter, maxAgeDays, limit],
  );

  const checks = result.results;

  if (checks.length === 0) {
    console.log("Ingen roster-checks klar til scraping.");
    if (runId) {
      await db.execute(
        `UPDATE pipeline_runs SET status = 'completed', finished_at = datetime('now'),
         items_processed = 0, items_found = 0 WHERE id = ?`,
        [runId],
      );
    }
    return;
  }

  console.log(`Scraper ${checks.length} roster-sider...\n`);

  let totalFound = 0;
  let totalProcessed = 0;
  let totalErrors = 0;

  for (const check of checks) {
    try {
      let html: string | null = null;
      let usedUrl: string | null = null;
      /** Rækker fra JSON-API'et — sat FØR HTML-sporet, hvis holdet har et api-id. */
      let apiRoster: ReturnType<typeof parseApiRoster> = null;

      // ── Den nye Sidearm-platform ────────────────────────────────────────────
      // Rosteren findes ikke i HTML på disse skoler (siden hydreres i browseren),
      // så et HTML-forsøg ville altid give "Ingen roster-data" — det var hullet der
      // gjorde hver sportsgren på 42% af D1 usynlig. Ét JSON-request i stedet.
      if (check.api_sport_id != null) {
        const origin = new URL(check.website).origin;
        const apiUrl = apiRosterUrl(origin, check.api_sport_id);
        const body = await fetchWithProbeLog(db, check.school_id, apiUrl);
        if (body) {
          try {
            apiRoster = parseApiRoster(JSON.parse(body), origin);
          } catch {
            apiRoster = null;
          }
          if (apiRoster) usedUrl = check.roster_url ?? apiUrl;
        }
      }

      if (!apiRoster) {
        for (const url of rosterUrlsFor(check)) {
          html = await fetchWithProbeLog(db, check.school_id, url);
          if (html) {
            usedUrl = url;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (!html && !apiRoster) {
        await db.execute(
          `UPDATE roster_checks
           SET status = 'error', checked_at = datetime('now'), error_message = 'Fetch fejlede for alle URL-varianter'
           WHERE id = ?`,
          [check.check_id],
        );
        totalErrors++;
        totalProcessed++;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Gem den URL der virkede
      if (usedUrl && usedUrl !== check.roster_url) {
        await db.execute(
          "UPDATE roster_checks SET roster_url = ? WHERE id = ?",
          [usedUrl, check.check_id],
        );
      }

      // JSON-sporet er allerede parset; ellers plain HTML. Tom roster = muligvis
      // en JS-renderet side.
      let roster = apiRoster ? apiRoster.entries : parseRoster(html as string);
      let renderedUsed = false;

      // Fallback: render JS-tunge sider via CF Browser Rendering (budget-begrænset).
      if (
        !apiRoster &&
        roster.length === 0 &&
        renderEnabled &&
        !renderQuotaExhausted &&
        rendersUsed < renderBudget &&
        usedUrl
      ) {
        rendersUsed++;
        try {
          const rendered = await renderPage(usedUrl);
          if (rendered) {
            const renderedRoster = parseRoster(rendered);
            if (renderedRoster.length > 0) {
              html = rendered;
              roster = renderedRoster;
              renderedUsed = true;
              console.log(
                `  ⟳ ${check.name} / ${check.sport}: renderet (${renderedRoster.length} rækker)`,
              );
            }
          }
        } catch (err) {
          if (err instanceof BrowserRenderError && err.quotaExhausted) {
            renderQuotaExhausted = true;
            const why = err.status === 429
              ? "daglig browser-tid opbrugt (429)"
              : `adgang nægtet — tjek token-permission (${err.message})`;
            console.warn(`  ⚠ Browser Rendering stoppet for resten af kørslen: ${why}.`);
          } else {
            console.warn(
              `  ⚠ Render fejlede (${check.name}): ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      // Stadig ingen data og siden ligner JS → marker js_required (til render i en senere kørsel).
      if (
        !apiRoster &&
        roster.length === 0 &&
        (html as string).length < 1500 &&
        !(html as string).includes("<table") &&
        !(html as string).toLowerCase().includes("sidearm")
      ) {
        await db.execute(
          `UPDATE roster_checks
           SET status = 'js_required', checked_at = datetime('now'),
               error_message = ?
           WHERE id = ?`,
          [
            renderedUsed ? "Render gav ingen roster-data" : "JS-renderet side (kræver render)",
            check.check_id,
          ],
        );
        totalProcessed++;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // Nationalitet bliver DATA: klassificér mod de aktive landeprofiler og gem
      // koden på rækken, i stedet for at lade "rækken findes" betyde "dansk".
      const countries = activeCountries();
      const matchedAthletes = roster
        .map((entry) => ({ entry, country: classifyHometown(entry.hometown, countries) }))
        .filter((x): x is { entry: typeof x.entry; country: string } => x.country !== null);

      const academicYear = getAcademicYear();
      let athletesInCheck = 0;
      for (const { entry: rawEntry, country: homeCountry } of matchedAthletes) {
        // Navnet renses ÉT sted, før noget som helst sammenlignes eller skrives:
        // ellers gør et dobbelt mellemrum fra skolen atleten til "omdøbt" ved hver
        // kørsel (og dobbeltmellemrummet lander i det viste navn).
        const athlete = { ...rawEntry, name: cleanRosterName(rawEntry.name) ?? rawEntry.name };
        const slug = generateSlug(athlete.name);
        const sportKey = sportKeyFromSource(check.sport);
        const { classYear, expectedGraduation, yearEnrolled } =
          resolveClassYear(athlete.year, academicYear);
        const bioUrl = toAbsoluteUrl(athlete.bioUrl, check.website);
        // Køn: kilden selv, når den siger det (JSON-API'et gør), ellers holdets URL.
        // Rækkefølgen er vigtig — et felt slår et mønster.
        const gender =
          athlete.gender ?? genderFromTeamUrl(bioUrl, check.roster_url) ?? null;

        try {
          // Dedup/transfer: matcher denne atlet en eksisterende person (samme
          // identitet+sport)? Hvis ja — også ved navne-variant eller skoleskift —
          // opdatér DEN række (inkl. university) i stedet for at indsætte en ny slug.
          const existing = await findExistingAthleteByIdentity(
            db, athlete.name, sportKey, athlete.hometown, bioUrl,
          );

          if (existing) {
            const transferred = !sameInstitution(existing.university, check.name);

            // Skolen har ændret navnet (fx Filucca Daugaard → Filucca Andersen).
            // Vi følger rosteren — MEN aldrig oven på en manuel rettelse
            // (name_locked, fx "Malthe Bogebjerg" → "Malthe Bøgebjerg").
            const locked = existing.name_locked === 1;
            const renamed = !locked && existing.name !== athlete.name;
            const newSlug = renamed ? generateSlug(athlete.name) : existing.slug;
            const slugChanged = renamed && newSlug !== existing.slug;

            if (slugChanged) {
              // Gammel slug → alias, så publicerede/indekserede links overlever.
              await db.execute(
                `INSERT OR IGNORE INTO athlete_aliases (athlete_id, slug, name, reason)
                 VALUES (?, ?, ?, 'rename')`,
                [existing.id, existing.slug, existing.name],
              );
              // Skiftes navnet TILBAGE, må det genbrugte slug ikke også være alias.
              await db.execute("DELETE FROM athlete_aliases WHERE slug = ?", [newSlug]);
            }

            // hometown overskrives ALDRIG hvis allerede sat (bevarer det verificerede
            // danske signal); fyldes kun ud hvis det manglede.
            // roster_name = skolens stavemåde, altid opdateret: den er matchnøglen
            // ved næste scrape, også når `name` er rettet i hånden.
            await db.execute(
              `UPDATE athletes
               SET name = ?, slug = ?,
                   roster_name = ?, roster_key = COALESCE(?, roster_key),
                   home_country = COALESCE(home_country, ?),
                   university = ?, university_state = ?, division = ?,
                   class_year = ?, expected_graduation = ?,
                   year_enrolled = COALESCE(year_enrolled, ?),
                   hometown = COALESCE(hometown, ?),
                   bio_url = COALESCE(?, bio_url),
                   gender = COALESCE(gender, ?),
                   -- Transfers ER en ændring: skifter en atlet skole, skal den
                   -- nye forrige-skole-oplysning vinde over den gamle. Derfor
                   -- ikke COALESCE — men en tom værdi må ikke slette det vi har.
                   previous_school = COALESCE(?, previous_school),
                   active = 1, updated_at = datetime('now')
               WHERE id = ?`,
              [
                renamed ? athlete.name : existing.name, newSlug,
                athlete.name, rosterKey(bioUrl), homeCountry,
                check.name, check.state, check.division,
                classYear, expectedGraduation, yearEnrolled,
                athlete.hometown, bioUrl,
                gender,
                athlete.previousSchool ?? null,
                existing.id,
              ],
            );

            if (renamed) {
              // Bevidst IKKE et athlete_event: tidslinjen er offentlig på profilen,
              // og et navneskift kan være personligt (ægteskab, familieforhold).
              // athlete_aliases-rækken er sporet, og den er intern.
              console.log(
                `  ✎ Navneskift hos skolen: "${existing.name}" → "${athlete.name}"` +
                  (slugChanged ? ` (gammel URL /atleter/${existing.slug} → 301)` : ""),
              );
            } else if (locked && existing.name !== athlete.name) {
              console.log(
                `  🔒 "${existing.name}" beholdt (manuelt rettet; skolen skriver "${athlete.name}")`,
              );
            }
            if (transferred) {
              console.log(
                `  ⇄ ${existing.name}: ${existing.university} → ${check.name} (transfer)`,
              );
              // Skiftet gemmes som athlete_event (kind='transfer') så det kan
              // nævnes i profilteksten (basis-udkast + sommer-udvidelsens LLM-
              // kontekst) — ellers gik oplysningen tabt i console.log alene.
              // INSERT OR IGNORE: unik-indekset (athlete_id, award_name, season)
              // forhindrer dubletter, men skiftet detekteres kun ÉN gang (næste
              // scrape ser existing.university === check.name).
              await db.execute(
                `INSERT OR IGNORE INTO athlete_events
                 (athlete_id, occurred_on, season, kind, award_name, summary, significance, source_url, created_at)
                 VALUES (?, date('now'), ?, 'transfer', 'Transfer', ?, 'notable', ?, datetime('now'))`,
                [
                  existing.id,
                  seasonFromDate(null),
                  transferSentence(countryProfile(homeCountry).language)(
                    existing.university,
                    check.name,
                  ),
                  bioUrl ?? null,
                ],
              );
            }
            athletesInCheck++;
            totalFound++;
            continue;
          }

          await db.execute(
            `INSERT OR IGNORE INTO athletes
             (name, slug, roster_name, roster_key, home_country, sport, position, hometown,
              university, university_state, division,
              class_year, expected_graduation, year_enrolled, bio_url, gender, previous_school)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              athlete.name,
              slug,
              athlete.name,
              rosterKey(bioUrl),
              homeCountry,
              sportKey,
              // Sidearm-celler kan være flerlinjede ("Midfielder\n…\nM") —
              // rens FØR insert så snavset aldrig når DB/profiltekster/sidebar.
              cleanPosition(athlete.position),
              athlete.hometown,
              check.name,
              check.state,
              check.division,
              classYear,
              expectedGraduation,
              yearEnrolled,
              bioUrl,
              // Kildens eget felt først (JSON-API'et), ellers holdets URL: bio-URL'en
              // er mest præcis, roster-URL'en er faldback.
              gender,
              // Skolens egen transfer-oplysning. Kun JSON-API'et har den; på
              // HTML-rosters er den undefined og feltet forbliver tomt.
              athlete.previousSchool ?? null,
            ],
          );

          // Opdatér eksisterende atleter med class_year (ændrer sig hvert år)
          await db.execute(
            `UPDATE athletes
             SET class_year = ?, expected_graduation = ?,
                 year_enrolled = COALESCE(year_enrolled, ?),
                 updated_at = datetime('now')
             WHERE slug = ? AND (class_year IS NULL OR class_year != ?)`,
            [classYear, expectedGraduation, yearEnrolled, slug, classYear],
          );

          athletesInCheck++;
          totalFound++;
        } catch (err) {
          console.error(`  Fejl ved "${athlete.name}": ${err}`);
        }
      }

      // Opdatér roster_check status
      // API'et svarede, men holdet har ingen offentliggjorte spillere: det er
      // 'empty' (rosteren blev læst), ikke 'error' (vi kunne ikke læse den).
      const readOk = roster.length > 0 || apiRoster !== null;
      const status = matchedAthletes.length > 0 ? "success" : readOk ? "empty" : "error";
      const errorMsg = readOk ? null : "Ingen roster-data fundet i HTML";

      await db.execute(
        `UPDATE roster_checks
         SET status = ?, athletes_found = ?, checked_at = datetime('now'), error_message = ?
         WHERE id = ?`,
        [status, athletesInCheck, errorMsg, check.check_id],
      );

      if (matchedAthletes.length > 0) {
        console.log(
          `  ${check.name} / ${check.sport}: Fandt ${matchedAthletes.length} matchende atlet(er)`,
        );
      }
    } catch (err) {
      console.error(
        `  Fejl ved check ${check.check_id} (${check.name} / ${check.sport}): ${err}`,
      );
      totalErrors++;
    }

    totalProcessed++;

    if (totalProcessed % 100 === 0) {
      console.log(`  Fremgang: ${totalProcessed}/${checks.length} (fundet: ${totalFound})...`);
    }

    // Rate limiting: 1 sekund mellem requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Opdatér pipeline-kørsel
  if (runId) {
    await db.execute(
      `UPDATE pipeline_runs
       SET status = 'completed', finished_at = datetime('now'),
           items_processed = ?, items_found = ?
       WHERE id = ?`,
      [totalProcessed, totalFound, runId],
    );
  }

  console.log(
    `\nFærdig. Behandlet: ${totalProcessed}, fundet: ${totalFound} nye danske atlet(er), fejl: ${totalErrors}.` +
      (renderEnabled ? ` Render brugt: ${rendersUsed}/${renderBudget}.` : ""),
  );
}

main().catch(async (err) => {
  console.error("Scraping fejlede:", err);
  try {
    const db = createD1Client();
    await db.execute(
      `UPDATE pipeline_runs SET status = 'failed', finished_at = datetime('now'),
       error_message = ? WHERE status = 'running' AND run_type = 'roster_scrape'
       ORDER BY id DESC LIMIT 1`,
      [String(err)],
    );
  } catch {
    // Kan ikke opdatere pipeline_runs — ignorer
  }
  process.exit(1);
});
