/**
 * Tests for the Danish calque check.
 * Kør: npx tsx pipeline/checks/_danish-calques-test.ts
 */
import { calqueFindings } from "./danish-calques";

let passed = 0, failed = 0;
function ok(cond: boolean, msg: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${msg}`); }
}
const hits = (t: string) => calqueFindings(t).map((f) => f.claim.toLowerCase());

// Fejl fra rigtige kladder
ok(hits("Villads Juma Baden scorede i 2-4-tabet til Longwood").includes("2-4-tabet"), "2-4-tabet flages");
ok(hits("sluttede grundspillet med en 14-5 record").length > 0, "«14-5 record» flages");
ok(hits("Wofford tennis stempler ud med nederlag").includes("stempler ud"), "stempler ud flages");
ok(hits("Marius Stenner nåede 36 kampe og 24 starter").includes("24 starter"), "24 starter flages");
ok(hits("Valdemar Dubin (6’4”, freshman)").length === 1, "feet/inches flages");
ok(hits("Darcey løb 22:41.9").includes("22:41.9"), "decimalpunktum i tid flages");
ok(hits("sin første hat trick").includes("hat trick"), "hat trick flages");

// Korrekt dansk må ikke flages
ok(hits("scorede i 2-4-nederlaget til Longwood").length === 0, "2-4-nederlaget er korrekt");
ok(hits("Post faldt til 0-2-0").length === 0, "«faldt til» om en rekord er korrekt");
ok(hits("14 sejre og 5 nederlag, en hattrick og ny skolerekord").length === 0, "rekord/hattrick er korrekt");
ok(hits("sluttede på en delt 41. plads og delt niendeplads").length === 0, "delt plads er korrekt");
ok(hits("1,93 m og 22:41,9").length === 0, "meter og decimalkomma er korrekt");
ok(hits("").length === 0 && hits(null as unknown as string).length === 0, "tom tekst");

// Fodbold-fælden kræver amerikansk-fodbold-kontekst
ok(hits("Han lavede en touchdown i fodbold-kampen").length === 1, "fodbold + touchdown flages");
ok(hits("Han lavede en touchdown i amerikansk fodbold").length === 0, "amerikansk fodbold er korrekt");
ok(hits("Han scorede i fodboldkampen").length === 0, "ren fodbold uden kontekst flages ikke");

// Dubletter tæller én gang
ok(calqueFindings("2-4-tabet og igen 2-4-tabet").length === 1, "samme fund kun én gang");

console.log(`${passed} bestået, ${failed} fejlet`);
process.exit(failed ? 1 : 0);
