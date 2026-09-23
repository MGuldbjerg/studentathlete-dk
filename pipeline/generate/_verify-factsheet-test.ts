/**
 * Test of the fact-sheet check — every case is a real one.
 *
 * The first block is the errors found in the British drafts of 23-09-2026; the
 * second is the true facts an earlier version of the check wrongly dropped in
 * a backtest over 300 sheets. Both halves matter: a check that drops true
 * facts starves the writer as surely as a wrong fact misleads it.
 */
import type { FactSheet } from "./build-factsheet";
import { checkFact, prepareSource, surnamesOf, verifyFactSheet } from "./verify-factsheet";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const dropped = (fact: string, source: string, athlete: string) =>
  checkFact(fact, prepareSource(source), surnamesOf(athlete)) !== null;
const kept = (fact: string, source: string, athlete: string) => !dropped(fact, source, athlete);

// ─── Errors that reached drafts ─────────────────────────────────────────────

ok(dropped("Canisius outshot Rider by an 11-1 margin", "Canisius outshot Rider by an 11-9 margin in the contest.", "Jessica Whitaker"),
  "#352: a score the source never states is dropped");
ok(kept("Canisius outshot Rider by an 11-9 margin", "Canisius outshot Rider by an 11-9 margin in the contest.", "Jessica Whitaker"),
  "…and the score it does state is kept");

const bates = "She teamed with Lia Swire for a 6-2 win over Colby's Barrow and Skulley. She beat Gwen Gray 6-4, 6-2.";
ok(dropped("6-2, 6-0 victory over Colby's Tina Barrow (doubles, with Lia Swire)", bates, "Avni Bakre"),
  "#348: a set sequence the source never states is dropped, though each score exists alone");
ok(kept("6-4, 6-2 victory over Vassar's Gwen Gray", bates, "Avni Bakre"), "…and a real sequence is kept");
ok(kept("Defeated Deborah Collado Dominguez 6-2, 6-3", "Crncan overpowered Deborah Collado Dominguez 6-2 and 6-3.", "Heidi Crncan"),
  "«6-2 and 6-3» is the sequence «6-2, 6-3»");

const uncw = "Keay played a total of 146 minutes last week across two starts, including at NC State last Tuesday.";
ok(dropped("Played 146 minutes (including 1 start vs. NC State on 2026-09-17)", uncw, "Cameron Keay"),
  "#364: a date the model worked out from «last Tuesday» is dropped");
ok(kept("Played 146 minutes across two starts", uncw, "Cameron Keay"), "…while the same fact without the date is kept");

const bryant =
  "Claire Joss set the single-game record with four assists as Bryant defeated Sacred Heart, 4-0.\n" +
  "The Black and Gold doubled their lead off another penalty corner just over five minutes into the quarter.\n" +
  "Johnson collected three assists and has five on the season.\n" +
  "Joss set a single-game program record with four assists.";
ok(dropped("Claire Joss has five assists on the season", bryant, "Claire Joss"),
  "#345: another player's season total is not the athlete's — not even via «five minutes»");
ok(kept("Claire Joss set the single-game record with four assists", bryant, "Claire Joss"), "…and her own record is kept");

const stanState =
  "GOAL by STAN Maragos, Olivia Assist by Franco, Karissa.\nScore at\n62:48\nKyndra Obermeyer (2)\nAssisted By: Olivia Maragos\n" +
  "Zara Mujica recorded four saves for her third shutout of the season.";
ok(dropped("Assisted Kyndra Obermeyer in the third goal (62:48)", stanState, "Zara Mujica"),
  "#350: a goal time from the scoring summary is not the keeper's assist");
ok(kept("Recorded four saves for her third shutout", stanState, "Zara Mujica"), "…her saves are kept");

ok(dropped("Scored a penalty stroke at the 11:32 mark of the third quarter",
  "After a scoreless first half, Wolf scored from the left off an Eva van der Kooi pass to give the Wildcats a 1-0 lead at the 11:32 mark.",
  "Matilda Collins"), "a goal time that is somebody else's goal is dropped");

// ─── True facts an earlier version dropped ──────────────────────────────────

const pickard =
  "Junior Ava Pickard scored in the 89th minute to break a scoreless deadlock.\nPickard struck with 67 seconds remaining.\n" +
  "Freshman keeper Alexa Turmel made three saves.\nWith the game scoreless in the final minutes, Canisius earned a free kick.\n" +
  "Senior Jessica Whitaker placed the ensuing kick to the right side of the Rider goal.";
