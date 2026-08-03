/**
 * Unit-tests for athlete-identity. Kør: npx tsx pipeline/lib/_athlete-identity-test.ts
 */
import {
  normalizeIdentity,
  samePerson,
  rosterKey,
  rosterVerdict,
  mergeCandidate,
  type CandidateRow,
} from "./athlete-identity";

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

// ── rosterKey (skolens eget spiller-id) ──────────────────────────────────────
eq(
  rosterKey("http://www.nmstatesports.com/sports/womens-soccer/roster/filucca-daugaard/11192"),
  "nmstatesports.com#11192",
  "Sidearm-id udtrukket, www strippet",
);
eq(
  rosterKey("https://nmstatesports.com/sports/womens-soccer/roster/filucca-andersen/11192"),
  "nmstatesports.com#11192",
  "samme id trods andet navn i URL'en (navnedelen er dekorativ)",
);
eq(
  rosterKey("https://gopsusports.com/sports/womens-soccer/roster/player/dikte-bang"),
  null,
  "ingen numerisk id → ingen nøgle (falder tilbage på navne-match)",
);
eq(
  rosterKey("https://miamihurricanes.com/sports/golf/roster/season/2026-27/player/anna-behnsen/"),
  null,
  "sæson-URL uden id → ingen nøgle",
);
eq(
  rosterKey("https://eksempel.com/sports/fodbold/roster/2026"),
  null,
  "årstal lige efter /roster/ er ikke et spiller-id (ellers fletter vi tilfældige atleter)",
);
eq(rosterKey(null), null, "null bio_url");
eq(rosterKey("ikke en url"), null, "ugyldig URL");

// ── rosterVerdict ────────────────────────────────────────────────────────────
const daugaard = { bio_url: "http://www.nmstatesports.com/sports/womens-soccer/roster/filucca-daugaard/11192" };
const andersen = { bio_url: "https://nmstatesports.com/sports/womens-soccer/roster/filucca-andersen/11192" };
eq(rosterVerdict(daugaard, andersen), "same", "samme id → samme person");
eq(
  rosterVerdict(daugaard, {
    bio_url: "https://nmstatesports.com/sports/womens-soccer/roster/anden-spiller/11193",
  }),
  "different",
  "samme skole, andet id → forskellige personer",
);
eq(
  rosterVerdict(daugaard, {
    bio_url: "https://etsubucs.com/sports/womens-soccer/roster/filucca-daugaard/7713",
  }),
  "unknown",
  "andet id på ANDEN skole → uafgjort (kan være skoleskift)",
);
eq(rosterVerdict(daugaard, { bio_url: null }), "unknown", "kun én har nøgle → uafgjort");

// ── samePerson med spiller-id ────────────────────────────────────────────────
// Den faktiske sag: skolen ændrede efternavnet. Navne-match kan aldrig fange den,
// og hometown-vagten ville endda have blokeret en fletning.
eq(
  samePerson(
    { name: "Filucca Daugaard", sport: "fodbold", hometown: "Denmark", ...daugaard },
    { name: "Filucca Andersen", sport: "fodbold", hometown: "Horsens, Denmark", ...andersen },
  ),
  true,
  "Filucca: forskelligt efternavn OG forskelligt hometown, men samme spiller-id → samme",
);
eq(
  samePerson(
    { name: "Mads Hansen", sport: "fodbold", hometown: null, bio_url: "https://x.com/sports/fodbold/roster/mads-hansen/1" },
    { name: "Mads Hansen", sport: "fodbold", hometown: null, bio_url: "https://x.com/sports/fodbold/roster/mads-hansen-ii/2" },
  ),
  false,
  "identisk navn men to spiller-id'er på samme skole → to personer",
);

// Manuel navnerettelse må ikke skabe en dublet ved næste scrape.
eq(
  samePerson(
    { name: "Malthe Bøgebjerg", roster_name: "Malthe Bogebjerg", sport: "atletik", hometown: "Denmark" },
    { name: "Malthe Bogebjerg", sport: "atletik", hometown: "Denmark" },
  ),
  true,
  "rettet visningsnavn matcher stadig skolens stavemåde via roster_name",
);
eq(
  samePerson(
    { name: "Malthe Bøgebjerg", sport: "atletik", hometown: "Denmark" },
    { name: "Malthe Bogebjerg", sport: "atletik", hometown: "Denmark" },
  ),
  false,
  "uden roster_name matcher ø-formen ikke o-formen (derfor gemmes skolens stavemåde)",
);

// ── mergeCandidate (kø til menneskelig afgørelse) ────────────────────────────
const base: CandidateRow = {
  id: 1, name: "Filucca Daugaard", sport: "fodbold", hometown: "Denmark",
  university: "New Mexico State University", class_year: "Fr.", position: null, bio_url: null,
};
const other: CandidateRow = {
  ...base, id: 2, name: "Filucca Andersen", hometown: "Horsens, Denmark", position: "Midfielder",
};
eq(
  mergeCandidate(base, other) !== null,
  true,
  "samme skole/sport/årgang + samme fornavn + forenelig hjemby → kandidat",
);
eq(
  mergeCandidate(base, { ...other, university: "Anden skole" }),
  null,
  "forskellig skole → ikke en kandidat",
);
eq(
  mergeCandidate(base, { ...other, name: "Sofie Jensen" }),
  null,
  "hverken for- eller efternavn deles → ikke en kandidat",
);
eq(
  mergeCandidate(
    { ...base, hometown: "Aarhus, Denmark" },
    { ...other, hometown: "Odense, Denmark" },
  ),
  null,
  "to forskellige byer → ikke en kandidat",
);
eq(
  mergeCandidate({ ...base, bio_url: daugaard.bio_url }, { ...other, bio_url: andersen.bio_url }),
  null,
  "afgjort af spiller-id (flettes automatisk) → ikke i kø",
);

console.log(`\nathlete-identity: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
