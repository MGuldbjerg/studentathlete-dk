/**
 * Test af prisnavnenes sprog.
 *
 * `award_name` er en kanonisk NØGLE, ikke visningstekst, og nøglerne er på
 * blandet dansk og engelsk. Renderet råt stod der «Mesterskab» og «Rekord» på
 * britiske profiler (student-athlete.co.uk/athletes/timi-esan, 17. september
 * 2026). Sproget hører til sitet — derfor oversættes der ved visning.
 */
import { awardLabel, extractEvents, harvestRows, seasonForEvent } from "./athlete-events";

let passed = 0;
let failed = 0;
function eq(a: unknown, b: unknown, name: string) {
  if (a === b) passed++;
  else { failed++; console.error(`✗ ${name}\n    fik: ${JSON.stringify(a)}  forventet: ${JSON.stringify(b)}`); }
}

eq(awardLabel("Mesterskab", "en"), "Championship", "britisk profil siger Championship");
eq(awardLabel("Mesterskab", "da"), "Mesterskab", "dansk profil siger Mesterskab");
eq(awardLabel("Rekord", "en"), "Record", "Rekord oversættes");
eq(awardLabel("Draftet", "en"), "Drafted", "Draftet oversættes");
eq(awardLabel("All-American", "en"), "All-American", "egennavn er ens på begge sprog");
eq(awardLabel("All-American", "da"), "All-American", "— også på dansk");
eq(awardLabel("Player of the Week", "da"), "Ugens spiller", "engelsk nøgle → dansk visning");
eq(awardLabel("Ugens spiller", "en"), "Player of the Week", "dansk nøgle → engelsk visning");
eq(awardLabel("Noget Ukendt", "en"), "Noget Ukendt", "ukendt nøgle vises som den er, ikke som tom celle");
eq(awardLabel(null, "en"), "", "ingen pris er tom streng");

// ── academic vs athletic, and which season an honour belongs to (2026-09-30) ──
const awards = (t: string) => extractEvents(t).map((e) => e.award_name).join(",");
eq(awards("Lamar among national leaders with six golf All-America Scholars"), "Academic All-American", "All-America Scholars is academic (Woodham)");
eq(awards("named a Scholar All-American"), "Academic All-American", "Scholar All-American is academic");
eq(awards("earned All-America Second Team honours"), "All-American", "plain All-America stays athletic");
eq(seasonForEvent("2026-08-05", "honor"), "2025-26", "an honour announced in August belongs to the season just ended");
eq(seasonForEvent("2026-06-10", "honor"), "2025-26", "June honour: season just ended");
eq(seasonForEvent("2026-09-28", "notable"), "2026-27", "a weekly award in September is this season");
eq(seasonForEvent("2026-08-05", "notable"), "2026-27", "non-honours keep the date's season");

// ── things that look like awards but are not (the 2026-27 rows, 2026-09-30) ──
eq(awards("Henry Jefferson to play singles main draw at ITA All-American Championships"), "", "ITA All-American Championships is a tournament");
eq(awards("Jasmine Conway wins three matches to reach ITA All-American qualifying draw"), "", "a qualifying draw is not an award");
eq(awards("Sophia Fullbrook earns preseason All-America honours at Florida State"), "", "preseason All-America is a forecast");
eq(awards("Eloise Penty named to America East preseason all-conference team"), "", "preseason all-conference is a forecast");
eq(awards("Alfred Mikkelsen kåret til Preseason Goalkeeper of the Year i American Conference"), "", "preseason player of the year is a forecast");
eq(awards("Amy Wall named to All-Sun Belt Community Service Team"), "", "a community service team is not athletic");
eq(awards("Lasse Bjørn Jensen satte personlig rekord ved John McNichols Invitational"), "", "a personal best is not a record");
eq(awards("Sam Wraith named NE10 Rookie of the Week"), "Rookie of the Week/Month", "a real weekly award still counts");
eq(awards("Marianna MacLean named Patriot League Rookie of the Week for third straight week"), "Rookie of the Week/Month", "and again");
eq(awards("Sets school record in the 800m"), "Rekord", "a school record still counts");

// ── harvestRows: counting weekly awards once ──
const rowsFor = (title: string, summary: string | null) =>
  harvestRows({ athleteId: 1, articleId: 2, sourceUrl: null, publishedAt: "2026-09-28", title, summary }).map((r) => r[4]).join(",");
eq(rowsFor("Cameron Keay's winner keeps UNCW undefeated in CAA play", "The two-time CAA Rookie of the Week headed the winner."), "", "a recap of earlier weekly awards is not a new one");
eq(rowsFor("Cameron Keay named CAA Rookie of the Week for second straight week", null), "Rookie of the Week/Month", "a headline about the award counts");
eq(rowsFor("Marie Eline Madsen udtaget til Golfweeks preseason-hold", "All-American-kandidat"), "", "a preseason headline yields nothing");
eq(rowsFor("Flora Johnson reaches ITA All-American final, secures NCAA bid", null), "", "an ITA All-American final is a tournament");

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
