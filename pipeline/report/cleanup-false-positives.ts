/**
 * Tjek alle atleter i databasen mod den opdaterede isDanishHometown() og deaktivér
 * false positives (sætter active=0 — reversibelt; de forsvinder fra sitet men slettes ikke).
 *
 * Atleter med NULL hometown springes over — de er sandsynligvis manuelt tilføjet
 * og er legitime danske atleter uden hometown-data.
 *
 * Kør:
 *   npx tsx pipeline/report/cleanup-false-positives.ts            # dry-run (kun rapport)
 *   npx tsx pipeline/report/cleanup-false-positives.ts --apply    # deaktivér (active=0)
 *   npx tsx pipeline/report/cleanup-false-positives.ts --apply --hard-delete  # slet permanent (cascade)
 */
import { createD1Client } from "../lib/d1-client";
import { classifyHometown } from "../../src/lib/hometown";
import { activeCountries } from "../../src/lib/countries";

interface AthleteRow {
  id: number;
  name: string;
  hometown: string | null;
  university: string;
  sport: string;
  active: number;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const hardDelete = args.includes("--hard-delete");

  const db = createD1Client();
  const r = await db.query<AthleteRow>(
    "SELECT id, name, hometown, university, sport, active FROM athletes",
  );

  console.log(`Tjekker ${r.results.length} atleter${apply ? "" : " (DRY-RUN — ingen ændringer)"}...\n`);

  const falsePositives: AthleteRow[] = [];
  let nullCount = 0;

  for (const a of r.results) {
    if (!a.hometown) {
      nullCount++;
      continue;
    }
    if (!classifyHometown(a.hometown, activeCountries())) falsePositives.push(a);
  }

  console.log(`${nullCount} atleter med tom hometown sprunget over (antaget legitime).\n`);

  if (falsePositives.length === 0) {
    console.log("Ingen false positives fundet.");
    return;
  }

  console.log(`${falsePositives.length} false positive(s):`);
  for (const a of falsePositives) {
    const flag = a.active ? "" : " (allerede inaktiv)";
    console.log(`  #${a.id} | ${a.name} | ${a.hometown} | ${a.university} | ${a.sport}${flag}`);
  }

  if (!apply) {
    console.log("\nDRY-RUN: kør med --apply for at deaktivere (active=0), eller --apply --hard-delete for permanent sletning.");
    return;
  }

  const ids = falsePositives.map((a) => a.id);
  const idList = ids.join(",");

  if (hardDelete) {
    // Cascade-slet fra alle tabeller der refererer athletes(id)
    // — og først fra dem der refererer articles(id), ellers falder
    // artikel-sletningen på FOREIGN KEY constraint failed (samme fælde som
    // /admin's afvis-knap, se deleteArticle i src/lib/admin.ts).
    await db.execute(
      `DELETE FROM draft_reviews WHERE article_id IN (SELECT id FROM articles WHERE athlete_id IN (${idList}))`,
    );
    await db.execute(
      `DELETE FROM social_posts WHERE article_id IN (SELECT id FROM articles WHERE athlete_id IN (${idList}))`,
    );
    await db.execute(`DELETE FROM articles WHERE athlete_id IN (${idList})`);
    await db.execute(`DELETE FROM stories WHERE athlete_id IN (${idList})`);
    await db.execute(`DELETE FROM sources WHERE athlete_id IN (${idList})`);
    await db.execute(`DELETE FROM athletes WHERE id IN (${idList})`);
    console.log(`\nSlettet permanent: ${ids.length} atlet(er).`);
  } else {
    await db.execute(
      `UPDATE athletes SET active = 0, updated_at = datetime('now') WHERE id IN (${idList})`,
    );
    console.log(`\nDeaktiveret (active=0): ${ids.length} atlet(er). Reversibelt via active=1.`);
  }
}

main().catch(console.error);
