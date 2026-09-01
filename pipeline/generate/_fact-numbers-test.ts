/** Test af det fælles taltjek. */
import { numbersIn, digitsFromWords, unsupportedNumbers } from "./fact-numbers";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

ok(numbersIn("2 mål i det 32. minut").join(",") === "2,32", "tal trækkes ud");
ok(digitsFromWords("the fourth minute").includes("4"), "fourth → 4");

// Den ægte fejl fra kladde #199.
ok(unsupportedNumbers("i det 33. minut", "in the 32nd minute").includes("33"), "opdigtet tal fanges");
ok(!unsupportedNumbers("i det 32. minut", "in the 32nd minute").includes("32"), "dækket tal går fri");
ok(unsupportedNumbers("i det 4. minut", "the fourth minute").length === 0, "skrevet tal dækker cifret");

// Strukturelle tal — målt som falske alarmer mod menneskets rettelser.
ok(unsupportedNumbers("de sidste 45 minutter", "").length === 0, "45 er en halvleg, ikke en påstand");
ok(unsupportedNumbers("hele 90 minutter", "").length === 0, "90 er en kamp");
ok(unsupportedNumbers("2025-sæsonen", "").length === 0, "årstal er kalender");
// …men et årstal-lignende tal uden for kalenderen er stadig en påstand.
ok(unsupportedNumbers("scorede 4500 gange", "").includes("4500"), "4500 er ikke et årstal");
ok(unsupportedNumbers("19 skud", "").includes("19"), "almindelige tal flages fortsat");

console.log(`\nfact-numbers: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
