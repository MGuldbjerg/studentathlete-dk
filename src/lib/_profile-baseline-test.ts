/**
 * Unit-tests for profile-baseline.ts. Kør: npx tsx src/lib/_profile-baseline-test.ts
 */
import { baselineProfile, currentSeasonStart, type BaselineAthlete } from "./profile-baseline";

let passed = 0;
let failed = 0;

function expectText(a: BaselineAthlete, now: Date, want: string, label: string): void {
  const got = baselineProfile(a, now);
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}:\n    fik:       ${got}\n    forventede: ${want}`);
  }
}

const base: BaselineAthlete = {
  name: "Mikkel Jensen",
  preferred_name: null,
  university: "Ohio State University",
  university_state: "Ohio",
  sport: "Fodbold",
  position: "Midfielder",
  hometown: "Aarhus, Denmark",
  year_enrolled: 2025,
  expected_graduation: 2029,
  active: 1,
};

// Midt i efterårssæsonen 2025-26
const fall25 = new Date(Date.UTC(2025, 9, 15));
// Foråret i samme akademiske år (sæsonstart stadig 2025)
const spring26 = new Date(Date.UTC(2026, 2, 15));
// Efterår i atletens 2. år
const fall26 = new Date(Date.UTC(2026, 9, 15));

// ── Sæsonstart ───────────────────────────────────────────────────────────────
if (currentSeasonStart(fall25) === 2025) passed++; else { failed++; console.error("  ✗ sæsonstart efterår"); }
if (currentSeasonStart(spring26) === 2025) passed++; else { failed++; console.error("  ✗ sæsonstart forår = forrige år"); }
if (currentSeasonStart(new Date(Date.UTC(2026, 6, 1))) === 2026) passed++; else { failed++; console.error("  ✗ 1. juli = ny sæson"); }

// ── Freshman ─────────────────────────────────────────────────────────────────
expectText(base, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som Midfielder. Mikkel kommer fra Aarhus.",
  "freshman i efteråret");
expectText(base, spring26,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som Midfielder. Mikkel kommer fra Aarhus.",
  "freshman-fasen holder hele det akademiske år");

// ── Veteran (2.+ år) ─────────────────────────────────────────────────────────
expectText(base, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University i Ohio som Midfielder. Mikkel kommer fra Aarhus.",
  "veteran-formulering fra 2. år");

// ── Manglende felter ─────────────────────────────────────────────────────────
expectText({ ...base, position: null, hometown: null, university_state: null }, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University.",
  "uden position/hjemby/stat");
expectText({ ...base, year_enrolled: null }, fall26,
  "Mikkel Jensen spiller fodbold for Ohio State University i Ohio som Midfielder. Mikkel kommer fra Aarhus.",
  "uden optagelsesår");

// ── Status-varianter ─────────────────────────────────────────────────────────
expectText({ ...base, expected_graduation: 2026 }, new Date(Date.UTC(2026, 6, 10)),
  "Mikkel Jensen spillede fodbold for Ohio State University i Ohio som Midfielder og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "dimitteret efter 1. juni");
expectText({ ...base, expected_graduation: 2026 }, new Date(Date.UTC(2030, 0, 1)),
  "Mikkel Jensen spillede fodbold for Ohio State University i Ohio som Midfielder og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "datid bevares år efter dimission (udenfor badge-vindue)");
expectText({ ...base, active: 0, expected_graduation: null }, fall26,
  "Mikkel Jensen spillede tidligere fodbold for Ohio State University i Ohio som Midfielder. Mikkel kommer fra Aarhus.",
  "inaktiv uden dimission");

// ── Navne og tekstdetaljer ───────────────────────────────────────────────────
expectText({ ...base, preferred_name: "Mikki" }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som Midfielder. Mikki kommer fra Aarhus.",
  "preferred_name i hjemby-sætning");
expectText({ ...base, hometown: "Copenhagen, Denmark" }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som Midfielder. Mikkel kommer fra Copenhagen.",
  "landesuffiks strippes");
expectText({ ...base, hometown: "Aarhus" }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som Midfielder. Mikkel kommer fra Aarhus.",
  "hjemby uden suffiks bruges råt");
expectText({ ...base, sport: "Ishockey", position: null }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller ishockey. Mikkel kommer fra Aarhus.",
  "sport dekapitaliseres");

// ── Delstat + beskidt roster-position ────────────────────────────────────────
expectText({ ...base, university: "Northern Illinois University", university_state: "IL" }, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Northern Illinois University i Illinois som Midfielder. Mikkel kommer fra Aarhus.",
  "delstatsforkortelse skrives helt ud");
expectText({ ...base, university_state: "CA" }, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University i Californien som Midfielder. Mikkel kommer fra Aarhus.",
  "dansk eksonym for Californien");
expectText(
  { ...base, position: "Midfielder\n\t\t\t                            \n\t\t\t\t                            M" },
  fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University i Ohio som Midfielder. Mikkel kommer fra Aarhus.",
  "flerlinjet Sidearm-position → kun første linje");

console.log(`\nprofile-baseline: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
