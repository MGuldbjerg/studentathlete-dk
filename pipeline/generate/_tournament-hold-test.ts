/**
 * Multi-day tournaments: hold the day reports, write one recap.
 * Run: npx tsx pipeline/generate/_tournament-hold-test.ts
 * Headlines are real (golf/tennis stories, September–October 2026).
 */
import type { FactSheet } from "./build-factsheet";
import { eventStage, eventWords, foldEarlierReports, holdDecision, isTournamentReport, sameTournament, type Report } from "./tournament-hold";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const sheet = (over: Partial<FactSheet> = {}): FactSheet => ({
  has_substance: true, event: null, result: null, stats: [], qualitative: [], quotes: [], other_facts: [],
  box_score_url: null, ...over,
});

// ─── Stage ──────────────────────────────────────────────────────────────────
const unfinished = [
  "Men's Golf Sits 11th After First Day of The Hrnciar",
  "Manias, Bignell Pace Tulsa in Second Round at Trinity Forest Invitational",
  "Lamar opens Argent Financial Classic tied for seventh",
  "Gillespie Leads Thunderbirds Through 36 Holes at SIUE Dolenc Invitational",
  "Charlie Gillespie, Michael Stirland Lead Way For Men's Golf On Day One at Gene Miranda Falcon Invitational",
  "Men's Tennis Picks Up Wins in Singles and Doubles on First Day at ITA All-American Championships",
  "Kelliher, Gilbert Reach Bedford Cup Doubles Final",
  "Fredericks-McKee Advances to the Top Flight Finals at Binghamton Championships",
  "Lamar climbs to fourth as Woodham leads Argent Financial Classic",
];
for (const h of unfinished) ok(eventStage(h, null) === "unfinished", `unfinished: «${h}»`);
// «Ties for» is how a FINAL placing is written too («Whaley ties for 20th»), so
// it holds nothing: unclear is written at once, as before this module.
ok(eventStage("Woodham ties for first at Argent Financial Classic", null) === "unclear",
  "«ties for first» is unclear — not held, not lost");

const finished = [
  "Gillespie Earns Top-20 Finish to Lead Thunderbirds at SIUE Dolenc Invitational",
  "Final Day of 2026 Savannah Lakes Men's Golf Invite",
  "Liam Harvey Claims the Individual Title at the Kyle Ryman Memorial; Dragons Finish Runner-Up",
  "Hammond and Marušinová Capture Doubles Title at Horizon League Individual Championships",
  "Stags Conclude Action at Metro Conference Masters",
  "Perry Wins Title, Buckeyes Earn NCAA Bids at ITA All-Americans",
  "Men's Tennis Completes Opening Weekend at Everybody vs. Cancer Invitational",
];
for (const h of finished) ok(eventStage(h, null) === "finished", `finished: «${h}»`);

ok(eventStage("Women's Golf in Battle at Coyote Creek Classic",
  sheet({ qualitative: [{ text: "Play was halted by darkness with Sparrow in the lead", source: "prose" }] })) === "unfinished",
  "a silent headline is read from the sheet: «halted by darkness» (Sparrow, #527)");
ok(eventStage("Pack Stumbles Against #21 Hoosiers", sheet({ stats: [{ text: "Conway leads the team in wins", source: "prose" }] })) === "unclear",
  "a weak word in the sheet («leads») does not hold a single dual match");

// ─── Same tournament ────────────────────────────────────────────────────────
const gillespie = ["Charlie Gillespie", "Southern Utah University", "Thunderbirds"];
ok(!sameTournament(
  eventWords("Charlie Gillespie, Michael Stirland Lead Way For Men's Golf On Day One at Gene Miranda Falcon Invitational", null, gillespie),
  eventWords("Gillespie Earns Top-20 Finish to Lead Thunderbirds at SIUE Dolenc Invitational", null, gillespie)),
  "two invitationals ten days apart are not the same event, though both name Gillespie and his team");
ok(sameTournament(
  eventWords("Gillespie Leads Thunderbirds Through 36 Holes at SIUE Dolenc Invitational", null, gillespie),
  eventWords("Gillespie Earns Top-20 Finish to Lead Thunderbirds at SIUE Dolenc Invitational", null, gillespie)),
  "36-hole report and final of the Dolenc Invitational are the same event");
const argent = sheet({ event: { type: "Golf", date: null, opponent: null, competition: "Argent Financial Classic at Squire Creek" } });
ok(sameTournament(
  eventWords("Lamar opens Argent Financial Classic tied for seventh", argent, ["Nathan Woodham", "Lamar University"]),
  eventWords("Woodham claims first collegiate title at Argent Financial Classic", null, ["Nathan Woodham", "Lamar University"])),
  "«Argent Financial Classic» ties Woodham's day one (from its sheet) to his title (from its headline)");

// Found on the real stories: the whole headline tied different events together.
ok(!sameTournament(
  eventWords("Standtke leads Sycamores with top 10 finish at Redbird Invitational", null, ["Louise Standtke", "Indiana State University"]),
  eventWords("Standtke fourth, Sycamores seventh through first day of Butler Fall Invitational", null, ["Louise Standtke", "Indiana State University"])),
  "a team nickname («Sycamores») does not make two invitationals one");
