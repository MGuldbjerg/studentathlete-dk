/**
 * Udfylder `athletes.gender` for de atleter der allerede står i basen.
 *
 * Kilden er atletens egen bio-URL (`/sports/womens-track-and-field/roster/…`).
 * Scraperen sætter feltet fremover; det her er engangsoprydningen bagud.
 *
 *   npx tsx pipeline/report/backfill-gender.ts            # tørløb (default)
 *   npx tsx pipeline/report/backfill-gender.ts --apply    # skriver
 *
 * Rører aldrig en række der allerede HAR en værdi: feltet kan være rettet i
 * hånden, og et gæt fra en URL må ikke overskrive en menneskelig beslutning.
 */
import { createD1Client } from "../lib/d1-client";
import { genderFromTeamUrl } from "../../src/lib/gender";

async function main() {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const rows = await db.query<{ id: number; name: string; bio_url: string | null; sport: string }>(
    `SELECT id, name, bio_url, sport FROM athletes
     WHERE gender IS NULL AND bio_url IS NOT NULL`,
  );

  const updates: { id: number; name: string; gender: string; url: string }[] = [];
  for (const r of rows.results) {
    const g = genderFromTeamUrl(r.bio_url);
    if (g) updates.push({ id: r.id, name: r.name, gender: g, url: r.bio_url! });
  }

  console.log(`${rows.results.length} atlet(er) uden køn og med bio-URL.`);
  console.log(`${updates.length} kan udledes (${rows.results.length - updates.length} URL'er siger intet).\n`);

  for (const u of updates.slice(0, 15)) {
    console.log(`  ${u.gender}  ${u.name}  ←  ${u.url}`);
  }
  if (updates.length > 15) console.log(`  … og ${updates.length - 15} mere`);

  if (!apply) {
    console.log("\nTørløb. Kør med --apply for at skrive.");
    return;
  }

  let done = 0;
  for (const u of updates) {
    await db.execute("UPDATE athletes SET gender = ? WHERE id = ? AND gender IS NULL", [
      u.gender,
      u.id,
    ]);
    done++;
  }
  console.log(`\n${done} atlet(er) opdateret.`);

  const left = await db.query<{ n: number }>(
    "SELECT COUNT(*) as n FROM athletes WHERE gender IS NULL AND active = 1",
  );
  console.log(`Tilbage uden køn (aktive): ${left.results[0]?.n ?? 0} — typisk atleter uden bio-URL endnu.`);
}

main().catch((err) => {
  console.error("Backfill fejlede:", err);
  process.exit(1);
});
