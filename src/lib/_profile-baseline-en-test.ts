/**
 * Unit-tests for profile-baseline-en.ts (den engelske profil-grammatik).
 * Kør: npx tsx src/lib/_profile-baseline-en-test.ts
 *
 * Spejler den danske suite: samme statusvarianter, sportsverber og støjfiltre,
 * men låser derudover det ENGELSKE: a/an-artikler, rolle-normalisering
 * ("freestyle swimmer", ikke "freestyle"), "American football" med stort A,
 * "California" (ikke "Californien") og strip af UK-nationssuffikser.
 */
import { baselineProfileEn } from "./profile-baseline-en";
import type { BaselineAthlete } from "./profile-baseline";

let passed = 0;
let failed = 0;

function expectText(a: BaselineAthlete, now: Date, want: string, label: string): void {
  const got = baselineProfileEn(a, now);
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}:\n    fik:       ${got}\n    forventede: ${want}`);
  }
}

const base: BaselineAthlete = {
  name: "Oliver Smith",
  preferred_name: null,
  university: "Ohio State University",
  university_state: "Ohio",
  sport: "soccer",
  position: "Midfielder",
  hometown: "Aldershot, England",
  year_enrolled: 2025,
  expected_graduation: 2029,
  active: 1,
};

const fall25 = new Date(Date.UTC(2025, 9, 15));
const fall26 = new Date(Date.UTC(2026, 9, 15));
const july26 = new Date(Date.UTC(2026, 6, 10));

// ── Statusvarianter ──────────────────────────────────────────────────────────
expectText(base, fall25,
  "Oliver Smith started at Ohio State University in the autumn of 2025 and plays football as a midfielder. Oliver is from Aldershot.",
  "freshman — britisk 'football' for soccer");
expectText(base, fall26,
  "Oliver Smith has played football for Ohio State University in Ohio as a midfielder since 2025. Oliver is from Aldershot.",
  "veteran-formulering fra 2. år");
expectText({ ...base, expected_graduation: 2026 }, july26,
  "Oliver Smith played football for Ohio State University in Ohio as a midfielder and graduated in 2026. Oliver is from Aldershot.",
  "dimitteret efter 1. juni");
expectText({ ...base, active: 0, expected_graduation: null }, fall26,
  "Oliver Smith previously played football for Ohio State University in Ohio as a midfielder. Oliver is from Aldershot.",
  "inaktiv uden dimission");

// ── Manglende felter ─────────────────────────────────────────────────────────
expectText({ ...base, position: null, hometown: null, university_state: null }, fall26,
  "Oliver Smith has played football for Ohio State University since 2025.",
  "uden position/hjemby/stat");
expectText({ ...base, year_enrolled: null }, fall26,
  "Oliver Smith plays football for Ohio State University in Ohio as a midfielder. Oliver is from Aldershot.",
  "uden optagelsesår");

// ── Navne og suffiks-strip ───────────────────────────────────────────────────
expectText({ ...base, preferred_name: "Ollie" }, fall26,
  "Oliver Smith has played football for Ohio State University in Ohio as a midfielder since 2025. Ollie is from Aldershot.",
  "preferred_name i hjemby-sætning");
expectText({ ...base, hometown: "Falkirk, Scotland" }, fall26,
  "Oliver Smith has played football for Ohio State University in Ohio as a midfielder since 2025. Oliver is from Falkirk.",
  "', Scotland' strippes (alle på UK-sitet er fra UK)");
expectText({ ...base, hometown: "Worcester, United Kingdom" }, fall26,
  "Oliver Smith has played football for Ohio State University in Ohio as a midfielder since 2025. Oliver is from Worcester.",
  "', United Kingdom' strippes");
expectText({ ...base, hometown: "Belfast, Northern Ireland" }, fall26,
  "Oliver Smith has played football for Ohio State University in Ohio as a midfielder since 2025. Oliver is from Belfast.",
  "', Northern Ireland' strippes (ikke kun 'Ireland')");
expectText({ ...base, hometown: "Milton Keynes" }, fall26,
  "Oliver Smith has played football for Ohio State University in Ohio as a midfielder since 2025. Oliver is from Milton Keynes.",
  "hjemby uden suffiks bruges råt");

// ── Delstat: engelsk eksonym ─────────────────────────────────────────────────
expectText({ ...base, university_state: "CA" }, fall26,
  "Oliver Smith has played football for Ohio State University in California as a midfielder since 2025. Oliver is from Aldershot.",
  "'California', ikke det danske 'Californien'");
expectText({ ...base, university: "Northern Illinois University", university_state: "IL" }, fall26,
  "Oliver Smith has played football for Northern Illinois University in Illinois as a midfielder since 2025. Oliver is from Aldershot.",
  "delstatsforkortelse skrives helt ud");

// ── a/an-artikler ────────────────────────────────────────────────────────────
expectText({ ...base, sport: "volleyball", position: "OH" }, fall26,
  "Oliver Smith has played volleyball for Ohio State University in Ohio as an outside hitter since 2025. Oliver is from Aldershot.",
  "'an' foran vokal (outside hitter)");
expectText({ ...base, sport: "baseball", position: "UT" }, fall26,
  "Oliver Smith has played baseball for Ohio State University in Ohio as a utility player since 2025. Oliver is from Aldershot.",
  "'a utility player' — u udtales 'ju', ikke 'an'");
expectText({ ...base, sport: "soccer", position: "AM" }, fall26,
  "Oliver Smith has played football for Ohio State University in Ohio as an attacking midfielder since 2025. Oliver is from Aldershot.",
  "'an attacking midfielder'");

// ── Amerikansk fodbold: stort A bevares ──────────────────────────────────────
expectText({ ...base, sport: "football", position: "QB" }, fall26,
  "Oliver Smith has played American football for Ohio State University in Ohio as a quarterback since 2025. Oliver is from Aldershot.",
  "'American football' — egennavn beholder stort bogstav midt i sætningen");

// ── Sportsspecifikke verber ──────────────────────────────────────────────────
const swimmer: BaselineAthlete = { ...base, sport: "swimming-and-diving", position: "Freestyle" };
expectText(swimmer, fall26,
  "Oliver Smith has swum for Ohio State University in Ohio as a freestyle swimmer since 2025. Oliver is from Aldershot.",
  "svømning: 'has swum' + rolle-normalisering 'freestyle swimmer'");
expectText({ ...swimmer, expected_graduation: 2026 }, july26,
  "Oliver Smith swam for Ohio State University in Ohio as a freestyle swimmer and graduated in 2026. Oliver is from Aldershot.",
  "svømning: uregelmæssig datid 'swam'");
expectText({ ...swimmer, position: "Diver" }, fall26,
  "Oliver Smith has swum for Ohio State University in Ohio as a diver since 2025. Oliver is from Aldershot.",
  "udspring: 'diver' er allerede en person-betegnelse");
expectText({ ...swimmer, position: "5'9\"" }, fall26,
  "Oliver Smith has swum for Ohio State University in Ohio since 2025. Oliver is from Aldershot.",
  "svømning: højde i position-feltet er støj → filtreres fra");

const rower: BaselineAthlete = { ...base, sport: "rowing", position: "Coxswain" };
expectText(rower, fall26,
  "Oliver Smith has rowed for Ohio State University in Ohio as a coxswain since 2025. Oliver is from Aldershot.",
  "roning: 'has rowed' + Coxswain bevares");
expectText({ ...rower, position: "Rower" }, fall26,
  "Oliver Smith has rowed for Ohio State University in Ohio since 2025. Oliver is from Aldershot.",
  "roning: generisk 'Rower' filtreres fra (gentager verbet)");
expectText({ ...rower, position: "Port" }, fall26,
  "Oliver Smith has rowed for Ohio State University in Ohio as a port-side rower since 2025. Oliver is from Aldershot.",
  "roning: 'port side' → 'port-side rower'");

const sprinter: BaselineAthlete = { ...base, sport: "track-and-field", position: "Sprints" };
expectText(sprinter, fall26,
  "Oliver Smith has run for Ohio State University in Ohio as a sprinter since 2025. Oliver is from Aldershot.",
  "atletik/løb: 'has run' + 'as a sprinter'");
expectText({ ...sprinter, expected_graduation: 2026 }, july26,
  "Oliver Smith ran for Ohio State University in Ohio as a sprinter and graduated in 2026. Oliver is from Aldershot.",
  "atletik/løb: uregelmæssig datid 'ran'");
expectText({ ...base, sport: "track-and-field", position: "Shot Put" }, fall26,
  "Oliver Smith has competed in the shot put for Ohio State University in Ohio since 2025. Oliver is from Aldershot.",
  "atletik/kast: 'competed in the shot put'");
expectText({ ...base, sport: "track-and-field", position: null }, fall26,
  "Oliver Smith has competed in athletics for Ohio State University in Ohio since 2025. Oliver is from Aldershot.",
  "atletik: ukendt disciplin → 'athletics'-fallback (britisk, ikke 'track and field')");

const gymnast: BaselineAthlete = { ...base, sport: "gymnastics", position: "Vault" };
expectText(gymnast, fall26,
  "Oliver Smith has competed in gymnastics for Ohio State University in Ohio as a vault specialist since 2025. Oliver is from Aldershot.",
  "gymnastik: 'competes in' + redskab → 'vault specialist'");
expectText({ ...gymnast, position: "AA" }, fall26,
  "Oliver Smith has competed in gymnastics for Ohio State University in Ohio as an all-around gymnast since 2025. Oliver is from Aldershot.",
  "gymnastik: 'all-around gymnast', med 'an'");

// ── Kanonisk nøgle + synlig degradering ──────────────────────────────────────
expectText({ ...base, sport: "ice-hockey", position: null }, fall26,
  "Oliver Smith has played ice hockey for Ohio State University in Ohio since 2025. Oliver is from Aldershot.",
  "kanonisk nøgle 'ice-hockey' → 'ice hockey' i sætningen");
expectText({ ...base, sport: "fodbold", position: null }, fall26,
  "Oliver Smith has competed in other for Ohio State University in Ohio since 2025. Oliver is from Aldershot.",
  "efterladt dansk værdi → 'other' (synlig fejl, samme kontrakt som da)");

console.log(`\nprofile-baseline-en: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
