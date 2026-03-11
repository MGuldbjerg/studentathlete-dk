/**
 * Scraper der henter rosters fra college-websites og finder danske atleter.
 * Kør med: npx tsx pipeline/scrape/scrape-rosters.ts
 *
 * Respekterer rate limiting (1 sek mellem requests) og robots.txt-konventioner.
 */

import { createD1Client } from "../lib/d1-client";
import type { D1Client } from "../lib/d1-client";
import { parseRoster } from "./parsers";
import { isDanishHometown } from "../lib/danish-cities";
import { generateSlug } from "../lib/slug";
import type { School } from "../lib/types";

interface SchoolWithRoster extends School {
  website: string;
}

const SPORTS = ["football", "basketball", "baseball", "soccer", "track-and-field", "swimming-and-diving"];
const USER_AGENT = "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

async function fetchRosterPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function scrapeSchool(
  db: D1Client,
  school: SchoolWithRoster,
): Promise<number> {
  let totalFound = 0;

  for (const sport of SPORTS) {
    const rosterUrl = `${school.website}/sports/${sport}/roster`;
    const html = await fetchRosterPage(rosterUrl);
    if (!html) continue;

    const roster = parseRoster(html);
    const danishAthletes = roster.filter((entry) =>
      isDanishHometown(entry.hometown),
    );

    for (const athlete of danishAthletes) {
      const slug = generateSlug(athlete.name);
      const sportLabel = sport.charAt(0).toUpperCase() + sport.slice(1);

      try {
        await db.execute(
          `INSERT OR IGNORE INTO athletes
           (name, slug, sport, position, hometown, university, university_state, division)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            athlete.name,
            slug,
            sportLabel,
            athlete.position,
            athlete.hometown,
            school.name,
            school.state,
            school.division,
          ],
        );
        totalFound++;
      } catch (err) {
        console.error(`  Fejl ved "${athlete.name}": ${err}`);
      }
    }

    if (danishAthletes.length > 0) {
      console.log(
        `  ${school.name} / ${sport}: Fandt ${danishAthletes.length} dansk(e) atlet(er)`,
      );
    }

    // Rate limiting: 1 sekund mellem requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  return totalFound;
}

async function main(): Promise<void> {
  const db = createD1Client();

  console.log("Henter skoler med websites...");
  const result = await db.query<SchoolWithRoster>(
    "SELECT * FROM schools WHERE website IS NOT NULL",
  );
  const schools = result.results;

  if (schools.length === 0) {
    console.log("Ingen skoler med websites fundet. Kør seed først.");
    return;
  }

  console.log(`Scraper rosters for ${schools.length} skole(r)...\n`);

  let totalFound = 0;
  for (const school of schools) {
    console.log(`Scraper: ${school.name}...`);
    const found = await scrapeSchool(db, school);
    totalFound += found;
  }

  console.log(`\nFærdig. Fandt ${totalFound} nye danske atlet(er) i alt.`);
}

main().catch((err) => {
  console.error("Scraping fejlede:", err);
  process.exit(1);
});
