/**
 * Pensionér dimittender EFTER badge-året (jf. src/lib/graduation.ts):
 * atleter beholder 🎓-badge og forbliver AKTIVE (= discovery dækker stadig
 * draft-/pro-kontrakt-nyheder) i ét år efter dimission — fra 1. juni i
 * dimissionsåret til 31. maj året efter. Først DEREFTER sættes active=0
 * (alumni-sektionen på /atleter; reversibelt).
 *
 * Dukker en "pensioneret" atlet op på et roster igen, genaktiverer scraperens
 * identity-match dem med nyt expected_graduation.
 *
 * Kør:  npx tsx pipeline/report/retire-graduates.ts            (dry-run)
 *       npx tsx pipeline/report/retire-graduates.ts --apply
 */
import { createD1Client } from "../lib/d1-client";

function parseArgs(): { apply: boolean } {
  return { apply: process.argv.slice(2).includes("--apply") };
}

/** Seneste dimissionsår hvis badge-vindue er HELT udløbet (nu >= 1. juni året efter). */
export function lastExpiredGradYear(now: Date = new Date()): number {
  const juneFirstThisYear = new Date(now.getFullYear(), 5, 1);
  return now >= juneFirstThisYear ? now.getFullYear() - 1 : now.getFullYear() - 2;
}

async function main(): Promise<void> {
  const { apply } = parseArgs();
  const db = createD1Client();
  const cutoff = lastExpiredGradYear();

  const candidates = await db.query<{ id: number; name: string; university: string; expected_graduation: number }>(
    `SELECT id, name, university, expected_graduation
     FROM athletes
     WHERE active = 1 AND expected_graduation IS NOT NULL AND expected_graduation <= ?
     ORDER BY expected_graduation, name`,
    [cutoff],
  );

  console.log(
    `${candidates.results.length} atlet(er) med udløbet badge-år (dimission <= ${cutoff}) klar til pensionering`,
  );
  for (const a of candidates.results) {
    console.log(`  ${apply ? "→" : "(dry-run)"} ${a.name} (${a.university}, dimitteret ${a.expected_graduation})`);
  }

  if (!apply) {
    if (candidates.results.length > 0) console.log("\nKør med --apply for at pensionere (reversibelt: active=0).");
    return;
  }

  if (candidates.results.length > 0) {
    await db.execute(
      "UPDATE athletes SET active = 0, updated_at = datetime('now') WHERE active = 1 AND expected_graduation IS NOT NULL AND expected_graduation <= ?",
      [cutoff],
    );
    console.log(`\n${candidates.results.length} atlet(er) pensioneret til alumni.`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("retire-graduates.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
