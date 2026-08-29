/**
 * Tests for stavekontrollen af danske navne.
 * Kør: npx tsx pipeline/checks/_danish-names-test.ts
 */
import { foldDanish, correctionFromText, looksTransliterated } from "./danish-names";

let passed = 0, failed = 0;
function eq<T>(a: T, b: T, msg: string): void {
  if (JSON.stringify(a) === JSON.stringify(b)) passed++;
  else { failed++; console.error(`  ✗ ${msg} (fik ${JSON.stringify(a)}, ville have ${JSON.stringify(b)})`); }
}

// ── Foldning ───────────────────────────────────────────────────────────
eq(foldDanish("Jørgensen"), "jorgensen", "ø → o");
eq(foldDanish("Kjær"), "kjaer", "æ → ae");
eq(foldDanish("Ågaard"), "aagaard", "å → aa");
eq(foldDanish("Jorgensen"), foldDanish("Jørgensen"), "de to stavemåder folder ens");

// ── Tier 1: beviset står i vores egen tekst ───────────────────────────
eq(correctionFromText("Marcus Jorgensen",
   "Marcus Jørgensen spillede fodbold for Cal Poly Pomona Broncos."), "Marcus Jørgensen",
   "teksten bærer den rigtige stavemåde");
eq(correctionFromText("Veronica Kjaer Sorensen",
   "Veronica Kjær Sørensen har siden 2024 spillet håndbold."), "Veronica Kjær Sørensen",
   "to rettelser i ét navn");
eq(correctionFromText("Malthe Bogebjerg", "Malthe Bøgebjerg svømmer for Ohio State."),
   "Malthe Bøgebjerg", "Bøgebjerg");

// Ingen forskel, intet fund.
eq(correctionFromText("Anders Hansen", "Anders Hansen spiller fodbold."), null,
   "navn uden danske tegn giver intet fund");
eq(correctionFromText("Marcus Jorgensen", "Marcus Jorgensen spiller fodbold."), null,
   "teksten staver det på samme måde → intet bevis");
// En ANDEN person i teksten må ikke forveksles med atleten.
eq(correctionFromText("Anders Hansen", "Anders Hansen spillede sammen med Søren Bæk."), null,
   "en holdkammerats navn er ikke atletens");
eq(correctionFromText("", "Søren Bæk"), null, "tomt navn");
eq(correctionFromText("Søren Bæk", null), null, "ingen tekst");

// ── Tier 2: led hvor dansk aldrig skriver bart «o» ────────────────────
eq(looksTransliterated("Marcus Jorgensen"), ["Jørgensen"], "Jorgensen");
eq(looksTransliterated("Oliver Moller-Jensen"), ["Møller"], "Moller");
eq(looksTransliterated("Noah Norgaard"), ["Nørgaard"], "Norgaard");
eq(looksTransliterated("Oscar Bjornskov"), ["Bjørn"], "Bjornskov");
eq(looksTransliterated("Anders Hansen"), [], "almindeligt navn flages ikke");

// ⚠️ «aa»/«ae» er lovlige danske stavemåder — de må ALDRIG flages af mønstret.
eq(looksTransliterated("Peter Aagaard"), [], "Aagaard er en lovlig dansk stavemåde");
eq(looksTransliterated("Ida Kjaergaard"), [], "Kjaergaard ligeså");
eq(looksTransliterated("Mette Baagoe"), [], "Baagøe-varianten gættes ikke");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
