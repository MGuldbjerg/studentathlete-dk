/**
 * Tests for bogstav-opdelingen af atlet-oversigten.
 * Kør: npx tsx src/lib/_athlete-letters-test.ts
 */

import {
  letterOf,
  letterSlug,
  letterFromSlug,
  alphabetFor,
  countByLetter,
  athletesForLetter,
  getAthleteLetterUrl,
  athletesAllPath,
} from "./athlete-letters";
import type { Athlete } from "./types";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function eq<T>(actual: T, expected: T, msg: string): void {
  assert(actual === expected, `${msg} (fik ${JSON.stringify(actual)}, ville have ${JSON.stringify(expected)})`);
}

function athlete(name: string): Athlete {
  return { id: 1, name, slug: "x", sport: "soccer", university: "U" } as Athlete;
}

// ── Alfabetet er sprogets, ikke en A-Z-løkke ───────────────────────────
eq(alphabetFor("en").length, 26, "engelsk alfabet har 26 bogstaver");
eq(alphabetFor("da").length, 29, "dansk alfabet har 29 bogstaver");
eq(alphabetFor("da").at(-1), "Å", "dansk slutter på Å");
assert(!alphabetFor("en").includes("Ø"), "engelsk har ikke Ø");

// ── Forbogstav ─────────────────────────────────────────────────────────
eq(letterOf("Aaliah Barwick", "en"), "A", "engelsk forbogstav");
eq(letterOf("Østergaard Nielsen", "da"), "Ø", "dansk Ø bevares som versal");
eq(letterOf("  mikkel", "da"), "M", "trimmes og versaliseres");
eq(letterOf("", "da"), "", "tomt navn giver tom streng");
eq(letterOf(null, "da"), "", "null giver tom streng");

// ── Slug og tilbage igen ───────────────────────────────────────────────
eq(letterSlug("A", "en"), "a", "A → a");
eq(letterSlug("Ø", "da"), "oe", "Ø → oe (samme translitteration som atlet-slugs)");
eq(letterSlug("Æ", "da"), "ae", "Æ → ae");
eq(letterSlug("Å", "da"), "aa", "Å → aa");
eq(letterFromSlug("a", "en"), "A", "a → A");
eq(letterFromSlug("oe", "da"), "Ø", "oe → Ø");
eq(letterFromSlug("A", "en"), "A", "store bogstaver i adressen accepteres");

// Kun bogstaver der FINDES i sprogets alfabet — ellers ville enhver streng
// blive en tom bogstavside der findes på hver eneste adresse.
eq(letterFromSlug("oe", "en"), null, "oe findes ikke i engelsk alfabet");
eq(letterFromSlug("mikkel-guldbjerg", "da"), null, "en atlet-slug er ikke et bogstav");
eq(letterFromSlug("", "da"), null, "tom slug er intet bogstav");
eq(letterFromSlug("42", "da"), null, "tal er intet bogstav");

// ── Adressen ───────────────────────────────────────────────────────────
eq(getAthleteLetterUrl("A", "en"), "/athletes/a", "engelsk bogstavside");
eq(getAthleteLetterUrl("A", "da"), "/atleter/a", "dansk bogstavside");
eq(getAthleteLetterUrl("Ø", "da"), "/atleter/oe", "dansk Ø-side er ASCII i adressen");

// ── Optælling og opdeling ──────────────────────────────────────────────
const roster = [
  athlete("Anna Andersen"),
  athlete("Anders Bo"),
  athlete("Bea Carlsen"),
  athlete("Østergaard Nielsen"),
];
const counts = countByLetter(roster, "da");
eq(counts.get("A"), 2, "to A-navne");
eq(counts.get("B"), 1, "ét B-navn");
eq(counts.get("Ø"), 1, "ét Ø-navn");
eq(counts.get("Z"), undefined, "bogstav uden atleter mangler i kortet");

eq(athletesForLetter(roster, "A", "da").length, 2, "A-siden har to atleter");
eq(athletesForLetter(roster, "A", "da")[0].name, "Anders Bo", "sorteret på navn");
eq(athletesForLetter(roster, "Ø", "da").length, 1, "Ø-siden har én atlet");
eq(athletesForLetter(roster, "Q", "da").length, 0, "tomt bogstav giver tom liste");

// countByLetter tager en let projektion, ikke en hel Athlete — sitemappet
// tæller uden at hente hele rækken.
eq(countByLetter([{ name: "Test Testesen" }], "da").get("T"), 1, "projektion er nok");

// ── Hele listen ligger på sprogets eget ord ────────────────────────────
eq(athletesAllPath("en"), "/athletes/all", "engelsk: /athletes/all");
eq(athletesAllPath("da"), "/atleter/alle", "dansk: /atleter/alle");
// Sluggen må ikke kunne forveksles med et bogstav — ellers ville rækkefølgen
// i ruten afgøre hvilken side der vandt.
eq(letterFromSlug("all", "en"), null, "'all' er ikke et bogstav");
eq(letterFromSlug("alle", "da"), null, "'alle' er ikke et bogstav");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
