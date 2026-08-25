/**
 * Test af stripForwardLooking.
 *
 * Første sag er den VIRKELIGE kilde til kladden om Bonnies-Niagara 20/8:
 * referatet slutter med en kamp den 24., som var spillet da vi genererede.
 */
import { stripForwardLooking } from "./forward-looking";

let pass = 0;
let fail = 0;

function eq(got: string, want: string, label: string): void {
  if (got === want) pass++;
  else {
    fail++;
    console.log(`  ✗ ${label}\n      fik:  ${JSON.stringify(got)}\n      vil:  ${JSON.stringify(want)}`);
  }
}

const bonnies = [
  "Macfarlane scored twice as the Bonnies won 2-0.",
  "",
  "UP NEXT",
  "The Bonnies travel to take on No. 23 West Virginia Monday, Aug. 24.",
].join("\n");
eq(
  stripForwardLooking(bonnies),
  "Macfarlane scored twice as the Bonnies won 2-0.",
  "UP NEXT og alt derefter fjernes",
);

eq(
  stripForwardLooking(["Referat.", "Up Next:", "De møder X."].join("\n")),
  "Referat.",
  "overskrift med kolon og blandet skrift",
);

eq(
  stripForwardLooking(["Referat.", "NÆSTE KAMP", "De møder X."].join("\n")),
  "Referat.",
  "dansk overskrift",
);

// Må ikke kappe midt i en sætning der blot indeholder ordene.
const inline = "Holdet ved ikke hvad der er up next i turneringen, men vandt 2-0.";
eq(stripForwardLooking(inline), inline, "ordene inde i en sætning rører vi ikke");

// Ingen overskrift → uændret.
const plain = "Et helt almindeligt referat uden nogen fremadrettet sektion.";
eq(stripForwardLooking(plain), plain, "ingen overskrift");

// Overskriften først = ikke et referat; lad være at tømme teksten.
const onlyNext = ["UP NEXT", "De møder X på lørdag."].join("\n");
eq(stripForwardLooking(onlyNext), onlyNext, "overskrift som allerførste linje bevares");

eq(stripForwardLooking(""), "", "tom streng");

console.log(`\nstripForwardLooking: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
