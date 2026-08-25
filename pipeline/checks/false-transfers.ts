/**
 * Falske transfer-begivenheder: find (og valgfrit slet) de athlete_events
 * hvor "skiftet" i virkeligheden er to navne på SAMME lærested.
 *
 * Baggrund: scrape-rosters.ts afgjorde transfers med rå streng-ulighed, så
 * hver normalisering af schools.name loggede alle skolens atleter som
 * skiftere. Selve fejlkilden er rettet (sameInstitution), men rækkerne fra
 * før rettelsen ligger stadig i basen og fodrer profiludkastene.
 *
 * Kør:  npx tsx pipeline/checks/false-transfers.ts           (kun liste)
 *       npx tsx pipeline/checks/false-transfers.ts --apply   (sletter)
 *
 * Uden --apply skrives INTET. Rækker hvis sætning ikke kan parses bliver
 * rapporteret for sig — de slettes aldrig på et gæt.
 */
import { createD1Client } from "../lib/d1-client";
import { sameInstitution } from "../../src/lib/school-name";

interface EventRow {
  id: number;
  athlete_id: number;
  name: string;
  summary: string;
}

/** "Skiftede fra X til Y." / "Transferred from X to Y." → [X, Y] eller null. */
export function parseTransfer(summary: string): [string, string] | null {
  const forms: Array<[string, string]> = [
    ["Skiftede fra ", " til "],
    ["Transferred from ", " to "],
  ];
  for (const [prefix, sep] of forms) {
    if (!summary.startsWith(prefix)) continue;
    let body = summary.slice(prefix.length);
    if (body.endsWith(".")) body = body.slice(0, -1);
    const cut = body.lastIndexOf(sep);
    if (cut < 0) continue;
    const from = body.slice(0, cut).trim();
    const to = body.slice(cut + sep.length).trim();
    if (!from || !to) continue;
    return [from, to];
  }
  return null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const rows = await db.query<EventRow>(
    `SELECT e.id, e.athlete_id, a.name, e.summary
       FROM athlete_events e
       JOIN athletes a ON a.id = e.athlete_id
      WHERE e.kind = 'transfer'
      ORDER BY e.id`,
  );

  const falses: Array<{ id: number; name: string; from: string; to: string }> = [];
  const reals: Array<{ id: number; name: string; from: string; to: string }> = [];
  const unparsed: EventRow[] = [];

  for (const r of rows.results) {
    const parsed = parseTransfer(r.summary);
    if (!parsed) {
      unparsed.push(r);
      continue;
    }
    const [from, to] = parsed;
    (sameInstitution(from, to) ? falses : reals).push({ id: r.id, name: r.name, from, to });
  }

  console.log(`${rows.results.length} transfer-begivenheder i alt`);
  console.log(`  ${falses.length} er samme lærested (falske)`);
  console.log(`  ${reals.length} ser ud til at være ægte skift`);
  console.log(`  ${unparsed.length} kunne ikke parses\n`);

  console.log("=== FALSKE — foreslået slettet ===");
  for (const f of falses) {
    console.log(`  ${String(f.id).padStart(4)}  ${f.name}`);
    console.log(`        ${f.from}  →  ${f.to}`);
  }

  console.log("\n=== BEHOLDES (ægte skift) ===");
  for (const r of reals) {
    console.log(`  ${String(r.id).padStart(4)}  ${r.name}: ${r.from} → ${r.to}`);
  }

  if (unparsed.length) {
    console.log("\n=== KUNNE IKKE PARSES — røres ikke ===");
    for (const u of unparsed) console.log(`  ${u.id}  ${u.name}: ${u.summary}`);
  }

  if (!apply) {
    console.log("\n(tørløb — intet slettet. Kør med --apply for at slette de falske.)");
    return;
  }

  for (const f of falses) {
    await db.execute(`DELETE FROM athlete_events WHERE id = ?`, [f.id]);
  }
  console.log(`\n${falses.length} falske begivenheder slettet.`);
  console.log("Husk at genskabe profiludkastene: npx tsx pipeline/profiles/build-profile-drafts.ts");
}

if (process.argv[1] && process.argv[1].endsWith("false-transfers.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
