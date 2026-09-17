/**
 * Test af landefilteret i skole-importen.
 * Prøven er MEDLEMSKAB, ikke geografi — se canadianSchoolAllowed.
 */
import { canadianSchoolAllowed } from "./import-schools-csv";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string) {
  if (cond) passed++;
  else { failed++; console.error(`✗ ${name}`); }
}

ok(canadianSchoolAllowed("BC", "NCAA D2"), "Simon Fraser (BC, NCAA D2) kommer ind");
ok(!canadianSchoolAllowed("BC", "NAIA"), "UBC (BC, NAIA) holdes ude");
ok(!canadianSchoolAllowed("ON", "NAIA"), "Ontario ligeså");
ok(!canadianSchoolAllowed("B.C.", "NAIA"), "forkortelsen med punktummer fanges også");
ok(canadianSchoolAllowed("TX", "NAIA"), "amerikanske NAIA-skoler er uberørte");
ok(canadianSchoolAllowed("NY", "NCAA D3"), "— og amerikanske NCAA-skoler");
ok(canadianSchoolAllowed(undefined, "NAIA"), "manglende stat blokerer ikke");
ok(canadianSchoolAllowed("", "NJCAA D1"), "tom stat heller ikke");

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