ok(kept("Jessica Whitaker provided an assist on Ava Pickard's goal in the 89th minute.", pickard, "Jessica Whitaker"),
  "a named event (Pickard's 89th-minute goal) the athlete took part in a few sentences later");

ok(kept("Scored 31 seconds into the match",
  "Keay connected on a pass from Kieran Radke 31 seconds into the match to give No. 23 UNCW the early 1-0 lead.", "Cameron Keay"),
  "«No. 23» does not end the sentence");
ok(kept("113th place in a field of 263",
  "Bjørn Jensen ran in the pack. The Denmark native finished 113th in a field of 263 of the top runners.", "Lasse Bjørn Jensen"),
  "«the Denmark native» is a description, not another person");
ok(kept("11-7 overall singles record", "During the 2025-26 season, the London, England, native registered an 11-7 overall singles record.", "Amelia Tye"),
  "a season range is not a number, and «the … native» is the athlete");
ok(kept("12th career round in the 60's", "Daly then closed with back-to-back birdies. The 67 was his 12th career round in the 60's.", "Henry Daly"),
  "«his» ties an unnamed sentence to the athlete");
ok(kept("18:32.0", "Charlotte Young led the pack with an 8th-place finish in a personal-best 18:32.0.", "Charlotte Young"),
  "a race time keeps its decimals");
ok(kept("1:16:08.06", "Candace Socito (70, 1:15:50.67) and Annabelle Suffield (71, 1:16:08.06) finished close.", "Annabelle Suffield"),
  "a multi-part time is one token");
ok(kept("Leads The Summit League in goals per game (0.57)", "Flaskager currently leads the Summit League in goals per game (0.57).", "Frederik Flaskager"),
  "0.57 matches 0.57");
ok(kept("Reigning NCAA Division II 1,500-meter National Champion", "Reigning NCAA Division II 1,500-meter national champion Caleb McLeod was third.", "Caleb McLeod"),
  "a thousands separator is part of the number");
ok(kept("69 in the second round", "McFadden (67-69-72--208) was one of six players new to the lineup.", "Ben McFadden"),
  "a round inside a golf line");
ok(kept("39 career points with NMU", "Currently at 39 career points with NMU, one goal will see Luca stand alone.", "Luca Rosen"),
  "the athlete's first name identifies them");
ok(kept("McLean scored at 57:50", "Scoring Play\n57:50\nHarry McLean (3)\nAssisted By: Hayden Mulrooney", "Harry McLean"),
  "a scoring-summary time with the scorer on the line below");
ok(kept("Made 11 saves against Augustana on Sunday", "Emilia Bukholt Kristensen – Goalkeeper of the Week\n- Allowed one goal\n- Made 11 saves against Augustana on Sunday", "Emilia Bukholt Kristensen"),
  "an award list under the athlete's name");
ok(kept("Minshull scored a brace", "Holly Minshull scored a brace as JMU won.", "Holly Minshull"), "sanity: plain fact kept");

// ─── The sheet ──────────────────────────────────────────────────────────────

const sheet: FactSheet = {
  has_substance: true,
  event: { type: "Soccer", date: "2026-09-20", opponent: "AIC", competition: null },
  result: { final_score: "1-0", outcome: "Win", placement: null },
  stats: [{ text: "Hollis scored twice", source: "prose" }, { text: "Hollis had 7 shots", source: "prose" }],
  qualitative: [],
  quotes: [],
  other_facts: [{ text: "Mercy had 6 corners", source: "boxscore" }],
  box_score_url: null,
};
const src = "Hollis scored twice in the 3-0 win over AIC on Wednesday.\nwinner Florida Tech 1 final Sep. 16, 2026 0 Saint Leo";
const v = verifyFactSheet(sheet, src, "John Hollis");
ok(v.factSheet.event?.date === null, "#360: a match date not written in the source is removed");
ok(v.factSheet.result?.final_score === "1-0", "a final score written as two table columns is kept");
ok(v.factSheet.stats.length === 1 && v.factSheet.stats[0].text === "Hollis scored twice", "«twice» grounds 2; the unsupported 7 shots is removed");
ok(v.factSheet.other_facts.length === 1, "box-score facts are not judged against the prose");
ok(v.unverified.length === 2 && v.unverified.every((u) => u.reason.length > 0), "every removal is recorded with a reason");

console.log(`verify-factsheet: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
