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
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som midtbanespiller. Mikkel kommer fra Aarhus.",
  "freshman i efteråret");
expectText(base, spring26,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som midtbanespiller. Mikkel kommer fra Aarhus.",
  "freshman-fasen holder hele det akademiske år");

// ── Veteran (2.+ år) ─────────────────────────────────────────────────────────
expectText(base, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University i Ohio som midtbanespiller. Mikkel kommer fra Aarhus.",
  "veteran-formulering fra 2. år");

// ── Manglende felter ─────────────────────────────────────────────────────────
expectText({ ...base, position: null, hometown: null, university_state: null }, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University.",
  "uden position/hjemby/stat");
expectText({ ...base, year_enrolled: null }, fall26,
  "Mikkel Jensen spiller fodbold for Ohio State University i Ohio som midtbanespiller. Mikkel kommer fra Aarhus.",
  "uden optagelsesår");

// ── Status-varianter ─────────────────────────────────────────────────────────
expectText({ ...base, expected_graduation: 2026 }, new Date(Date.UTC(2026, 6, 10)),
  "Mikkel Jensen spillede fodbold for Ohio State University i Ohio som midtbanespiller og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "dimitteret efter 1. juni");
expectText({ ...base, expected_graduation: 2026 }, new Date(Date.UTC(2030, 0, 1)),
  "Mikkel Jensen spillede fodbold for Ohio State University i Ohio som midtbanespiller og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "datid bevares år efter dimission (udenfor badge-vindue)");
expectText({ ...base, active: 0, expected_graduation: null }, fall26,
  "Mikkel Jensen spillede tidligere fodbold for Ohio State University i Ohio som midtbanespiller. Mikkel kommer fra Aarhus.",
  "inaktiv uden dimission");

// ── Navne og tekstdetaljer ───────────────────────────────────────────────────
expectText({ ...base, preferred_name: "Mikki" }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som midtbanespiller. Mikki kommer fra Aarhus.",
  "preferred_name i hjemby-sætning");
expectText({ ...base, hometown: "Copenhagen, Denmark" }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som midtbanespiller. Mikkel kommer fra Copenhagen.",
  "landesuffiks strippes");
expectText({ ...base, hometown: "Aarhus" }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller fodbold som midtbanespiller. Mikkel kommer fra Aarhus.",
  "hjemby uden suffiks bruges råt");
expectText({ ...base, sport: "Ishockey", position: null }, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og spiller ishockey. Mikkel kommer fra Aarhus.",
  "sport dekapitaliseres");

// ── Delstat + beskidt roster-position ────────────────────────────────────────
expectText({ ...base, university: "Northern Illinois University", university_state: "IL" }, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Northern Illinois University i Illinois som midtbanespiller. Mikkel kommer fra Aarhus.",
  "delstatsforkortelse skrives helt ud");
expectText({ ...base, university_state: "CA" }, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University i Californien som midtbanespiller. Mikkel kommer fra Aarhus.",
  "dansk eksonym for Californien");
expectText(
  { ...base, position: "Midfielder\n\t\t\t                            \n\t\t\t\t                            M" },
  fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University i Ohio som midtbanespiller. Mikkel kommer fra Aarhus.",
  "flerlinjet Sidearm-position → kun første linje");

// ── Sportsspecifikke verber (Mikkel 2026-07-08: ikke alt er "spillet X") ─────
// Position vises stadig når den er ægte information (svømmestil, Coxswain) —
// kun højde-værdier og den generiske pladsholder "Rower" filtreres fra.
const swimmer: BaselineAthlete = { ...base, sport: "Svømning", position: "Freestyle" };
expectText(swimmer, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og svømmer som freestyle. Mikkel kommer fra Aarhus.",
  "svømning: freshman — svømmestil bevares");
expectText(swimmer, fall26,
  "Mikkel Jensen har siden 2025 svømmet for Ohio State University i Ohio som freestyle. Mikkel kommer fra Aarhus.",
  "svømning: veteran — 'har svømmet for', ikke 'spillet svømning'");
expectText({ ...swimmer, expected_graduation: 2026 }, new Date(Date.UTC(2026, 6, 10)),
  "Mikkel Jensen svømmede for Ohio State University i Ohio som freestyle og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "svømning: dimitteret — preteritum 'svømmede'");
expectText({ ...swimmer, active: 0, expected_graduation: null }, fall26,
  "Mikkel Jensen svømmede tidligere for Ohio State University i Ohio som freestyle. Mikkel kommer fra Aarhus.",
  "svømning: inaktiv");
expectText({ ...swimmer, position: "5'9\"" }, fall26,
  "Mikkel Jensen har siden 2025 svømmet for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "svømning: højde i position-feltet er støj → filtreres fra");

const rower: BaselineAthlete = { ...base, sport: "Roning", position: "Coxswain" };
expectText(rower, fall26,
  "Mikkel Jensen har siden 2025 roet for Ohio State University i Ohio som styrmand. Mikkel kommer fra Aarhus.",
  "roning: veteran — 'roet', ikke 'spillet roning'; Coxswain bevares (ægte rolle)");
expectText({ ...rower, expected_graduation: 2026 }, new Date(Date.UTC(2026, 6, 10)),
  "Mikkel Jensen roede for Ohio State University i Ohio som styrmand og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "roning: dimitteret — preteritum 'roede'");
expectText({ ...rower, position: "Rower" }, fall26,
  "Mikkel Jensen har siden 2025 roet for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "roning: generisk 'Rower'-pladsholder filtreres fra (gentager verbet)");
expectText({ ...rower, position: "6'7\"" }, fall26,
  "Mikkel Jensen har siden 2025 roet for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "roning: højde i position-feltet er støj → filtreres fra");
expectText({ ...rower, position: "Varsity" }, fall26,
  "Mikkel Jensen har siden 2025 roet for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "roning: 'Varsity' er holdniveau, ikke en rolle → filtreres fra");

const sprinter: BaselineAthlete = { ...base, sport: "Atletik", position: "Sprints" };
expectText(sprinter, fall25,
  "Mikkel Jensen startede på Ohio State University i efteråret 2025 og løber som sprinter. Mikkel kommer fra Aarhus.",
  "atletik/løb: freshman — disciplin oversat til rolle ('som sprinter')");
expectText(sprinter, fall26,
  "Mikkel Jensen har siden 2025 løbet for Ohio State University i Ohio som sprinter. Mikkel kommer fra Aarhus.",
  "atletik/løb: veteran — 'løbet', ikke 'spillet atletik'");
expectText({ ...sprinter, expected_graduation: 2026 }, new Date(Date.UTC(2026, 6, 10)),
  "Mikkel Jensen løb for Ohio State University i Ohio som sprinter og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "atletik/løb: dimitteret — preteritum 'løb' (uregelmæssigt verbum)");
expectText({ ...base, sport: "Atletik", position: "Middle Distance" }, fall26,
  "Mikkel Jensen har siden 2025 løbet for Ohio State University i Ohio som mellemdistanceløber. Mikkel kommer fra Aarhus.",
  "atletik/løb: 'Middle Distance' → 'mellemdistanceløber' (matcher Mikkels egen redigering)");

const shotputter: BaselineAthlete = { ...base, sport: "Atletik", position: "Shot Put" };
expectText(shotputter, fall26,
  "Mikkel Jensen har siden 2025 kæmpet i kuglestød for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "atletik/kast: kuglestød oversat + 'kæmpet i'");
expectText({ ...shotputter, expected_graduation: 2026 }, new Date(Date.UTC(2026, 6, 10)),
  "Mikkel Jensen kæmpede i kuglestød for Ohio State University i Ohio og dimitterede i 2026. Mikkel kommer fra Aarhus.",
  "atletik/kast: dimitteret — preteritum 'kæmpede i'");

const jumper: BaselineAthlete = { ...base, sport: "Atletik", position: "Long Jump" };
expectText(jumper, fall26,
  "Mikkel Jensen har siden 2025 kæmpet i længdespring for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "atletik/spring: længdespring oversat");

const unknownDiscipline: BaselineAthlete = { ...base, sport: "Atletik", position: null };
expectText(unknownDiscipline, fall26,
  "Mikkel Jensen har siden 2025 dyrket atletik for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "atletik: ukendt disciplin → 'dyrket atletik'-fallback");

const gymnast: BaselineAthlete = { ...base, sport: "Gymnastik", position: null };
expectText(gymnast, fall26,
  "Mikkel Jensen har siden 2025 dyrket gymnastik for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "gymnastik: 'dyrket', ikke 'spillet'");

// ── DB gemmer sport med SMÅ forbogstaver ("atletik", "svømning", …) — ikke
// SPORTS[].label-casingen. sportVerb skal matche produktions-casingen. ────────
expectText({ ...base, sport: "fodbold" }, fall26,
  "Mikkel Jensen har siden 2025 spillet fodbold for Ohio State University i Ohio som midtbanespiller. Mikkel kommer fra Aarhus.",
  "reel DB-casing: 'fodbold' (småt) matcher boldspil");
expectText({ ...base, sport: "svømning", position: null }, fall26,
  "Mikkel Jensen har siden 2025 svømmet for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "reel DB-casing: 'svømning' (småt) matcher svømme-verbet");
expectText({ ...base, sport: "roning", position: null }, fall26,
  "Mikkel Jensen har siden 2025 roet for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "reel DB-casing: 'roning' (småt) matcher ro-verbet");
expectText({ ...base, sport: "atletik", position: "Sprints" }, fall26,
  "Mikkel Jensen har siden 2025 løbet for Ohio State University i Ohio som sprinter. Mikkel kommer fra Aarhus.",
  "reel DB-casing: 'atletik' (småt) matcher løbe-verbet");
expectText({ ...base, sport: "volleyball", position: null }, fall26,
  "Mikkel Jensen har siden 2025 spillet volleyball for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "volleyball er boldspil (fandtes i DB, men manglede i BALL_SPORTS)");
expectText({ ...base, sport: "andet", position: null }, fall26,
  "Mikkel Jensen har siden 2025 dyrket andet for Ohio State University i Ohio. Mikkel kommer fra Aarhus.",
  "'andet' (diverse-kategori i DB) rammer dyrke-fallback, ikke spille");

console.log(`\nprofile-baseline: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
