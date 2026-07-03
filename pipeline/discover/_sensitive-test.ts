/**
 * Unit-tests for detectSensitive(). Kør: npx tsx pipeline/discover/_sensitive-test.ts
 *
 * Positive tilfælde pr. kategori + sports-idiomer der IKKE må flagges
 * (sudden death-overtid, eligibility remaining, basketball court).
 */
import { detectSensitive, type SensitiveType } from "./sensitive";

let passed = 0;
let failed = 0;

function expectType(text: string | null, want: SensitiveType | null, label: string): void {
  const got = detectSensitive(text)?.type ?? null;
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: detectSensitive(${JSON.stringify(text)}) = ${got}, forventede ${want}`);
  }
}

// ── crime ────────────────────────────────────────────────────────────────────
expectType("Star quarterback arrested on DUI charge after loss", "crime", "anholdelse");
expectType("Former guard charged with assault in offseason incident", "crime", "sigtelse");
expectType("Player faces charges following campus incident", "crime", "faces charges");
expectType("Police investigating incident involving two players", "crime", "politiefterforskning");

// ── discipline ───────────────────────────────────────────────────────────────
expectType("Two players suspended for violation of team rules", "discipline", "suspension");
expectType("Senior dismissed from team after internal review", "discipline", "smidt af holdet");
expectType("NCAA violation costs program two scholarships", "discipline", "NCAA violation");

// ── crime vinder over discipline (prioritet) ─────────────────────────────────
expectType("Player suspended after being arrested", "crime", "crime prioriteres over discipline");

// ── eligibility ──────────────────────────────────────────────────────────────
expectType("Starting center ruled ineligible for spring semester", "eligibility", "ruled ineligible");
expectType("Freshman academically ineligible after fall grades", "eligibility", "academically ineligible");
expectType("Guard placed on academic probation", "eligibility", "academic probation");

// ── personal ─────────────────────────────────────────────────────────────────
expectType("Program mourns the death of former coach", "personal", "dødsfald");
expectType("Team captain hospitalized after collision", "personal", "indlæggelse");
expectType("Star opens up about mental health struggles", "personal", "mentalt helbred");

// ── Må IKKE flagges (rutine-sportssprog) ─────────────────────────────────────
expectType("Jensen wins playoff in sudden death on the 18th hole", null, "sudden death = overtid (golf)");
expectType("Hansen scores in sudden-death overtime thriller", null, "sudden-death OT (hockey)");
expectType("Madsen has two years of eligibility remaining", null, "eligibility remaining = rutine");
expectType("Nielsen dominates on the court in win over Duke", null, "basketball court");
expectType("Pedersen suffers season-ending injury, out for the year", null, "skade = normal dækning");
expectType("Sørensen undergoes successful knee surgery", null, "operation = normal dækning");
expectType("Larsen named player of the week after big win", null, "hædersbevisning");
expectType("", null, "tom streng");
expectType(null, null, "null");

// ── Resultat ─────────────────────────────────────────────────────────────────
console.log(`\nsensitive: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
