/**
 * Test af det mekaniske tal- og ugedagstjek.
 *
 * De to vigtigste sager er FALSKE ALARMER, for det er dem der gør et faktatjek
 * ubrugeligt: kilden skriver «fourth minute» mens kladden skriver «4. minut»,
 * og et klassetrin (2029) står i atletens profil, ikke i kampreferatet.
 */
import { numbersIn, unsupportedNumbers, digitsFromWords, weekdayMismatch } from "./draft-numbers";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

ok(numbersIn("scorede 2 mål i det 32. minut").join(",") === "2,32", "tal trækkes ud");
ok(numbersIn("ingen tal her").length === 0, "tekst uden tal");
ok(numbersIn("").length === 0, "tom streng");

// Den ægte fejl: 33 stod hverken i kilde eller faktaark.
ok(
  unsupportedNumbers("scorede i det 33. minut", "scored in the 32nd minute").includes("33"),
  "opdigtet minuttal fanges",
);
ok(
  !unsupportedNumbers("scorede i det 32. minut", "scored in the 32nd minute").includes("32"),
  "dækket tal flages ikke",
);

// Falsk alarm 1: kilden staver tallet.
ok(digitsFromWords("struck first in the fourth minute").includes("4"), "fourth → 4");
ok(digitsFromWords("in the ninth minute").includes("9"), "ninth → 9");
ok(
  unsupportedNumbers("bagud i det 4. minut", "struck first in the fourth minute").length === 0,
  "skrevet tal i kilden dækker cifret i kladden",
);

// Ugedag: 2026-08-27 var en torsdag.
const m = weekdayMismatch("Kampen blev spillet onsdag den 27. august", "2026-08-27");
ok(m !== null && m.actual === "torsdag", "forkert ugedag fanges");
ok(weekdayMismatch("spillet torsdag den 27. august", "2026-08-27") === null, "rigtig ugedag går fri");
ok(weekdayMismatch("ingen ugedag nævnt", "2026-08-27") === null, "ingen ugedag = ingen fejl");
ok(weekdayMismatch("onsdag", null) === null, "uden dato kan intet afgøres");

console.log(`\ndraft-numbers: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
