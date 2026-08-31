/**
 * Kør: npx tsx pipeline/lib/_divisions-test.ts
 *
 * Testen findes fordi fejlen var TAVS: NJCAA-rækker lå korrekt i basen, og
 * ugekørslen sagde "0 klar til scraping" uden at nogen kunne se hvorfor.
 */
import { divisionPattern, sportsForDivision } from "./divisions";

let passed = 0, failed = 0;
function expect(label: string, got: unknown, want: unknown): void {
  if (JSON.stringify(got) === JSON.stringify(want)) passed++;
  else { failed++; console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`); }
}

expect("bagudkompatibel: D1 er NCAA", divisionPattern("D1"), "NCAA D1");
expect("bagudkompatibel: D3", divisionPattern("D3"), "NCAA D3");
expect("NJCAA alene dækker hele tieren", divisionPattern("NJCAA"), "NJCAA%");
expect("NJCAA D2 er præcis", divisionPattern("NJCAA D2"), "NJCAA D2");
expect("NAIA alene", divisionPattern("NAIA"), "NAIA%");
expect("NCAA D1 skrevet fuldt ud", divisionPattern("NCAA D1"), "NCAA D1");
expect("intet argument = alt", divisionPattern(null), "%");
expect("tom streng = alt", divisionPattern("  "), "%");

expect("NJCAA: kun de tre", sportsForDivision("NJCAA D1"), ["soccer", "basketball", "football"]);
expect("NJCAA D3 samme politik", sportsForDivision("NJCAA D3"), ["soccer", "basketball", "football"]);
expect("NCAA: ingen begrænsning", sportsForDivision("NCAA D1"), null);
expect("NAIA: ingen begrænsning", sportsForDivision("NAIA"), null);
expect("ukendt division: ingen begrænsning", sportsForDivision(null), null);

console.log(`\ndivisions: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
