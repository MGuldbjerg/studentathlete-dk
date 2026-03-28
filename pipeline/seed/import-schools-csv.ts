/**
 * Importerer alle skoler fra schools.csv til D1-databasen.
 * Opretter roster_checks-rækker for skoler med athletics-URL.
 *
 * Kør med: npx tsx pipeline/seed/import-schools-csv.ts [sti-til-csv]
 * Standard: ~/projekter/studentathlete/data/schools.csv
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../lib/slug";

interface SchoolCsvRow {
  school_id: string;
  name: string;
  common_name: string;
  nickname: string;
  division: string;
  conference: string;
  city: string;
  state: string;
  wiki_url: string;
  athletics_wiki_url: string;
  athletics_url: string;
  status: string;
}

const DIVISION_MAP: Record<string, string> = {
  D1: "NCAA D1",
  D2: "NCAA D2",
  D3: "NCAA D3",
  NAIA: "NAIA",
  NJCAA: "NJCAA",
};

const ROSTER_SPORTS = [
  "football",
  "basketball",
  "baseball",
  "soccer",
  "track-and-field",
  "swimming-and-diving",
  "golf",
  "tennis",
  "rowing",
  "gymnastics",
  "ice-hockey",
  "volleyball",
];

/**
 * Proper CSV-parsing der håndterer quoted felter med kommaer.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(text: string): SchoolCsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row as unknown as SchoolCsvRow;
  });
}

async function main(): Promise<void> {
  const csvPath =
    process.argv[2] ??
    resolve(homedir(), "projekter/studentathlete/data/schools.csv");

  console.log(`Læser CSV: ${csvPath}`);

  let csvText: string;
  try {
    csvText = readFileSync(csvPath, "utf-8").replace(/\r/g, "");
  } catch (err) {
    console.error(`Kunne ikke læse fil: ${csvPath}`);
    console.error(err);
    process.exit(1);
  }

  const rows = parseCsv(csvText);
  console.log(`Fandt ${rows.length} rækker i CSV\n`);

  if (rows.length === 0) {
    console.log("Ingen data at importere.");
    return;
  }

  const db = createD1Client();

  let imported = 0;
  let skipped = 0;
  let rosterChecksCreated = 0;
  const divisionCounts: Record<string, number> = {};

  for (const row of rows) {
    if (!row.name) {
      skipped++;
      continue;
    }

    const commonName = row.common_name || row.name.replace(/ University| College/g, "").trim() || row.name;
    const division = DIVISION_MAP[row.division] ?? row.division;
    const slug = generateSlug(commonName);
    const website = row.athletics_url || null;

    divisionCounts[division] = (divisionCounts[division] ?? 0) + 1;

    try {
      // Tjek om skolen allerede eksisterer (via slug)
      const existing = await db.query<{ id: number }>(
        "SELECT id FROM schools WHERE slug = ?",
        [slug],
      );

      let schoolId: number;

      if (existing.results.length > 0) {
        schoolId = existing.results[0].id;
        // Opdatér med nye felter fra CSV
        await db.execute(
          `UPDATE schools SET
             common_name = ?, nickname = ?, city = ?,
             conference = COALESCE(conference, ?),
             website = COALESCE(website, ?)
           WHERE id = ?`,
          [commonName, row.nickname, row.city, row.conference, website, schoolId],
        );
        skipped++;
      } else {
        // Indsæt ny skole
        await db.execute(
          `INSERT INTO schools
           (name, slug, state, division, conference, website, common_name, nickname, city)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.name,
            slug,
            row.state || null,
            division,
            row.conference || null,
            website,
            commonName,
            row.nickname || null,
            row.city || null,
          ],
        );

        // Hent ID for den nye skole
        const newSchool = await db.query<{ id: number }>(
          "SELECT id FROM schools WHERE slug = ?",
          [slug],
        );
        schoolId = newSchool.results[0].id;
        imported++;
      }

      // Opret roster_checks for skoler med website (spring NJCAA over — ingen URL'er)
      if (website) {
        for (const sport of ROSTER_SPORTS) {
          try {
            await db.execute(
              `INSERT OR IGNORE INTO roster_checks (school_id, sport, roster_url)
               VALUES (?, ?, ?)`,
              [schoolId, sport, `${website}/sports/${sport}/roster`],
            );
            rosterChecksCreated++;
          } catch {
            // Allerede oprettet (UNIQUE constraint)
          }
        }
      }
    } catch (err) {
      console.error(`  Fejl ved "${row.name}": ${err}`);
    }
  }

  console.log("Resultat:");
  console.log(`  Nye skoler importeret: ${imported}`);
  console.log(`  Eksisterende opdateret: ${skipped}`);
  console.log(`  Roster-checks oprettet: ${rosterChecksCreated}`);
  console.log("\nPer division:");
  for (const [div, count] of Object.entries(divisionCounts).sort()) {
    console.log(`  ${div}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Import fejlede:", err);
  process.exit(1);
});
