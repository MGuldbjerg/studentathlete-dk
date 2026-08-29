/**
 * Tests for den regelbaserede kamp-udtrækning.
 * Kør: npx tsx pipeline/generate/_match-facts-test.ts
 *
 * Materialet er ORDRET fra de kildesider der producerede de ti afviste
 * kladder 27.-29. august 2026. Begge markup-varianter er repræsenteret,
 * fordi de vender tiden hver sin vej — og det var netop dét der parrede
 * Corris' mål med Radekes navn.
 */
import { parseScoringSummary, parseTeamStats } from "./match-facts";

let passed = 0, failed = 0;
function eq<T>(a: T, b: T, msg: string): void {
  if (JSON.stringify(a) === JSON.stringify(b)) passed++;
  else { failed++; console.error(`  ✗ ${msg}\n      fik      ${JSON.stringify(a)}\n      ville ha ${JSON.stringify(b)}`); }
}

// ── Variant A: «Scoring Summary», tiden FØRST (gobonnies.com) ─────────
const A = `Scoring Summary Scoring Team Scoring Play
 Score at 07:16 Jack Steel (1) Assisted By: Josh Seyer GOAL by SBU Steel, Jack Assist by Seyer, Josh.
 Score at 60:16 Kyle Macfarlane (1) Assisted By: Daniel Helle GOAL by SBU Macfarlane, Kyle Assist by Helle, Daniel.
 Game Leaders`;
const a = parseScoringSummary(A);
eq(a.length, 2, "A: to mål");
eq(a[0], { time: "07:16", scorer: "Jack Steel", assists: ["Josh Seyer"], team: "SBU", penalty: false }, "A: Steels mål");
eq(a[1].scorer, "Kyle Macfarlane", "A: andet mål");
eq(a[1].assists, ["Daniel Helle"], "A: Helle står som oplægger");

// ── Variant B: «Scoring Plays», tiden SIDST (tommiesports.com) ────────
// Regressionen: en regex bygget på A's rækkefølge gav Corris' tid til Radeke.
const B = `Scoring Plays Oliver Corris (1) Assisted By: Giovanni Agogliati , Owen Marshall GOAL by UST Corris, Oliver Assist by Agogliati, Giovanni and Marshall, Owen. 30:25 Noah Radeke (1) Assisted By: Nathan Moua GOAL by UWGB Radeke, Noah Assist by Moua, Nathan. 73:50 Game Leaders`;
const b = parseScoringSummary(B);
eq(b.length, 2, "B: to mål");
eq(b[0], { time: "30:25", scorer: "Oliver Corris", assists: ["Giovanni Agogliati", "Owen Marshall"], team: "UST", penalty: false },
   "B: Corris får SIN egen tid — ikke Radekes");
eq(b[1].scorer, "Noah Radeke", "B: Radeke");
eq(b[1].time, "73:50", "B: Radekes tid");

// ── Straffespark: ingen «GOAL by», ingen parentes (nsudemons.com) ─────
const PK = `Scoring Summary Score at 61:20 Miku Kurihara (3) UL Miku Kurihara PENALTY KICK GOAL. Score at 69:40 Iesha Rollins NSU Iesha Rollins PENALTY KICK GOAL. Score at 81:02 Alexa Ferraro (1) Assisted By: Kendal Green GOAL by UL Ferraro, Alexa Assist by Green, Kendal. Game Leaders`;
const pk = parseScoringSummary(PK);
eq(pk.length, 3, "PK: tre mål");
eq(pk[1], { time: "69:40", scorer: "Iesha Rollins", assists: [], team: "NSU", penalty: true },
   "PK: navnet stopper før holdkoden — ikke «Iesha Rollins NSU Iesha»");
eq(pk[0].team, "UL", "PK: sæsontotalen må stå mellem navn og holdkode");
eq(pk[2].penalty, false, "et almindeligt mål flages ikke som straffespark");

// ── Beskrivende mål uden «GOAL by» → hold ukendt, ikke gættet ─────────
const DESC = `Scoring Summary Score at 18:47 Kendal Green (1) Stole ball and scored from outside the 18-yard box Score at 81:02 Alexa Ferraro (1) Assisted By: Kendal Green GOAL by UL Ferraro, Alexa. Game Leaders`;
eq(parseScoringSummary(DESC)[0].team, null, "uden holdangivelse siger vi null, ikke et gæt");

// ── Holdstatistik, begge skrivemåder ─────────────────────────────────
const S1 = parseTeamStats("Goals NSU 1 UL 4 Shots NSU 6 UL 12 Shots on Goal NSU 3 UL 6 Saves NSU 1 UL 2");
eq(S1?.rows.find((r) => r.label === "Shots")?.values, [6, 12], "holdkode-formen: skud");
eq(S1?.rows.find((r) => r.label === "Shots on Goal")?.values, [3, 6],
   "«Shots on Goal» må ikke læses som «Shots»");
eq(S1?.teams, ["NSU", "UL"], "holdkoderne");

const S2 = parseTeamStats("UWGB UST Goals 1 1 Shots 11 7 Shots on Goal 3 4 Saves 3 2 Corners 8 7");
eq(S2?.rows.find((r) => r.label === "Saves")?.values, [3, 2], "bar-tal-formen: redninger");

eq(parseTeamStats("ingen tal her"), null, "ingen statistik → null");
eq(parseScoringSummary("<p>en artikel uden scoringsoversigt</p>"), [], "ingen oversigt → tom liste");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
