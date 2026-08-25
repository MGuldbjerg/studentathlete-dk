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
 * Uden --apply skrives INTET. Med --apply skrives FØRST en fuld
 * sikkerhedskopi af de rækker der slettes — en DELETE mod produktion kan
 * ellers ikke fortrydes, og transfers detekteres kun én gang (næste scrape
 * ser de to navne som ens og logger intet). Rækker hvis sætning ikke kan
 * parses rapporteres for sig og røres aldrig.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { sameInstitution } from "../../src/lib/school-name";

interface EventRow {
  id: number;
  athlete_id: number;
  occurred_on: string | null;
  season: string | null;
  kind: string;
  award_name: string | null;
  summary: string;
  significance: string | null;
  source_url: string | null;
  created_at: string | null;
  name: string;
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

interface Judged {
  row: EventRow;
  from: string;
  to: string;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const rows = await db.query<EventRow>(
    `SELECT e.id, e.athlete_id, e.occurred_on, e.season, e.kind, e.award_name,
            e.summary, e.significance, e.source_url, e.created_at, a.name
       FROM athlete_events e
       JOIN athletes a ON a.id = e.athlete_id
      WHERE e.kind = 'transfer'
      ORDER BY e.id`,
  );

  const falses: Judged[] = [];
  const reals: Judged[] = [];
  const unparsed: EventRow[] = [];

  for (const row of rows.results ?? []) {
    const parsed = parseTransfer(row.summary);
    if (!parsed) {
      unparsed.push(row);
      continue;
    }
    const [from, to] = parsed;
    (sameInstitution(from, to) ? falses : reals).push({ row, from, to });
  }

  console.log(`${(rows.results ?? []).length} transfer-begivenheder i alt`);
  console.log(`  ${falses.length} er samme lærested (falske)`);
  console.log(`  ${reals.length} ser ud til at være ægte skift`);
  console.log(`  ${unparsed.length} kunne ikke parses\n`);

  console.log("=== FALSKE — foreslået slettet ===");
  for (const f of falses) {
    console.log(`  ${String(f.row.id).padStart(4)}  ${f.row.name}`);
    console.log(`        ${f.from}  →  ${f.to}`);
  }

  console.log("\n=== BEHOLDES (ægte skift) ===");
  for (const r of reals) {
    console.log(`  ${String(r.row.id).padStart(4)}  ${r.row.name}: ${r.from} → ${r.to}`);
  }

  if (unparsed.length) {
    console.log("\n=== KUNNE IKKE PARSES — røres ikke ===");
    for (const u of unparsed) console.log(`  ${u.id}  ${u.name}: ${u.summary}`);
  }

  if (!apply) {
    console.log("\n(tørløb — intet slettet. Kør med --apply for at slette de falske.)");
    return;
  }
  if (falses.length === 0) {
    console.log("\nIntet at slette.");
    return;
  }

  // Sikkerhedskopi FØR sletning. Filen indeholder alle kolonner, så rækkerne
  // kan genindsættes uændret hvis en vurdering viser sig forkert.
  mkdirSync("logs", { recursive: true });
  const stamp = new Date().toISOString().split(":").join("-");
  const backup = `logs/false-transfers-${stamp}.json`;
  writeFileSync(backup, JSON.stringify(falses.map((f) => f.row), null, 2), "utf8");
  console.log(`\nSikkerhedskopi af ${falses.length} rækker: ${backup}`);

  // Atleter hvis profiludkast nu er forældet — udkastet indeholder en sætning
  // hvis kilde er væk. Listen bruges af scripts/cleanup-false-transfers.sh.
  const affected = [...new Set(falses.map((f) => f.row.athlete_id))].sort((a, b) => a - b);
  writeFileSync("logs/affected-athletes.txt", affected.join("\n") + "\n", "utf8");
  console.log(`${affected.length} atleter har fået et forældet udkast: logs/affected-athletes.txt`);

  for (const f of falses) {
    await db.execute(`DELETE FROM athlete_events WHERE id = ?`, [f.row.id]);
  }
  console.log(`\n${falses.length} falske begivenheder slettet.`);
}

if (process.argv[1] && process.argv[1].endsWith("false-transfers.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
