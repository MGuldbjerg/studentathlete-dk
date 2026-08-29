/**
 * Tests for krydstjekket mod kampens faktiske forløb.
 * Kør: npx tsx pipeline/generate/_fact-cross-check-test.ts
 *
 * Sagerne er de kladder auditten 2026-08-30 blev bygget på: fire jeg afviste
 * i hånden, og tre der står udgivet. Kontrollen skal ramme de fire og TIE om
 * de tre — det er dét `fabrication_risk` ikke kunne (27 af 68 afvisninger var
 * stemplet «low»).
 */
import { crossCheck, citedMinutes, minuteOf } from "./fact-cross-check";
import { parseScoringSummary, parseTeamStats } from "./match-facts";

let passed = 0, failed = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) passed++; else { failed++; console.error(`  ✗ ${msg}`); }
}
function eq<T>(a: T, b: T, msg: string): void {
  if (JSON.stringify(a) === JSON.stringify(b)) passed++;
  else { failed++; console.error(`  ✗ ${msg} (fik ${JSON.stringify(a)}, ville have ${JSON.stringify(b)})`); }
}

const facts = (scoring: string, stats = "") => ({
  goals: parseScoringSummary(scoring),
  teamStats: stats ? parseTeamStats(stats) : null,
});

// ── Minuttal ──────────────────────────────────────────────────────────
eq(minuteOf("07:16"), 8, "07:16 omtales som det 8. minut");
eq(minuteOf("86:05"), 87, "86:05 er det 87.");
eq(minuteOf("ikke en tid"), null, "ugyldig tid");
eq(citedMinutes("scored in the 87th minute").sort(), [87], "engelsk minuttal");
eq(citedMinutes("udlignede i det 39. minut").sort(), [39], "dansk minuttal");

// ── Eckerd 3-2 (#177): artiklen lod Fain udligne i 85. ────────────────
const eckerd = facts(
  `Scoring Summary Score at 33:00 Tatum Fain (1) Assisted By: Tristan Bassette GOAL by ECKERD Fain.
   Score at 86:05 Pharrell Williams (1) Assisted By: Tatum Fain GOAL by ECKERD Williams.`);
const c177 = crossCheck("Williams slotted home in the 87th minute, two minutes after Fain had equalised in the 85th minute.", eckerd);
assert(c177.some((c) => c.claim.startsWith("85")), "#177: det opfundne 85. minut fanges");
assert(!c177.some((c) => c.claim.startsWith("87")), "#177: det RIGTIGE 87. minut flages ikke");

// ── Upstate (#178): assist lagt i 12. minut, mål faldt 45/59/61 ───────
const upstate = facts(
  `Scoring Summary Score at 44:58 Christian Cook (1) Assisted By: Jacob Cromedy GOAL by UPS Cook.
   Score at 58:46 Bennett Leitner (1) Assisted By: Oscar Kelly GOAL by UPS Leitner.`);
const c178 = crossCheck("Kelly's driven cross found Leitner, who slotted home in the 12th minute.", upstate);
assert(c178.length > 0,
  "#178: et minuttal knyttet til et MÅL tjekkes selv uden for kampens scorings-vindue");

// Et løsrevet tal uden for vinduet er derimod ikke vores sag.
eq(crossCheck("He was substituted in the 12th minute.", upstate), [],
   "indskiftning i 12. minut flages ikke — vi kender ikke skiftene");

// ── Northeastern (#176): 15 redninger, kilden siger 5 ─────────────────
const nu = facts(
  `Scoring Summary Score at 53:48 Jessica Garden (1) Assisted By: Lucy Walton GOAL by Northeastern Garden.`,
  "Goals NORTHEAS 2 VERMONT 5 Saves NORTHEAS 5 VERMONT 4");
assert(crossCheck("conceding five goals while making 15 saves", nu).some((c) => c.kind === "team-stat"),
  "#176: redningstallet modsiger kilden");
eq(crossCheck("the goalkeeper made five saves", nu), [], "det rigtige redningstal flages ikke");

// ── Kontrolgruppen: udgivne artikler skal gå fri ──────────────────────
const bonnies = facts(
  `Scoring Summary Score at 07:16 Jack Steel (1) Assisted By: Josh Seyer GOAL by SBU Steel.
   Score at 60:16 Kyle Macfarlane (1) Assisted By: Daniel Helle GOAL by SBU Macfarlane.`,
  "Goals SBU 2 NIA 0 Saves SBU 2 NIA 5");
eq(crossCheck("Steel scored in the eighth minute; Macfarlane made it 2-0 in the 61st minute. Jory finished with two saves.", bonnies), [],
   "#150 (udgivet): afrunding fra 07:16 til «eighth» og 60:16 til «61st» er i orden");

// ── Rammer ────────────────────────────────────────────────────────────
eq(crossCheck("noget tekst", null), [], "ingen kampdata → ingen påstande at modsige");
eq(crossCheck("noget tekst", { goals: [], teamStats: null }), [], "tom oversigt → tavshed");
eq(crossCheck("", bonnies), [], "tom artikel");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
