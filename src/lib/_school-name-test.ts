/**
 * Unit-tests for sameInstitution(). Kør: npx tsx src/lib/_school-name-test.ts
 *
 * SAMME-sektionen er de FAKTISKE navnepar der stod som "transfers" i
 * athlete_events 2026-08-25 (54 af 85 begivenheder). FORSKELLIGE-sektionen er
 * de ægte skift fra samme tabel — de skal blive ved med at tælle.
 */
import { sameInstitution } from "./school-name";

let passed = 0;
let failed = 0;

function expect(a: string, b: string, want: boolean): void {
  const got = sameInstitution(a, b);
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ sameInstitution("${a}", "${b}") = ${got}, forventede ${want}`);
  }
}
const same = (a: string, b: string) => expect(a, b, true);
const differs = (a: string, b: string) => expect(a, b, false);

// ── SAMME lærested (de falske "transfers" fra produktionen) ──────────────────
same("Ohio State University", "The Ohio State University");
same("Saint Bonaventure University", "St. Bonaventure University");
same("St. Bonaventure University", "Saint Bonaventure University");
same("University of Texas", "The University of Texas at Austin");
same("University of North Carolina", "University of North Carolina at Chapel Hill");
same("University of Illinois", "University of Illinois Urbana-Champaign");
same("Indiana University", "Indiana University Bloomington");
same("State University of New York at Albany", "University at Albany");
same("University of Vermont", "The University of Vermont and State Agricultural College");
same("UC Davis", "University of California, Davis");
same("Hobart College", "William Smith College");
same("Vermont State University–Castleton", "Vermont State University–Johnson");
same("University of Maryland, Baltimore County", "University of Maryland Baltimore County");

// ── FORSKELLIGE læresteder (de ægte skift — må ikke undertrykkes) ────────────
differs("Virginia Union University", "University of North Carolina at Charlotte");
differs("Penn State University", "University of Nebraska Omaha");
differs("Winthrop University", "Fairfield University");
differs("Jackson State University", "Fort Valley State University");
differs("University of South Alabama", "Lincoln University (MO)");
differs("Alcorn State University", "Northwestern State University of Louisiana");
differs("Oregon State University", "Middle Tennessee State University");
differs("Wagner College", "Southern Methodist University");
differs("University of New Orleans", "University of Maine");
differs("Florida International University", "University of Oklahoma");
differs("Georgia Gwinnett College", "Western Illinois University");
differs("Nicholls State University", "Embry-Riddle Aeronautical University");
differs("Southern Nazarene University", "Wheeling University");
differs("University of Evansville", "Florida Institute of Technology");
differs("California State University, Long Beach", "Kennesaw State University");
differs("Newberry College", "Palm Beach Atlantic University");
differs("Alma College", "Saginaw Valley State University");
differs("The University of Texas at El Paso", "Simon Fraser University");
differs("Queens University of Charlotte", "University of Alabama at Birmingham");
differs("Southern Methodist University", "University of Colorado Boulder");
differs("University of North Carolina at Pembroke", "University of North Florida");
differs("Southern Illinois University Carbondale", "University of South Carolina");
differs("Slippery Rock University", "North Carolina Wesleyan University");

// ── Fælder: "state" er identitet, ikke fyld ─────────────────────────────────
differs("Ohio University", "Ohio State University");
differs("Washington State University", "University of Washington");
differs("University of North Carolina at Chapel Hill", "University of North Carolina at Charlotte");
differs("Miami University", "University of Miami (FL)"); // Ohio vs Florida
differs("Loyola University Maryland", "Loyola University Chicago");

// ── Tomme/ukendte værdier må aldrig producere et skifte ─────────────────────
same("", "University of Texas");
same("University of Texas", "");

console.log(`\nsameInstitution: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
