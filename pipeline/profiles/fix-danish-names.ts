/**
 * Retter danske navne der har mistet æ/ø/å — men KUN når beviset findes.
 *
 * Amerikanske rosters skriver ASCII, så «Marcus Jørgensen» står som «Marcus
 * Jorgensen». Skrev et menneske den rigtige stavemåde ind i profilteksten,
 * findes rettelsen allerede — den ligger bare i den forkerte kolonne, og
 * forsvinder næste gang teksten genberegnes fra `athletes.name`.
 *
 * Kørslen retter derfor `name` fra teksten og sætter `name_locked = 1`, som
 * scraperen respekterer (se scrape-rosters.ts: «aldrig oven på en manuel
 * rettelse»). Uden låsen ville næste roster-scrape skrive ASCII tilbage.
 *
 * ⚠️ SLUGGEN RØRES IKKE. Adressen er allerede indekseret, og lige nu er
 * crawl-budget vores knappeste ressource — en omdøbning ville koste et nyt
 * crawl for ingenting. Slug og navn behøver ikke ligne hinanden; det er
 * netop derfor `athlete_aliases` findes.
 *
 * Mønster-fund (tier 2) rettes IKKE her. De står i kvalitets-fejebladet og
 * kræver et menneske: «Aagaard» kan være både en transskription og et lovligt
 * efternavn, og gætter man forkert, omdøber man et menneske.
 *
 *   npx tsx pipeline/profiles/fix-danish-names.ts           # dry-run
 *   npx tsx pipeline/profiles/fix-danish-names.ts --apply
 */
import { createD1Client } from "../lib/d1-client";
import { correctionFromText } from "../checks/danish-names";

interface Row {
  id: number;
  name: string;
  profile_summary: string | null;
  profile_draft: string | null;
  name_locked: number | null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const r = await db.query<Row>(
    `SELECT id, name, profile_summary, profile_draft, name_locked
     FROM athletes
     WHERE home_country = 'DK'
       AND (profile_summary IS NOT NULL OR profile_draft IS NOT NULL)`,
  );

  let fixed = 0;
  for (const row of r.results) {
    // Den GODKENDTE tekst er beviset. Et udkast er kun et forslag — men er
    // det menneskeskrevet, tæller det også, så begge kigges igennem.
    const found =
      correctionFromText(row.name, row.profile_summary) ??
      correctionFromText(row.name, row.profile_draft);
    if (!found) continue;

    fixed++;
    console.log(`#${row.id}  ${row.name}  →  ${found}${row.name_locked ? "  (allerede låst)" : ""}`);
    if (apply) {
      await db.execute(
        "UPDATE athletes SET name = ?, name_locked = 1, updated_at = datetime('now') WHERE id = ?",
        [found, row.id],
      );
    }
  }

  console.log(
    `\n${fixed} navn(e) ${apply ? "rettet og låst" : "ville blive rettet — kør med --apply"}.`,
  );
}

main();
