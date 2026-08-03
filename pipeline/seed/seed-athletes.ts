/**
 * Seed atletdatabasen med kendte danske atleter fra seed-data.json.
 * Kør med: bash scripts/seed.sh
 * Eller: npx tsx pipeline/seed/seed-athletes.ts
 */

import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../../src/lib/slug";
import seedData from "./seed-data.json";

interface SeedAthlete {
  name: string;
  sport: string;
  position?: string | null;
  hometown?: string | null;
  university: string;
  university_state?: string | null;
  division?: string;
  year_enrolled?: number | null;
  active?: number;
}

interface SeedSchool {
  name: string;
  state: string;
  division: string;
  conference?: string;
  website?: string;
}

async function main(): Promise<void> {
  const db = createD1Client();

  const schools: SeedSchool[] = seedData.schools;
  const athletes: SeedAthlete[] = seedData.athletes;

  // Seed skoler først (atleter refererer til dem)
  let schoolCount = 0;
  for (const school of schools) {
    const slug = generateSlug(school.name);
    try {
      await db.execute(
        `INSERT OR IGNORE INTO schools (name, slug, state, division, conference, website)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          school.name,
          slug,
          school.state,
          school.division,
          school.conference ?? null,
          school.website ?? null,
        ],
      );
      schoolCount++;
    } catch (err) {
      console.error(`Fejl ved skole "${school.name}": ${err}`);
    }
  }
  console.log(`Seedet ${schoolCount} skoler`);

  // Seed atleter
  let athleteCount = 0;
  for (const athlete of athletes) {
    const slug = generateSlug(athlete.name);
    try {
      await db.execute(
        `INSERT OR IGNORE INTO athletes
         (name, slug, sport, position, hometown, university, university_state, division, year_enrolled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          athlete.name,
          slug,
          athlete.sport,
          athlete.position ?? null,
          athlete.hometown ?? null,
          athlete.university,
          athlete.university_state ?? null,
          athlete.division ?? "NCAA D1",
          athlete.year_enrolled ?? null,
        ],
      );
      athleteCount++;
    } catch (err) {
      console.error(`Fejl ved atlet "${athlete.name}": ${err}`);
    }
  }
  console.log(`Seedet ${athleteCount} atleter`);
}

main().catch((err) => {
  console.error("Seed fejlede:", err);
  process.exit(1);
});
