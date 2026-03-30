/**
 * Tjek alle atleter i databasen mod den opdaterede isDanishHometown() og slet false positives.
 *
 * Atleter med NULL hometown springes over — de er sandsynligvis manuelt tilføjet
 * og er legitime danske atleter uden hometown-data.
 */
import { createD1Client } from "../lib/d1-client";
import { isDanishHometown } from "../lib/danish-cities";

interface AthleteRow {
  id: number;
  name: string;
  hometown: string | null;
  university: string;
  sport: string;
}

async function main() {
  const db = createD1Client();
  const r = await db.query<AthleteRow>("SELECT id, name, hometown, university, sport FROM athletes");

  console.log(`Tjekker ${r.results.length} atleter...\n`);

  const falsePositives: AthleteRow[] = [];
  let nullCount = 0;

  for (const a of r.results) {
    if (!a.hometown) {
      nullCount++;
      console.log(`  SKIP  | ${a.name} | (tom hometown) | ${a.university}`);
      continue;
    }
    const passes = isDanishHometown(a.hometown);
    const status = passes ? "OK   " : "FALSK";
    console.log(`  ${status} | ${a.name} | ${a.hometown} | ${a.university}`);
    if (!passes) falsePositives.push(a);
  }

  console.log(`\n${nullCount} atleter med tom hometown sprunget over.`);

  if (falsePositives.length === 0) {
    console.log("Ingen false positives fundet.");
    return;
  }

  console.log(`\n${falsePositives.length} false positive(s) slettes:`);
  for (const a of falsePositives) {
    console.log(`  → ${a.name} | ${a.hometown} | ${a.university} | ${a.sport}`);
  }

  const ids = falsePositives.map((a) => a.id);
  const idList = ids.join(",");

  // Cascade-slet fra alle tabeller der refererer athletes(id)
  await db.execute(`DELETE FROM articles WHERE athlete_id IN (${idList})`);
  await db.execute(`DELETE FROM stories WHERE athlete_id IN (${idList})`);
  await db.execute(`DELETE FROM sources WHERE athlete_id IN (${idList})`);
  await db.execute(`DELETE FROM athletes WHERE id IN (${idList})`);
  console.log("Slettet.");
}

main().catch(console.error);
