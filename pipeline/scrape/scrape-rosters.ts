/**
 * Scraper der henter rosters fra college-websites og finder danske atleter.
 * Bruger roster_checks-tabellen for inkrementel tracking.
 *
 * Kør med: npx tsx pipeline/scrape/scrape-rosters.ts [--division D1] [--limit 500] [--max-age-days 30]
 */

import { createD1Client } from "../lib/d1-client";
import type { D1Client } from "../lib/d1-client";
import { parseRoster } from "./parsers";
import {
  renderPage,
  isBrowserRenderAvailable,
  BrowserRenderError,
} from "../lib/browser-render";
import { isDanishHometown } from "../lib/danish-cities";
import { generateSlug } from "../lib/slug";
import { samePerson } from "../lib/athlete-identity";
import { resolveClassYear, getAcademicYear } from "../lib/class-year";
import { cleanPosition } from "../../src/lib/roster-clean";
import type { School } from "../lib/types";

interface RosterCheckWithSchool {
  check_id: number;
  school_id: number;
  sport: string;
  roster_url: string | null;
  // School-felter
  name: string;
  slug: string;
  state: string | null;
  division: string;
  conference: string | null;
  website: string;
  platform_type: string | null;
}

const SPORT_MAP: Record<string, string> = {
  football: "football",
  basketball: "basketball",
  baseball: "baseball",
  soccer: "fodbold",
  "track-and-field": "atletik",
  "swimming-and-diving": "svømning",
  golf: "golf",
  tennis: "tennis",
  rowing: "roning",
  gymnastics: "gymnastik",
  "ice-hockey": "ishockey",
  volleyball: "volleyball",
};

const USER_AGENT = "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

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
  result: "ok" | "not_found" | "timeout" | "error";
  size: number;
}

async function fetchRosterPage(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    const text = response.ok ? await response.text() : null;
    return {
      html: text,
      httpStatus: response.status,
      result: response.ok ? "ok" : "not_found",
      size: text?.length ?? 0,
    };
  } catch {
    return { html: null, httpStatus: 0, result: "timeout", size: 0 };
  }
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
  if (existing.results.length > 0 && existing.results[0].result !== "ok") {
    return null; // Allerede prøvet, fejlede — spring over
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

/**
 * Find en eksisterende atlet der er SAMME person (samme identitet+sport, jf.
 * athlete-identity.samePerson) — også når navnet staves anderledes (mellemnavn
 * med/uden) eller atleten er skiftet skole. Returnerer null hvis personen ikke
 * findes endnu. Sport-puljen er lille, så et fuldt sport-scan er billigt.
 */
async function findExistingAthleteByIdentity(
  db: D1Client,
  name: string,
  sport: string,
  hometown: string | null,
): Promise<{ id: number; name: string; university: string } | null> {
  const r = await db.query<{
    id: number;
    name: string;
    sport: string;
    hometown: string | null;
    university: string;
  }>("SELECT id, name, sport, hometown, university FROM athletes WHERE sport = ?", [sport]);
  const found = r.results.find((row) => samePerson({ name, sport, hometown }, row));
  return found ? { id: found.id, name: found.name, university: found.university } : null;
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
       s.name, s.slug, s.state, s.division, s.conference, s.website, s.platform_type
     FROM roster_checks rc
     JOIN schools s ON rc.school_id = s.id
     LEFT JOIN (
       SELECT university, COUNT(*) AS dane_count
       FROM athletes WHERE active = 1 GROUP BY university
     ) da ON da.university = s.name
     WHERE s.website IS NOT NULL
       AND s.division LIKE ?
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
      // Prøv flere URL-kandidater baseret på platform
      const candidateUrls = getRosterUrls(check.website, check.sport, check.platform_type);
      let html: string | null = null;
      let usedUrl: string | null = null;

      for (const url of candidateUrls) {
        html = await fetchWithProbeLog(db, check.school_id, url);
        if (html) {
          usedUrl = url;
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      if (!html) {
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

      // Parse plain HTML først. Tom roster = muligvis en JS-renderet side.
      let roster = parseRoster(html);
      let renderedUsed = false;

      // Fallback: render JS-tunge sider via CF Browser Rendering (budget-begrænset).
      if (
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
        roster.length === 0 &&
        html.length < 1500 &&
        !html.includes("<table") &&
        !html.toLowerCase().includes("sidearm")
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

      const danishAthletes = roster.filter((entry) => isDanishHometown(entry.hometown));

      const academicYear = getAcademicYear();
      let athletesInCheck = 0;
      for (const athlete of danishAthletes) {
        const slug = generateSlug(athlete.name);
        const sportLabel = SPORT_MAP[check.sport] ?? check.sport;
        const { classYear, expectedGraduation, yearEnrolled } =
          resolveClassYear(athlete.year, academicYear);
        const bioUrl = toAbsoluteUrl(athlete.bioUrl, check.website);

        try {
          // Dedup/transfer: matcher denne atlet en eksisterende person (samme
          // identitet+sport)? Hvis ja — også ved navne-variant eller skoleskift —
          // opdatér DEN række (inkl. university) i stedet for at indsætte en ny slug.
          const existing = await findExistingAthleteByIdentity(
            db, athlete.name, sportLabel, athlete.hometown,
          );

          if (existing) {
            const transferred = existing.university !== check.name;
            // hometown overskrives ALDRIG hvis allerede sat (bevarer det verificerede
            // danske signal); fyldes kun ud hvis det manglede.
            await db.execute(
              `UPDATE athletes
               SET university = ?, university_state = ?, division = ?,
                   class_year = ?, expected_graduation = ?,
                   year_enrolled = COALESCE(year_enrolled, ?),
                   hometown = COALESCE(hometown, ?),
                   bio_url = COALESCE(?, bio_url),
                   active = 1, updated_at = datetime('now')
               WHERE id = ?`,
              [
                check.name, check.state, check.division,
                classYear, expectedGraduation, yearEnrolled,
                athlete.hometown, bioUrl, existing.id,
              ],
            );
            if (transferred) {
              console.log(
                `  ⇄ ${existing.name}: ${existing.university} → ${check.name} (transfer/navne-variant)`,
              );
            }
            athletesInCheck++;
            totalFound++;
            continue;
          }

          await db.execute(
            `INSERT OR IGNORE INTO athletes
             (name, slug, sport, position, hometown, university, university_state, division,
              class_year, expected_graduation, year_enrolled, bio_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              athlete.name,
              slug,
              sportLabel,
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
      const status = danishAthletes.length > 0 ? "success" : roster.length > 0 ? "empty" : "error";
      const errorMsg = roster.length === 0 ? "Ingen roster-data fundet i HTML" : null;

      await db.execute(
        `UPDATE roster_checks
         SET status = ?, athletes_found = ?, checked_at = datetime('now'), error_message = ?
         WHERE id = ?`,
        [status, athletesInCheck, errorMsg, check.check_id],
      );

      if (danishAthletes.length > 0) {
        console.log(
          `  ${check.name} / ${check.sport}: Fandt ${danishAthletes.length} dansk(e) atlet(er)`,
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
