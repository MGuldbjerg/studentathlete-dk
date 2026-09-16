/**
 * Test af hjemby-rensningen.
 *
 * «Filippa Mortensen, en freshman fra Herlev, Danmark» var anledningen (Mikkel,
 * 16. september 2026). Landet er støj på et site der kun handler om danske
 * atleter — men kun landet til sidst, og kun vores eget.
 */
import { hometownForProse } from "./prompts/news";

const DK = ["Denmark", "Danmark"];
let passed = 0;
let failed = 0;
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    fik:      ${x}\n    forventet: ${y}`); }
}

eq(hometownForProse("Herlev, Denmark", DK), "Herlev", "rosterens engelske landenavn fjernes");
eq(hometownForProse("Herlev, Danmark", DK), "Herlev", "det danske landenavn fjernes også");
eq(hometownForProse("Herlev,Denmark", DK), "Herlev", "uden mellemrum efter kommaet");
eq(hometownForProse("Herlev, DENMARK", DK), "Herlev", "store bogstaver betyder intet");
eq(hometownForProse("Herlev", DK), "Herlev", "en by uden land står uændret");

// Grænsetilfældene — dem der ville gøre skade.
eq(hometownForProse("Denmark", DK), "Denmark", "kender vi kun landet, er landet oplysningen");
eq(hometownForProse("Denmark, Wisconsin", DK), "Denmark, Wisconsin", "byen Denmark i Wisconsin er ikke et land til sidst");
eq(hometownForProse("København, Danmark, Denmark", DK), "København, Danmark", "kun ét land af gangen — det yderste");
eq(hometownForProse(null, DK), null, "ingen hjemby er ingen hjemby");

// Det britiske site gør bevidst det modsatte.
eq(
  hometownForProse("London, England", ["United Kingdom", "England", "Scotland", "Wales"]),
  "London",
  "reglen VIRKER på UK-markører — derfor kaldes den ikke fra en.ts",
);

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
