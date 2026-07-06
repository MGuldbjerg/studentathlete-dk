/**
 * Tests for ekspansions-kataloget (rene funktioner).
 * Kør: npx tsx pipeline/catalogue/_catalogue-test.ts
 */

import { marketFor, normalizeNameKey } from "./country-language";
import {
  summarize, buildUpsert, MAX_UPSERT_ROWS, UPSERT_COLS, D1_MAX_VARS,
  type CatalogueAthlete,
} from "./catalogue-international";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function eq<T>(actual: T, expected: T, msg: string): void {
  assert(actual === expected, `${msg} (fik ${JSON.stringify(actual)}, ville have ${JSON.stringify(expected)})`);
}

// ── marketFor ──────────────────────────────────────────────────────────
eq(marketFor("Denmark").region, "Nordics", "Denmark → Nordics");
eq(marketFor("Denmark").language, "Danish", "Denmark → Danish");
// Engelsk spænder flere regioner, men samme redaktionelle enhed
eq(marketFor("UK").language, "English", "UK → English");
eq(marketFor("Australia").language, "English", "Australia → English");
eq(marketFor("Nigeria").language, "English", "Nigeria → English (anglophone)");
assert(marketFor("UK").region !== marketFor("Australia").region, "UK og Australia er forskellige regioner");
// Spansk: Spanien standalone-kandidat, Latinamerika = pool
eq(marketFor("Spain").region, "Spain", "Spain → egen region");
eq(marketFor("Panama").language, "Unknown", "Panama er ikke i country-normalize endnu → Unknown (forfines ved launch)");
eq(marketFor("Argentina").region, "Latin America", "Argentina → Latin America pool");
eq(marketFor("Mexico").language, "Spanish", "Mexico → Spanish");
// Tysk pool
eq(marketFor("Germany").region, "DACH", "Germany → DACH");
eq(marketFor("Austria").region, "DACH", "Austria → DACH");
// Ukendt land → Unknown fallback (crasher ikke)
eq(marketFor("Narnia").language, "Unknown", "ukendt land → Unknown");
eq(marketFor("Narnia").region, "Unknown", "ukendt land → Unknown region");

// ── normalizeNameKey ───────────────────────────────────────────────────
eq(normalizeNameKey("  Malene  Lind   Pedersen "), "malene lind pedersen", "trim + collapse whitespace");
eq(normalizeNameKey("OLIVER Møller-Jensen"), "oliver møller-jensen", "lowercase bevarer diakritik/bindestreg");

// ── summarize ──────────────────────────────────────────────────────────
const mk = (name: string, country: string, sport: string, school = "X"): CatalogueAthlete => {
  const { language, region } = marketFor(country);
  return {
    name, nameKey: normalizeNameKey(name), homeCountry: country, language, region,
    hometown: null, school, schoolId: 1, division: "NCAA D1", sport, position: null,
    bioUrl: null, rosterUrl: "http://x",
  };
};
const sample = [
  mk("A A", "Denmark", "soccer"),
  mk("B B", "Sweden", "soccer"),
  mk("C C", "Spain", "tennis"),
  mk("D D", "Mexico", "tennis"),
  mk("E E", "Argentina", "golf"),
];
const s = summarize(sample);
eq(s.byRegion["Nordics"], 2, "Nordics = 2 (DK+SE)");
eq(s.byRegion["Latin America"], 2, "Latin America = 2 (MX+AR)");
eq(s.byLanguage["Spanish"], 3, "Spanish = 3 (ES+MX+AR — én redaktør)");
eq(s.byCountry["Denmark"], 1, "Denmark = 1");
eq(s.bySport["soccer"], 2, "soccer = 2 (DK+SE)");
eq(s.bySport["tennis"], 2, "tennis = 2 (ES+MX)");

// ── buildUpsert ────────────────────────────────────────────────────────
const up = buildUpsert([sample[0], sample[1]], "2026-07-06 10:00:00");
eq(up.params.length, 28, "2 rækker × 14 params = 28");
assert(up.sql.includes("ON CONFLICT(name_key, school, sport)"), "upsert har conflict-target");
assert(up.sql.includes("last_seen = excluded.last_seen"), "upsert opdaterer last_seen");
assert((up.sql.match(/\(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)/g) ?? []).length === 2, "2 værdi-tupler");
// first_seen må ALDRIG overskrives ved konflikt (kun ved insert via DEFAULT)
assert(!up.sql.includes("first_seen ="), "first_seen røres ikke ved upsert");

// D1 100-var-grænse: en fuld chunk må ALDRIG overskride 100 bundne params
// (regression-værn mod den bug live-run afslørede — 30 rækker = 420 params = 400-fejl)
eq(UPSERT_COLS, 14, "UPSERT_COLS matcher VALUES-tuple");
const fullChunk = Array.from({ length: MAX_UPSERT_ROWS }, () => sample[0]);
assert(buildUpsert(fullChunk, "2026-07-06 10:00:00").params.length <= D1_MAX_VARS,
  `fuld chunk (${MAX_UPSERT_ROWS} rækker) holder sig under D1's ${D1_MAX_VARS}-var-grænse`);

// ── Resultat ───────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
