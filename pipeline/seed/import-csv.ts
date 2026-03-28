/**
 * Importerer atleter fra CSV-fil til D1-databasen.
 * Forventet CSV-format: name,sport,gender,school,division,position,year,hometown,roster_url,found_date
 *
 * Kør med: npx tsx pipeline/seed/import-csv.ts [sti-til-csv]
 * Standardsti: ~/projekter/studentathlete/data/danish_athletes.csv
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createD1Client } from "../lib/d1-client";
import { createSourcesForAthlete } from "../lib/auto-sources";
import { generateSlug } from "../lib/slug";

interface CsvRow {
  name: string;
  sport: string;
  gender: string;
  school: string;
  division: string;
  position: string;
  year: string;
  hometown: string;
  roster_url: string;
  found_date: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    // Simpel CSV-parsing — håndterer ikke escaped kommaer inden i quotes
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row as unknown as CsvRow;
  });
}

async function main(): Promise<void> {
  const csvPath =
    process.argv[2] ??
    resolve(homedir(), "projekter/studentathlete/data/danish_athletes.csv");

  console.log(`Læser CSV: ${csvPath}`);

  let csvText: string;
  try {
    csvText = readFileSync(csvPath, "utf-8");
  } catch (err) {
    console.error(`Kunne ikke læse fil: ${csvPath}`);
    console.error(err);
    process.exit(1);
  }

  const rows = parseCsv(csvText);
  console.log(`Fandt ${rows.length} rækker i CSV`);

  if (rows.length === 0) {
    console.log("Ingen data at importere.");
    return;
  }

  const db = createD1Client();

  let imported = 0;
  let skipped = 0;
  let sourcesCreated = 0;

  for (const row of rows) {
    if (!row.name || !row.school) {
      skipped++;
      continue;
    }

    const slug = generateSlug(row.name);
    const yearEnrolled = row.year ? parseInt(row.year, 10) || null : null;

    try {
      // Tjek om atleten allerede eksisterer
      const existing = await db.query<{ id: number }>(
        "SELECT id FROM athletes WHERE slug = ?",
        [slug],
      );

      if (existing.results.length > 0) {
        skipped++;
        continue;
      }

      // Indsæt atlet
      await db.execute(
        `INSERT INTO athletes
         (name, slug, sport, position, hometown, university, division, year_enrolled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.name,
          slug,
          row.sport || "Andet",
          row.position || null,
          row.hometown || null,
          row.school,
          row.division || "NCAA D1",
          yearEnrolled,
        ],
      );

      // Hent den nye atlets ID
      const newAthlete = await db.query<{ id: number }>(
        "SELECT id FROM athletes WHERE slug = ?",
        [slug],
      );

      if (newAthlete.results.length > 0) {
        // Opret overvågningskilder
        await createSourcesForAthlete(
          db,
          newAthlete.results[0].id,
        );
        sourcesCreated++;
      }

      imported++;
      console.log(`  ✓ ${row.name} (${row.school})`);
    } catch (err) {
      console.error(`  ✗ Fejl ved "${row.name}": ${err}`);
    }
  }

  console.log(`\nResultat:`);
  console.log(`  Importeret: ${imported}`);
  console.log(`  Sprunget over: ${skipped}`);
  console.log(`  Kilder oprettet for: ${sourcesCreated}`);
}

main().catch((err) => {
  console.error("Import fejlede:", err);
  process.exit(1);
});
