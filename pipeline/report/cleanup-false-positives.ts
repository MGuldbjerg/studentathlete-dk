/**
 * Tjek alle atleter i databasen mod den opdaterede isDanishHometown() og fjern
 * false positives fra sitet (reversibelt; rækken slettes ikke).
 *
 * `active = 0` alone does NOT remove an athlete: inactive athletes are shown as
 * "Former athlete". Found 2026-09-30, when 17 non-British athletes were still on
 * .co.uk the day after their "deactivation", and six Americans from Denmark,
 * Wis. had been on .dk as former Danish athletes for months. So `home_country`
 * is cleared too — every site filters on it.
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
import { classifierCountries } from "../../src/lib/countries";

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
  // Rows already taken off every site (home_country NULL) are done.
  const r = await db.query<AthleteRow>(
    "SELECT id, name, hometown, university, sport, active FROM athletes WHERE home_country IS NOT NULL",
  );

  console.log(`Tjekker ${r.results.length} atleter${apply ? "" : " (DRY-RUN — ingen ændringer)"}...\n`);

  const falsePositives: AthleteRow[] = [];
  let nullCount = 0;

  for (const a of r.results) {
    if (!a.hometown) {
      nullCount++;
      continue;
    }
    // classifierCountries(), not activeCountries(): a collected Australian is not a
    // false positive just because Australia has no site yet.
    if (!classifyHometown(a.hometown, classifierCountries())) falsePositives.push(a);
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
    console.log("\nDRY-RUN: run with --apply to remove from the sites (active=0, home_country=NULL), or --apply --hard-delete to delete permanently.");
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
      `UPDATE athletes SET active = 0, home_country = NULL, updated_at = datetime('now') WHERE id IN (${idList})`,
    );
    console.log(`\nRemoved from the sites (active=0, home_country=NULL): ${ids.length} athlete(s). Reversible: set home_country again.`);
  }
}

main().catch(console.error);
