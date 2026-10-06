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

// ─── The publication stamp is not the event's date (6 October 2026) ─────────
// Three award announcements reached drafts dated by their own stamp: the
// awards went up on Monday 5 October, the matches they honour were earlier.

const stamped = (date: string, source: string) =>
  verifyFactSheet(
    { ...sheet, event: { type: "Soccer", date, opponent: null, competition: null }, stats: [], qualitative: [], other_facts: [] },
    source,
    "Tyler Ackah-Wheatcroft",
  );

const award528 =
  "Ackah-Wheatcroft, Caffaro Sweep Lone Star Conference Defensive Player of the Week Awards\n10/5/2026 2:30:00 PM\n" +
  "He sparked the Eagles to a 2-0 shutout victory against West Texas A&M. On Saturday, Ackah-Wheatcroft put in another 90-minute shift.";
const r528 = stamped("10/5/2026", award528);
ok(r528.factSheet.event?.date === null, "#528: Monday's stamp is not the date of a match the source puts «On Saturday»");
ok(r528.unverified.some((u) => u.field === "event.date" && /published/.test(u.reason)),
  "…and the reason says it was only the publication date");

const award532 =
  "Trinder Named Metro Conference Rookie of the Week\n10/5/2026 1:00:00 PM\nLucy Trinder recorded her third goal of the year in a 3-0 win over Saint Peter's.";
ok(stamped("10/5/2026", award532).factSheet.event?.date === null, "#532: an undated match does not borrow the stamp");
ok(stamped("2026-10-05", award532).factSheet.event?.date === null, "#534: the ISO form of the stamp date is dropped too");

// Same-day reports must keep their date — the weekday ties the stamp to the event.
const recap = "Late Heroics From Rosen\n10/4/2026 7:12:00 PM\nThe NMU men's soccer team defeated the Parkside Rangers 1-0 on Sunday.";
ok(stamped("Oct. 04, 2026", recap).factSheet.event?.date === "Oct. 04, 2026",
  "a recap published Sunday that says «on Sunday» keeps its date (4 Oct 2026 was a Sunday)");
// A same-day tournament report often names no day at all — Billson's finals
// page said only «To start the day». Dropping these cost 9 true dates in the
// backtest, so a stamp-only date stands unless the page is a weekly honour.
const finals = "Billson & Blumentritt Earn ITA Regional Titles\n10/5/2026 3:37:00 PM\nTo start the day, Theo Billson faced Dominik Knutson.";
ok(stamped("10/5/2026", finals).factSheet.event?.date === "10/5/2026",
  "a same-day report that names no weekday keeps its stamp date");
// Deliberate trade, measured: vetoing the stamp whenever the text names
// another weekday dropped a true date (#8019, published Saturday, mentioning
// Sunday's next round) and caught nothing the weekly-honour rule missed.
ok(stamped("10/4/2026", recap.replace("on Sunday", "on Saturday")).factSheet.event?.date === "10/4/2026",
  "another weekday alone does not veto the stamp on a non-weekly page");

const honorRoll =
  "John Ferry and Amelia Jones Make the CACC Weekly Honor Roll\n9/29/2026 11:00:00 AM\nJones placed fourth at the Rowan Invitational.";
ok(stamped("9/29/2026", honorRoll).factSheet.event?.date === null,
  "#7550: a weekly honour roll is not dated by its stamp either");

const withHeader = "Men's Soccer Falls\nwinner Charlotte 4 final Oct. 03, 2026 2 ETSU\n10/3/2026 8:59:00 PM\nThe Bucs fell 4-2.";
ok(stamped("Oct. 03, 2026", withHeader).factSheet.event?.date === "Oct. 03, 2026",
  "a date written in the story itself (box-score header) needs no weekday");

const otherStamp = "10/1/2026 9:00:00 AM\nThe Eagles beat West Texas A&M 2-0 on Oct. 5.";
ok(stamped("10/5/2026", otherStamp).factSheet.event?.date === "10/5/2026",
  "a stamp for another day does not hide a date the text does write");
ok(stamped("10/9/2026", award532).unverified.some((u) => u.reason === "the date is not written in the source"),
  "a date written nowhere keeps the old reason");

console.log(`verify-factsheet: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
