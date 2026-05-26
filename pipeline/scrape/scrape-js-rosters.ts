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

interface ScrapeResponse {
  success: boolean;
  result: {
    html?: string;
    markdown?: string;
    status_code?: number;
  };
  errors?: Array<{ message: string }>;
}

async function scrapeWithBrowser(
  url: string,
  accountId: string,
  apiToken: string,
): Promise<string | null> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/scrape`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["html"],
        rejectResourceTypes: ["image", "font", "media"],
        waitForSelector: "table, .roster, [class*=roster]",
        timeout: 15000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`  CF Browser Rendering fejl (${response.status}): ${text.slice(0, 200)}`);
      return null;
    }

    const data = (await response.json()) as ScrapeResponse;
    if (!data.success) {
      console.error(`  CF scrape fejl: ${data.errors?.map((e) => e.message).join(", ")}`);
      return null;
    }

    return data.result.html ?? null;
  } catch (err) {
    console.error(`  CF Browser Rendering timeout/fejl: ${err}`);
    return null;
  }
}

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 50;
    }
  }

  return { limit };
}

async function main(): Promise<void> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    console.error("Mangler CLOUDFLARE_ACCOUNT_ID eller CLOUDFLARE_API_TOKEN");
    process.exit(1);
  }

  const { limit } = parseArgs();
  const db = createD1Client();

  console.log(`Henter JS-renderede roster-checks (limit: ${limit})...\n`);

  const result = await db.query<JsRosterCheck>(
    `SELECT
       rc.id as check_id, rc.school_id, rc.sport, rc.roster_url,
       s.name as school_name, s.state as school_state, s.division
     FROM roster_checks rc
     JOIN schools s ON rc.school_id = s.id
     WHERE rc.status = 'js_required'
       AND rc.roster_url IS NOT NULL
     ORDER BY rc.checked_at ASC NULLS FIRST
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

    const html = await scrapeWithBrowser(check.roster_url, accountId, apiToken);

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

      try {
        await db.execute(
          `INSERT OR IGNORE INTO athletes
           (name, slug, sport, position, hometown, university, university_state, division,
            class_year, expected_graduation, year_enrolled)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
