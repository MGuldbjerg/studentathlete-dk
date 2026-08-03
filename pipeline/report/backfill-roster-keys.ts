/**
 * Engangs-backfill af migration-032-felterne på eksisterende atleter:
 *   roster_key  = skolens spiller-id udledt af bio_url (athlete-identity.rosterKey)
 *   roster_name = skolens stavemåde; før første manuelle rettelse ER `name` det
 *
 * Kør FØR dedup-athletes.ts og FØR migration 033 (det unikke indeks).
 *
 *   npx tsx pipeline/report/backfill-roster-keys.ts           # dry-run
 *   npx tsx pipeline/report/backfill-roster-keys.ts --apply
 */
import { createD1Client } from "../lib/d1-client";
import { rosterKey } from "../lib/athlete-identity";

interface Row {
  id: number;
  name: string;
  bio_url: string | null;
  roster_key: string | null;
  roster_name: string | null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const r = await db.query<Row>(
    "SELECT id, name, bio_url, roster_key, roster_name FROM athletes",
  );

  const keyed: Array<{ row: Row; key: string }> = [];
  const collisions = new Map<string, Row[]>();

  for (const row of r.results) {
    const key = rosterKey(row.bio_url);
    if (!key) continue;
    keyed.push({ row, key });
    const arr = collisions.get(key) ?? [];
    arr.push(row);
    collisions.set(key, arr);
  }

  const dupes = [...collisions.entries()].filter(([, rows]) => rows.length > 1);

  console.log(
    `${r.results.length} atleter · ${keyed.length} med spiller-id i bio_url` +
      `${apply ? "" : " (DRY-RUN)"}\n`,
  );

  if (dupes.length > 0) {
    console.log(`⚠ ${dupes.length} spiller-id(er) deles af flere rækker = dubletter:`);
    for (const [key, rows] of dupes) {
      console.log(`   ${key}: ${rows.map((x) => `#${x.id} "${x.name}"`).join(" + ")}`);
    }
    console.log("   → kør pipeline/report/dedup-athletes.ts --apply bagefter.\n");
  }

  if (!apply) {
    console.log("DRY-RUN: kør med --apply for at skrive roster_key + roster_name.");
    return;
  }

  let written = 0;
  for (const { row, key } of keyed) {
    if (row.roster_key === key && row.roster_name) continue;
    await db.execute(
      `UPDATE athletes SET roster_key = ?, roster_name = COALESCE(roster_name, name)
       WHERE id = ?`,
      [key, row.id],
    );
    written++;
  }
  // Rækker uden spiller-id skal stadig have roster_name (matchnøgle ved rename).
  await db.execute(
    "UPDATE athletes SET roster_name = name WHERE roster_name IS NULL",
  );
  console.log(`Skrev roster_key på ${written} række(r); roster_name udfyldt overalt.`);
}

main().catch(console.error);