ok(!sameTournament(
  eventWords("Weaver, Whaley Lead Sunday Singles Comeback to Win Walker Cup", sheet({ event: { type: null, date: null, opponent: null, competition: "Walker Cup" } }), ["Jack Whaley", "Florida State University"]),
  eventWords("Weaver, Bock Produce Top 10 Finishes at Hamptons Intercollegiate", null, ["Jack Whaley", "Florida State University"])),
  "a team-mate's name («Weaver») does not make the Walker Cup and the Hamptons one");
ok(sameTournament(
  eventWords("Men's Tennis Picks Up Wins in Singles and Doubles on First Day at ITA All-American Championships", null, ["Luca Bluett"]),
  eventWords("Men's Tennis Closes Out Play at ITA All-Americans with Four Consolation Wins", null, ["Luca Bluett"])),
  "«All-American Championships» and «All-Americans» are the same event");
ok(eventWords("Pack Stumbles Against #21 Hoosiers", sheet({ event: { type: null, date: null, opponent: null, competition: ["x"] as unknown as string } }), []).size === 0,
  "a sheet whose competition is not text is read as no name, not a crash");

ok(!isTournamentReport("Woodham named Southland Golfer of the Week"), "an award is not a tournament report");
ok(!isTournamentReport("Fullbrook named to ANNIKA Award Preseason Watch List"), "a watch list is not a tournament report");
ok(eventStage("Mortensen notches top 10 performance, pair of eagles in same round",
  sheet({ stats: [{ text: "Shot 68 in the second round", source: "prose" }] })) !== "unfinished",
  "a finished event's sheet that mentions «second round» is not read as unfinished (#7592)");

// ─── The decision ───────────────────────────────────────────────────────────
const t0 = new Date("2026-09-28T23:00:00Z");
const h = (n: number) => new Date(+t0 + n * 3_600_000);
const ex = ["Nathan Woodham", "Lamar University"];
const day1: Report = { id: 1, headline: "Lamar opens Argent Financial Classic tied for seventh", factSheet: { ...argent, result: { final_score: null, outcome: null, placement: "T7" } }, discoveredAt: t0 };
const day2: Report = { id: 2, headline: "Lamar climbs to fourth as Woodham leads Argent Financial Classic", factSheet: { ...argent, stats: [{ text: "Woodham shot 66", source: "prose" }] }, discoveredAt: h(23) };
const title: Report = { id: 3, headline: "Woodham claims first collegiate title at Argent Financial Classic", factSheet: sheet(), discoveredAt: h(47) };
const award: Report = { id: 4, headline: "Woodham named Southland Golfer of the Week", factSheet: argent, discoveredAt: h(70) };

const d1 = holdDecision(day1, [], [], ex, h(2));
ok(d1.action === "hold", "day one waits for the final");
ok(holdDecision(day2, [day1], [], ex, h(24)).action === "hold", "day two waits too; the clock started at day one");

const dt = holdDecision(title, [day1, day2], [], ex, h(48));
ok(dt.action === "write" && dt.earlier.map((r) => r.id).join() === "1,2", "the title is written with both day reports folded in");
ok(holdDecision(day1, [day2, title], [], ex, h(48)).action === "covered", "with the final waiting, day one is covered by it");

const late = holdDecision(day2, [day1], [], ex, h(49));
ok(late.action === "write" && late.earlier.map((r) => r.id).join() === "1",
  "48 hours from day one with no final: the LATEST report is written, day one goes with it");
ok(holdDecision(day1, [day2], [], ex, h(49)).action === "covered", "…and the older day report is covered");

ok(holdDecision(day2, [], [day1], ex, h(30)).action === "covered", "a day report after the event's article was written adds nothing");
ok(holdDecision(title, [], [day2], ex, h(60)).action === "write",
  "a FINAL report is always written, even when a day report already became an article");

const aw = holdDecision(award, [], [title], ex, h(71));
ok(aw.action === "write" && aw.earlier.length === 0, "the week's award is written as itself — never covered, never folding a day report");
ok(holdDecision(day1, [award], [], ex, h(2)).action === "hold", "a waiting award does not count as the tournament's final report");

const otherSport: Report = { id: 9, headline: "Pack Stumbles Against #21 Hoosiers", factSheet: sheet(), discoveredAt: t0 };
ok(holdDecision(otherSport, [], [], ["Jasmine Conway", "NC State"], h(1)).action === "write", "an unclear report is written at once");

// ─── Folding ────────────────────────────────────────────────────────────────
const folded = foldEarlierReports(sheet({ context: [{ text: "Lamar won the team title", source: "prose" }] }), [day1, day2]);
const ctx = (folded.context ?? []).map((c) => c.text);
ok(ctx[0] === "Lamar won the team title", "the final report's own context comes first");
ok(ctx.some((t) => t.includes("«Lamar opens Argent Financial Classic tied for seventh»") && t.endsWith("standing T7")),
  "a day report's standing is folded in, labelled with its headline");
ok(ctx.some((t) => t.endsWith(": Woodham shot 66")), "a day report's stats are folded in");
ok(folded.stats.length === 0, "nothing is added to the athlete's own stats");

console.log(`tournament-hold: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
