/**
 * Tests for hvilket skolenavn vi SKRIVER.
 * Kør: npx tsx src/lib/_school-display-name-test.ts
 *
 * Mikkel, 2026-08-29: «a school could have multiple names — make sure we use
 * the common name.» Faren er ikke at navnet er langt; det er at en mekanisk
 * forkortelse flytter atleten til et andet lærested.
 */

import { displaySchoolName, looksMangled, nameContainsState } from "./school-display-name";

let passed = 0;
let failed = 0;

function eq(actual: string, expected: string, msg: string): void {
  if (actual === expected) { passed++; }
  else { failed++; console.error(`  ✗ ${msg} (fik "${actual}", ville have "${expected}")`); }
}
function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; } else { failed++; console.error(`  ✗ ${msg}`); }
}

// ── Mikkels eget eksempel ──────────────────────────────────────────────
eq(displaySchoolName("University of North Carolina at Chapel Hill", "North Carolina"),
   "North Carolina", "UNC Chapel Hill → North Carolina");

// ── ⚠️ Campus-suffikset er IKKE støj — det er identitet ────────────────
// En mekanisk «klip alt efter at» ville flytte disse atleter til et andet sted.
eq(displaySchoolName("University of Alabama at Birmingham", "UAB"), "UAB",
   "UAB må ALDRIG blive til University of Alabama");
eq(displaySchoolName("University of North Carolina at Asheville", "UNC Asheville"),
   "UNC Asheville", "UNC Asheville er ikke UNC");
eq(displaySchoolName("University of Louisiana at Monroe", "ULM"), "ULM",
   "ULM er ikke University of Louisiana");
eq(displaySchoolName("University of North Carolina at Pembroke", "University of North Carolina at Pembroke"),
   "UNC Pembroke", "UNC Pembroke er ikke UNC");

// ── Kuraterede navne slår common_name ──────────────────────────────────
eq(displaySchoolName("State University of New York at Cortland", "State of New York at Cortland"),
   "SUNY Cortland", "kurateret navn vinder over et ødelagt common_name");
eq(displaySchoolName("California State University, Los Angeles", "California State, Los Angeles"),
   "Cal State LA", "Cal State LA");
eq(displaySchoolName("Claremont McKenna College, Harvey Mudd College, and Scripps College",
                     "Claremont McKenna, Harvey Mudd, and Scripps"),
   "Claremont-Mudd-Scripps", "de tre colleges deler ét atletikprogram");

// ── common_name bruges når den ser hel ud ──────────────────────────────
eq(displaySchoolName("The Ohio State University", "Ohio State"), "Ohio State", "Ohio State");
eq(displaySchoolName("The University of Vermont and State Agricultural College", "Vermont"),
   "Vermont", "Vermont");
eq(displaySchoolName("The College of William and Mary in Virginia", "William & Mary"),
   "William & Mary", "William & Mary");

// ── Ødelagte navne må aldrig vises ─────────────────────────────────────
assert(looksMangled("State of New York at Canton"), "«State of New York at …» er ødelagt");
assert(looksMangled("University of Virginia's at Wise"), "«Virginia's at Wise» er ødelagt");
assert(looksMangled("of the Holy Cross"), "navn der begynder med «of» er ødelagt");
assert(looksMangled(""), "tomt navn er ødelagt");
assert(!looksMangled("Ohio State"), "et helt navn er ikke ødelagt");
assert(!looksMangled("UNC Asheville"), "forkortelse er ikke ødelagt");
assert(!looksMangled("University of Chicago"), "«University of X» er et rigtigt brugsnavn");

// Uden override OG med ødelagt common_name → det officielle navn, aldrig et gæt.
eq(displaySchoolName("Some University at Nowhere", "State of Nowhere at"),
   "Some University at Nowhere", "ukendt + ødelagt → officielt navn");
eq(displaySchoolName("Independent College", null), "Independent College",
   "intet common_name → officielt navn");
eq(displaySchoolName(null, null), "", "intet navn → tom streng");

// ── Delstats-dubletten ─────────────────────────────────────────────────
assert(nameContainsState("North Carolina", "North Carolina"), "North Carolina i North Carolina");
assert(nameContainsState("Texas", "Texas"), "Texas i Texas");
assert(nameContainsState("California", "California"), "California i California");
assert(!nameContainsState("Ohio State", "Ohio"), "«Ohio State i Ohio» er FINT — det er to ting");
assert(!nameContainsState("Buffalo", "New York"), "Buffalo i New York er fint");
assert(!nameContainsState("UAB", "Alabama"), "UAB i Alabama er fint");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
