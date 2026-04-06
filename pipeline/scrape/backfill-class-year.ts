/**
 * Backfill class_year for aktive atleter der mangler årgangen.
 *
 * Finder alle aktive atleter med class_year IS NULL, henter deres skoles
 * seneste kendte roster-URL fra roster_checks, parser siden og opdaterer.
 *
 * Kør med: npx tsx pipeline/scrape/backfill-class-year.ts [--dry-run] [--limit N]
 */

import { createD1Client } from "../lib/d1-client";
import { parseRoster } from "./parsers";
import { resolveClassYear, getAcademicYear } from "../lib/class-year";
import { generateSlug } from "../../src/lib/slug";

const USER_AGENT = "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

const SPORT_ROSTER_KEY: Record<string, string> = {
  football: "football",
  basketball: "basketball",
  baseball: "baseball",
  fodbold: "soccer",
  atletik: "track-and-field",
  svømning: "swimming-and-diving",
  golf: "golf",
  tennis: "tennis",
  roning: "rowing",
  gymnastik: "gymnastics",
  ishockey: "ice-hockey",
  volleyball: "volleyball",
};

interface AthleteRow {
  id: number;
  name: string;
  slug: string;
  sport: string;
  university: string;
}

interface RosterCheckRow {
  roster_url: string;
}

function parseArgs(): { dryRun: boolean; limit: number } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit = 200;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 200;
    }
  }
  return { dryRun, limit };
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs();
  const db = createD1Client();
  const academicYear = getAcademicYear();

  if (dryRun) console.log("[DRY RUN] Ingen DB-opdateringer.\n");
  console.log(`Akademisk år: ${academicYear}\n`);

  // Hent alle aktive atleter uden class_year
  const result = await db.query<AthleteRow>(
    `SELECT a.id, a.name, a.slug, a.sport, a.university
     FROM athletes a
     WHERE a.active = 1 AND a.class_year IS NULL
     ORDER BY a.sport, a.name
     LIMIT ?`,
    [limit],
  );

  const athletes = result.results;
  console.log(`Atleter uden class_year: ${athletes.length}\n`);

  if (athletes.length === 0) {
    console.log("Alle atleter har allerede en årgangsbetegnelse.");
    return;
  }

  let updated = 0;
  let notFound = 0;
  let noYear = 0;
  let fetchFailed = 0;

  for (const athlete of athletes) {
    const rosterSport = SPORT_ROSTER_KEY[athlete.sport] ?? null;
    if (!rosterSport) {
      console.log(`  SKIP  ${athlete.name} — ukendt sport '${athlete.sport}'`);
      notFound++;
      continue;
    }

    // Find den bedste kendte roster-URL fra roster_checks
    const checkResult = await db.query<RosterCheckRow>(
      `SELECT rc.roster_url
       FROM roster_checks rc
       JOIN schools s ON rc.school_id = s.id
       WHERE s.name = ? AND rc.sport = ? AND rc.roster_url IS NOT NULL AND rc.status = 'success'
       ORDER BY rc.checked_at DESC
       LIMIT 1`,
      [athlete.university, rosterSport],
    );

    const rosterUrl = checkResult.results[0]?.roster_url ?? null;
    if (!rosterUrl) {
      console.log(`  SKIP  ${athlete.name} — ingen succesfuld roster-URL i ${athlete.university}/${rosterSport}`);
      notFound++;
      continue;
    }

    // Fetch og parse roster
    const html = await fetchPage(rosterUrl);
    if (!html) {
      console.log(`  FEJL  ${athlete.name} — kunne ikke hente ${rosterUrl}`);
      fetchFailed++;
      continue;
    }

    const players = parseRoster(html);
    const expectedSlug = generateSlug(athlete.name);

    // Find atletens række i roster-data
    const match = players.find((p) => generateSlug(p.name) === expectedSlug);

    if (!match) {
      console.log(`  MISS  ${athlete.name} — ikke fundet i roster (${players.length} spillere)`);
      notFound++;
      continue;
    }

    const { classYear, expectedGraduation, yearEnrolled } = resolveClassYear(match.year, academicYear);

    if (!classYear) {
      console.log(`  NULL  ${athlete.name} — ingen årgangsbetegnelse på roster (raw: ${match.year ?? "—"})`);
      noYear++;
      continue;
    }

    console.log(`  OK    ${athlete.name} → ${classYear} (${expectedGraduation ?? "?"})`);

    if (!dryRun) {
      await db.execute(
        `UPDATE athletes
         SET class_year = ?, expected_graduation = ?,
             year_enrolled = COALESCE(year_enrolled, ?),
             updated_at = datetime('now')
         WHERE id = ?`,
        [classYear, expectedGraduation, yearEnrolled, athlete.id],
      );
    }
    updated++;

    // Mild rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`
Færdig.
  Opdateret:    ${updated}
  Ikke på liste: ${notFound}
  Ingen årgangsbetegnelse: ${noYear}
  Fetch-fejl:   ${fetchFailed}
`);
}

main().catch((err) => {
  console.error("Backfill-class-year fejlede:", err);
  process.exit(1);
});
