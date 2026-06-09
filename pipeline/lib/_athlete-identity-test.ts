/**
 * Unit-tests for athlete-identity. Kør: npx tsx pipeline/lib/_athlete-identity-test.ts
 */
import { normalizeIdentity, samePerson } from "./athlete-identity";

let passed = 0;
let failed = 0;

function eq(got: unknown, want: unknown, label: string): void {
  if (got === want) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

// ── normalizeIdentity ────────────────────────────────────────────────────────
eq(normalizeIdentity("Marqus Mitrovic Marion"), "marqus|marion", "mellemnavn fjernet");
eq(normalizeIdentity("Marqus Marion"), "marqus|marion", "uden mellemnavn matcher");
eq(normalizeIdentity("Marqus Marion Jr."), "marqus|marion", "suffiks Jr. fjernet");
eq(normalizeIdentity("Anders Müller"), "anders|muller", "accent normaliseret");
eq(normalizeIdentity("Søren Østergård"), "soeren|oestergaard", "danske tegn → ae/oe/aa");
eq(normalizeIdentity("Cher"), "cher", "enkeltnavn");

// ── samePerson ───────────────────────────────────────────────────────────────
const marionA = { name: "Marqus Mitrovic Marion", sport: "basketball", hometown: null };
const marionB = { name: "Marqus Marion", sport: "basketball", hometown: "Skovlunde, Denmark" };
eq(samePerson(marionA, marionB), true, "Marion: variant + én null hometown → samme");

eq(
  samePerson(
    { name: "Mads Hansen", sport: "fodbold", hometown: "Aarhus, Denmark" },
    { name: "Mads Hansen", sport: "fodbold", hometown: "Aarhus, Denmark" },
  ),
  true,
  "samme navn/sport/by → samme",
);

eq(
  samePerson(
    { name: "Mads Hansen", sport: "fodbold", hometown: "Aarhus, Denmark" },
    { name: "Mads Hansen", sport: "fodbold", hometown: "Odense, Denmark" },
  ),
  false,
  "samme navn men forskellige byer → forskellige personer (ingen fejlmerge)",
);

eq(
  samePerson(
    { name: "Mads Hansen", sport: "fodbold", hometown: "Aarhus" },
    { name: "Mads Hansen", sport: "basketball", hometown: "Aarhus" },
  ),
  false,
  "forskellig sport → forskellige",
);

// Regression: to forskellige danskere, samme for-/efternavn, MODSTRIDENDE mellemnavn,
// begge hometown null (faktiske rækker #38/#40) → må IKKE flettes.
eq(
  samePerson(
    { name: "Oliver Moller-Jensen", sport: "tennis", hometown: null },
    { name: "Oliver Juul Jensen", sport: "tennis", hometown: null },
  ),
  false,
  "Oliver Møller-Jensen ≠ Oliver Juul Jensen (modstridende mellemnavn)",
);

console.log(`\nathlete-identity: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
