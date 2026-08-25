/**
 * Unit-tests for parseTransfer. Kør: npx tsx pipeline/checks/_false-transfers-test.ts
 *
 * Sætningen er den ENESTE kilde til hvorfra-hvortil (athlete_events gemmer
 * ikke felterne separat), så en parser der fejler i stilhed ville slette
 * forkerte rækker. Derfor testes både begge sprog og de tilfælde hvor den
 * skal give op.
 */
import { parseTransfer } from "./false-transfers";

let pass = 0;
let fail = 0;

function eq(got: [string, string] | null, want: [string, string] | null, label: string): void {
  const g = got ? got.join(" | ") : "null";
  const w = want ? want.join(" | ") : "null";
  if (g === w) {
    pass++;
  } else {
    fail++;
    console.log(`  ✗ ${label}: fik "${g}", forventede "${w}"`);
  }
}

eq(
  parseTransfer("Skiftede fra Ohio State University til The Ohio State University."),
  ["Ohio State University", "The Ohio State University"],
  "dansk",
);
eq(
  parseTransfer("Transferred from Hobart College to William Smith College."),
  ["Hobart College", "William Smith College"],
  "engelsk",
);
// Komma og bindestreg i skolenavne må ikke forstyrre.
eq(
  parseTransfer("Skiftede fra UC Davis til University of California, Davis."),
  ["UC Davis", "University of California, Davis"],
  "komma i navnet",
);
eq(
  parseTransfer("Skiftede fra Vermont State University–Castleton til Vermont State University–Johnson."),
  ["Vermont State University–Castleton", "Vermont State University–Johnson"],
  "bindestreg i navnet",
);
// Skal give op frem for at gætte.
eq(parseTransfer("Vandt konferencemesterskabet."), null, "ikke en transfersætning");
eq(parseTransfer("Skiftede fra til ."), null, "tomme led");
eq(parseTransfer(""), null, "tom streng");

console.log(`\nparseTransfer: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
