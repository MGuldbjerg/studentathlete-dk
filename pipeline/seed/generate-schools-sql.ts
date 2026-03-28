/**
 * Genererer en SQL-fil med INSERT-statements for alle skoler fra CSV.
 * Output: db/seed-schools.sql — køres med wrangler d1 execute.
 *
 * Kør med: npx tsx pipeline/seed/generate-schools-sql.ts
 * Derefter: wrangler d1 execute studentathlete-dk --file=db/seed-schools.sql --remote
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

interface SchoolCsvRow {
  school_id: string;
  name: string;
  common_name: string;
  nickname: string;
  division: string;
  conference: string;
  city: string;
  state: string;
  athletics_url: string;
}

const DIVISION_MAP: Record<string, string> = {
  D1: "NCAA D1",
  D2: "NCAA D2",
  D3: "NCAA D3",
  NAIA: "NAIA",
  NJCAA: "NJCAA",
};

const ROSTER_SPORTS = [
  "football", "basketball", "baseball", "soccer",
  "track-and-field", "swimming-and-diving", "golf", "tennis",
  "rowing", "gymnastics", "ice-hockey", "volleyball",
];

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

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

function generateSlug(text: string): string {
  const DANISH: Record<string, string> = { æ: "ae", ø: "oe", å: "aa", Æ: "ae", Ø: "oe", Å: "aa" };
  return text
    .toLowerCase()
    .replace(/[æøåÆØÅ]/g, (ch) => DANISH[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function main(): void {
  const csvPath =
    process.argv[2] ??
    resolve(homedir(), "projekter/studentathlete/data/schools.csv");

  const csvText = readFileSync(csvPath, "utf-8").replace(/\r/g, "");
  const lines = csvText.trim().split("\n");
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

  const rows: SchoolCsvRow[] = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row as unknown as SchoolCsvRow;
  });

  console.log(`Fandt ${rows.length} rækker i CSV`);

  const sqlLines: string[] = [
    "-- Auto-genereret fra schools.csv",
    `-- ${rows.length} skoler, ${new Date().toISOString()}`,
    "",
  ];

  // Tæl slug-forekomster for at håndtere duplikater
  const slugCounts: Record<string, number> = {};

  for (const row of rows) {
    if (!row.name) continue;

    // Mange D2/D3/NAIA-skoler mangler common_name — brug name som fallback
    const commonName = row.common_name || row.name.replace(/ University| College/g, "").trim() || row.name;
    const division = DIVISION_MAP[row.division] ?? row.division;
    let slug = generateSlug(commonName);

    // Håndtér duplikerede slugs (f.eks. to skoler med samme common_name)
    slugCounts[slug] = (slugCounts[slug] ?? 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${row.state?.toLowerCase() || slugCounts[slug]}`;
    }

    const website = row.athletics_url || null;
    const websiteVal = website ? `'${esc(website)}'` : "NULL";
    const nicknameVal = row.nickname ? `'${esc(row.nickname)}'` : "NULL";
    const cityVal = row.city ? `'${esc(row.city)}'` : "NULL";
    const stateVal = row.state ? `'${esc(row.state)}'` : "NULL";
    const confVal = row.conference ? `'${esc(row.conference)}'` : "NULL";

    sqlLines.push(
      `INSERT OR IGNORE INTO schools (name, slug, state, division, conference, website, common_name, nickname, city)` +
      ` VALUES ('${esc(row.name)}', '${esc(slug)}', ${stateVal}, '${esc(division)}', ${confVal}, ${websiteVal}, '${esc(commonName)}', ${nicknameVal}, ${cityVal});`,
    );
  }

  // Roster-checks: opret for alle skoler med website
  sqlLines.push("");
  sqlLines.push("-- Roster-checks for skoler med website");

  for (const sport of ROSTER_SPORTS) {
    sqlLines.push(
      `INSERT OR IGNORE INTO roster_checks (school_id, sport, roster_url)` +
      ` SELECT id, '${sport}', website || '/sports/${sport}/roster'` +
      ` FROM schools WHERE website IS NOT NULL;`,
    );
  }

  const outPath = resolve(__dirname, "../../db/seed-schools.sql");
  writeFileSync(outPath, sqlLines.join("\n") + "\n", "utf-8");

  console.log(`Genereret: ${outPath}`);
  console.log(`  ${rows.length} INSERT-statements for skoler`);
  console.log(`  ${ROSTER_SPORTS.length} INSERT-statements for roster-checks`);
  console.log(`\nKør nu: wrangler d1 execute studentathlete-dk --file=db/seed-schools.sql --remote`);
}

main();
