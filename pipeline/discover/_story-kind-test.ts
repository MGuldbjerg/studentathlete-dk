/**
 * Tests for historie-typen der styrer rangeringen.
 * Kør: npx tsx pipeline/discover/_story-kind-test.ts
 *
 * Materialet er ÆGTE overskrifter, hentet fra stories-tabellen 2026-08-26 —
 * netop de historier der lå i køen dengang referaterne aldrig nåede frem.
 */

import { detectStoryKind, relevanceAdjustment, RECAP_BOOST, PRESEASON_PENALTY } from "./story-kind";
import { detectHonor } from "./honors";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function kindOf(text: string): string {
  return detectStoryKind(text, detectHonor(text) !== null).kind;
}

function eqKind(headline: string, expected: string): void {
  const got = kindOf(headline);
  assert(got === expected, `"${headline}" → ${expected} (fik ${got})`);
}

// ── Kampreferater: der ER et udfald ────────────────────────────────────
eqKind("Soccer Dominates Tempo, Winning 2-0 In Home Opener", "recap");
eqKind("Women's Soccer Defeats Rhode Island, 3-0, on Senior Night", "recap");
eqKind("Pirates Force 2-2 Draw At UNCG", "recap");
eqKind("Meadows Scores First Career Goal; Pride Fall In Season Opener", "recap");
eqKind("Bermingham's Second Half Brace Nets Soccer Road Victory Over Campbell", "recap");
eqKind("Women's Soccer Battles to Opening Game Draw at Home", "recap");
eqKind("Whaley Dominates Quarterfinal, Advances to Semifinal at U.S. Amateur", "recap");

// ── Forsæson: lister og spådomme før der er spillet ────────────────────
eqKind("Kowalewski, Kuefler, Penty named America East Field Hockey Preseason All-Conference", "preseason");
eqKind("UAH Men's Soccer Selected Fourth in GSC Preseason Poll", "preseason");
eqKind("Paul Claes Nielsen Named Preseason All-MVC", "preseason");
eqKind("Morgan Worsfold-Gregg Named to All-CAA Preseason Team", "preseason");
eqKind("Wolfpack Picked First in Preseason Poll; Caton Named to ACC Preseason Team", "preseason");
eqKind("Women's Soccer: Ginny Lackey Named to MAC Hermann Trophy Watch List", "preseason");
eqKind("Lejbowicz Named to 2026 United Soccer Coaches Forwards to Watch List", "preseason");
eqKind("Kauschke Named Preseason BIG EAST Midfielder of the Year", "preseason");
eqKind("Congerton Earns Preseason All-GSC Honors as Lady Statesmen Earn Highest Ranking", "preseason");
eqKind("Polanco, Brand named Marauders soccer players to watch in the NSIC", "preseason");
eqKind("Whitaker Named Preseason All-Metro, Women's Soccer Tabbed Fourth", "preseason");

// Forsæson slår referat: en watch list-notits citerer gerne sidste sæsons tal.
eqKind("Named to Watch List After Scoring 11 Goals and a 2-0 Shutout Last Season", "preseason");

// ── Hædersbevisninger i sæsonen: ægte nyhed, men ikke forrest ──────────
eqKind("Ruf Named Goalkeeper of the Week; Pickup Honorable Mention", "honor");
eqKind("Gavin and Ulmo Named All-American Scholars", "honor");
eqKind("Coffey, Skaggs Receive Academic All-American Award by WGCA", "honor");

// ── Hverken-eller: annonceringer og portrætter rører vi ikke ───────────
// En kampANNONCERING er bevidst ikke et referat — der er intet udfald endnu,
// og et faktaark uden resultat er præcis den tomme kladde vi vil undgå.
eqKind("Soccer Hosts A&M-International on Sunday Night", "other");
eqKind("Olivia Beattie and Sophie Kuiper to Captain Field Hockey", "other");
eqKind("Davis Presses Play on Senior Year at William & Mary", "other");
eqKind("Bulldogs gear up for GSC Play, Coach Cox enters his 10th season", "other");

// ── Faldgruber i scoreline-mønstret ────────────────────────────────────
// Et sæson-interval er ikke en stilling.
eqKind("Anderson Signs for the 2025-26 Season", "other");
assert(kindOf("Volleyball Wins 3-1") === "recap", "cifret stilling fanges");

// ── Justeringerne ──────────────────────────────────────────────────────
assert(relevanceAdjustment("recap") === RECAP_BOOST, "referat boostes");
assert(relevanceAdjustment("preseason") === -PRESEASON_PENALTY, "forsæson straffes");
assert(relevanceAdjustment("honor") === 0, "hædersbevisning er neutral");
assert(relevanceAdjustment("other") === 0, "øvrige er neutrale");

// Et fuldt navne-match (90) på et referat skal nå loftet på 100 — den plads
// hædersbevisningerne havde før. Kapningen sker hos kalderen.
assert(Math.min(100, 90 + relevanceAdjustment("recap")) === 100, "referat m. fuldt navn når toppen");
// En forsæsons-notits m. fuldt navn (90) skal blive over MIN_RELEVANCE_GENERATE (60),
// men et efternavns-match (35) skal falde under MIN_RELEVANCE (30) og slet ikke gemmes.
assert(90 + relevanceAdjustment("preseason") === 65, "forsæson m. fuldt navn er stadig skrivbar");
assert(35 + relevanceAdjustment("preseason") < 30, "forsæson m. kun efternavn gemmes ikke");

// Tom tekst må ikke kaste
eqKind("", "other");
assert(detectStoryKind(null).kind === "other", "null → other");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
