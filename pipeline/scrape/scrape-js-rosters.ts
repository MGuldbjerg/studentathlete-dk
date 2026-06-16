/**
 * Scraper JS-renderede roster-sider via Cloudflare Browser Rendering.
 * Håndterer skoler markeret som 'js_required' i roster_checks.
 *
 * Kør med: npx tsx pipeline/scrape/scrape-js-rosters.ts [--limit 50]
 *
 * Budget: maks ~8 min browser-tid pr. dag (gratis plan: 10 min/dag).
 * Hver side tager ~5-10 sek → ~50 sider/dag.
 */

import { createD1Client } from "../lib/d1-client";
import { parseRoster } from "./parsers";
import { isDanishHometown } from "../lib/danish-cities";
import { generateSlug } from "../lib/slug";
import { resolveClassYear, getAcademicYear } from "../lib/class-year";
import { renderPage, isBrowserRenderAvailable, BrowserRenderError } from "../lib/browser-render";

interface JsRosterCheck {
  check_id: number;
  school_id: number;
  sport: string;
  roster_url: string;
  school_name: string;
  school_state: string | null;
  division: string;
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

// Renderingen sker via den fælles renderPage-helper (CF /content-endpointet), som
// er den eneste der virker: det tidligere bespoke /scrape-kald med formats:["html"]
// + waitForSelector-streng gav HTTP 400 (forkert endpoint-skema). renderPage
// returnerer fuld HTML, håndterer 429-retry og kaster BrowserRenderError ved
// auth/kvote, så main kan stoppe resten af kørslen.

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!Number.isNaN(n)) limit = n;
    }
  }

  return { limit };
}

/** Gør et relativt bio-href absolut ift. roster-sidens URL. */
function toAbsoluteUrl(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  if (!isBrowserRenderAvailable()) {
    console.error("Mangler CLOUDFLARE_ACCOUNT_ID eller CLOUDFLARE_API_TOKEN");
    process.exit(1);
  }

  const { limit } = parseArgs();
  const db = createD1Client();

  console.log(`Henter JS-renderede roster-checks (limit: ${limit})...\n`);

  // Medtag: (a) js_required-rosters, OG (b) rosters på skoler der har aktive danske
  // atleter UDEN bio_url — så vi gen-renderer netop de sider, der kan udfylde
  // profilbilleder. Prioritér (b) først; checked_at ASC roterer gennem dem over
  // flere daglige kørsler, så vi spiser den gratis browser-kvote i bidder.
  const missingBioAtSchool = `EXISTS (
       SELECT 1 FROM athletes a
       WHERE a.university = s.name AND a.active = 1
         AND (a.bio_url IS NULL OR a.bio_url = '')
     )`;
  const result = await db.query<JsRosterCheck>(
    `SELECT
       rc.id as check_id, rc.school_id, rc.sport, rc.roster_url,
       s.name as school_name, s.state as school_state, s.division
     FROM roster_checks rc
     JOIN schools s ON rc.school_id = s.id
     WHERE rc.roster_url IS NOT NULL
       AND (rc.status = 'js_required' OR ${missingBioAtSchool})
     ORDER BY
       CASE WHEN ${missingBioAtSchool} THEN 0 ELSE 1 END,
       rc.checked_at ASC NULLS FIRST
     LIMIT ?`,
    [limit],
  );

  const checks = result.results;
  if (checks.length === 0) {
    console.log("Ingen JS-renderede roster-sider at scrape.");
    return;
  }

  console.log(`Scraper ${checks.length} JS-renderede sider via CF Browser Rendering...\n`);

  let totalFound = 0;
  let totalProcessed = 0;

  for (const check of checks) {
    console.log(`  ${check.school_name} / ${check.sport}...`);

    let html: string | null = null;
    try {
      html = await renderPage(check.roster_url, { waitUntil: "networkidle2" });
    } catch (err) {
      if (err instanceof BrowserRenderError && err.quotaExhausted) {
        // Vis rå status/besked: "Authentication error" (401) = token mangler
        // Browser Rendering-perm; "rate limit"/"quota" (429) = dagskvote opbrugt.
        console.error(
          `  Browser-render stoppet (HTTP ${err.status}): ${err.message} — stopper resten af kørslen.`,
        );
        break; // gem resten til næste daglige kørsel
      }
      // anden fejl: behandl som ikke-renderet (falder igennem til !html nedenfor)
    }

    if (!html) {
      await db.execute(
        `UPDATE roster_checks
         SET checked_at = datetime('now'), error_message = 'CF Browser Rendering fejlede'
         WHERE id = ?`,
        [check.check_id],
      );
      totalProcessed++;
      continue;
    }

    const roster = parseRoster(html);
    const danishAthletes = roster.filter((entry) => isDanishHometown(entry.hometown));

    const academicYear = getAcademicYear();
    let athletesInCheck = 0;
    for (const athlete of danishAthletes) {
      const slug = generateSlug(athlete.name);
      const sportLabel = SPORT_MAP[check.sport] ?? check.sport;
      const { classYear, expectedGraduation, yearEnrolled } =
        resolveClassYear(athlete.year, academicYear);
      const bioUrl = toAbsoluteUrl(athlete.bioUrl, check.roster_url);

      try {
        await db.execute(
          `INSERT OR IGNORE INTO athletes
           (name, slug, sport, position, hometown, university, university_state, division,
            class_year, expected_graduation, year_enrolled, bio_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            athlete.name,
            slug,
            sportLabel,
            athlete.position,
            athlete.hometown,
            check.school_name,
            check.school_state,
            check.division,
            classYear,
            expectedGraduation,
            yearEnrolled,
            bioUrl,
          ],
        );

        // Opdatér eksisterende atleter med class_year
        await db.execute(
          `UPDATE athletes
           SET class_year = ?, expected_graduation = ?,
               year_enrolled = COALESCE(year_enrolled, ?),
               updated_at = datetime('now')
           WHERE slug = ? AND (class_year IS NULL OR class_year != ?)`,
          [classYear, expectedGraduation, yearEnrolled, slug, classYear],
        );

        // Bagudfyld bio_url for eksisterende atleter (uafhængigt af class_year,
        // så research-seedede atleter uden bio får det officielle profillink →
        // suggest-photos kan derefter hente headshot). COALESCE: overskriv aldrig.
        if (bioUrl) {
          await db.execute(
            `UPDATE athletes
             SET bio_url = ?, updated_at = datetime('now')
             WHERE slug = ? AND (bio_url IS NULL OR bio_url = '')`,
            [bioUrl, slug],
          );
        }

        athletesInCheck++;
        totalFound++;
      } catch (err) {
        console.error(`    Fejl ved "${athlete.name}": ${err}`);
      }
    }

    const status = danishAthletes.length > 0 ? "success" : roster.length > 0 ? "empty" : "error";

    await db.execute(
      `UPDATE roster_checks
       SET status = ?, athletes_found = ?, checked_at = datetime('now'),
           error_message = NULL
       WHERE id = ?`,
      [status, athletesInCheck, check.check_id],
    );

    if (danishAthletes.length > 0) {
      console.log(`    Fandt ${danishAthletes.length} dansk(e) atlet(er)`);
    }

    totalProcessed++;

    // 2 sek mellem browser-requests for at spare budget
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(
    `\nFærdig. Behandlet: ${totalProcessed}, fundet: ${totalFound} nye danske atlet(er).`,
  );
}

main().catch((err) => {
  console.error("JS roster-scraping fejlede:", err);
  process.exit(1);
});
