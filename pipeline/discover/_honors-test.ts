/**
 * Unit-tests for detectHonor(). Kør: npx tsx pipeline/discover/_honors-test.ts
 *
 * Dækker rigtige konference-honors-overskrifter (verificeret juni 2026 via
 * skole-/konference-feeds) + negative tilfælde der IKKE må udløse en boost
 * (rutine-referater, "week"-kontekst uden honor).
 */
import { detectHonor, type HonorType } from "./honors";

let passed = 0;
let failed = 0;

function expectType(text: string | null, want: HonorType | null, label: string): void {
  const got = detectHonor(text)?.type ?? null;
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: detectHonor(${JSON.stringify(text)}) = ${got}, forventede ${want}`);
  }
}

// ── Skal genkendes som honors ────────────────────────────────────────────────
expectType("Beaver Secures American Conference Player of the Week Honors", "player_of_week", "AAC POTW (skole-feed)");
expectType("Houston LB Sione Fotu earns Big 12 Defensive Player of the Week", "specialist_of_week", "Big 12 defensive POTW");
expectType("Madsen named SEC Freshman of the Week", "freshman_of_week", "SEC freshman");
expectType("Two Sooners earn SEC Pitcher of the Week honors", "specialist_of_week", "pitcher of the week");
expectType("Jensen tabbed Big Ten Athlete of the Month", "of_month", "athlete of the month");
expectType("Three Danes named All-Conference in volleyball", "all_conference", "all-conference");
expectType("Sørensen earns All-American honors at NCAA Championships", "all_american", "all-american");
expectType("Hansen named Sun Belt Swimmer of the Week", "specialist_of_week", "swimmer of the week");

// Prioritet: mere specifik vinder over generisk
expectType("Freshman of the Week: Nielsen shines", "freshman_of_week", "freshman slår generic player");

// ── Må IKKE udløse honors-boost ──────────────────────────────────────────────
expectType("Tigers fall to Duke in weekend series", null, "rutine-referat");
expectType("Player to watch this week: season preview", null, "'player' + 'week' uden honor-frase");
expectType("Game of the Week: Duke vs UNC on Saturday", null, "game of the week (ikke person)");
expectType("Weekly practice report from spring camp", null, "weekly uden honor");
expectType("", null, "tom streng");
expectType(null, null, "null");

// ── Resultat ─────────────────────────────────────────────────────────────────
console.log(`\nhonors: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
