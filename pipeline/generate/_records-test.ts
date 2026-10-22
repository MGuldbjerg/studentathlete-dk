/**
 * Facts from our own records: the national angle and our earlier articles.
 * Run: npx tsx pipeline/generate/_records-test.ts
 */
import type { FactSheet } from "./build-factsheet";
import { renderFactSheet } from "./build-factsheet";
import { recordsNote } from "./draft-dossier";
import { earlierLines, rosterLabel, rosterLine, withRecords } from "./records";
import { awardsLine, classLine, enrichmentLines, homeLine, milestoneLine, nation, opponentLine, rankLine, schoolKey, teamLine, town, type EAthlete, type EnrichData } from "./enrich";
import { buildLeaderboard, crossed, milestoneEvent, rankRows, shortDivision, type BoardInput } from "../../src/lib/leaderboard";
import { buildAwardTally, dedupeAwards, previousMonth, type AwardInput } from "../../src/lib/award-tally";
import { captionFor, tagsFor, winnerLines, type Winner } from "../social/post-award-roundup";
import { tagPositions } from "../social/channels/instagram";
import { buildLeaderboardWeek, plain, weekHeadline, weekSections } from "../../src/lib/leaderboard-week";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const asOf = new Date("2026-10-07T12:00:00Z");
ok(rosterLabel("soccer", "m") === "men's soccer", "men's roster");
ok(rosterLabel("field-hockey", "f") === "women's field hockey", "women's roster, sport key read as words");
ok(rosterLabel("golf", null) === "golf", "no gender, no prefix");

ok(rosterLine("Lucas Martin", 4, "UK", "Fort Lewis College", "soccer", "m", asOf) ===
  "Lucas Martin is one of 4 British players on Fort Lewis College's men's soccer roster (as of 7 October 2026)",
  "the national angle, dated");
ok(rosterLine("Lucas Martin", 1, "UK", "Fort Lewis College", "soccer", "m", asOf) === null, "one is just the athlete: no line");
ok(rosterLine("Toke Amtrup", 2, "DK", "Utah Valley University", "soccer", "m", asOf)?.includes("2 Danish players") === true, "Danish");
// Collecting countries have their nationality ready for launch (2026-10-22);
// articles are only written for site countries (generate-articles, siteCountrySql).
ok(rosterLine("X", 3, "DE", "Y", "soccer", "m", asOf)?.includes("3 German players") === true, "a collecting country is ready for launch");
ok(rosterLine("X", 3, "NO", "Y", "soccer", "m", asOf) === null, "a country we do not collect gets no line");

const sheet = (date: string | null): FactSheet => ({
  has_substance: true, event: { type: null, date, opponent: null, competition: null }, result: null,
  stats: [], qualitative: [], quotes: [], other_facts: [], box_score_url: null,
});
const prior = [
  { title: "Zara Mujica keeps fourth clean sheet of the season in Stanislaus State win", sourceUrl: "https://a/2-0", factSheet: sheet("Oct. 04, 2026") },
  { title: "Mujica makes six saves as Stanislaus State lose 4-0", sourceUrl: "https://a/4-0", factSheet: sheet(null) },
  { title: "Zara Mujica keeps clean sheet as Stan State beat Cal State Dominguez Hills", sourceUrl: "https://a/1-0", factSheet: sheet("Sept. 26, 2026") },
  { title: "Fourth", sourceUrl: "https://a/x", factSheet: null },
];
const lines = earlierLines(prior, "https://a/2-0");
ok(lines.length === 3, "at most three, without the article on this very event");
ok(lines[0] === "Our earlier article: «Mujica makes six saves as Stanislaus State lose 4-0»", "no date when the sheet has none");
ok(lines[1].includes("(event of Sept. 26, 2026)"), "the event date from the article's own sheet");
ok(!lines.some((l) => l.includes("fourth clean sheet")), "the current event is not 'earlier'");

const fs = withRecords(sheet(null), ["A", "B"]);
ok(fs.records?.length === 2 && fs.records[0].source === "records", "records are tagged as ours");
ok(withRecords(sheet(null), []).records === undefined, "no lines, no field");
const block = renderFactSheet(fs);
ok(block.includes("Egne optegnelser") && block.includes("IKKE fra kilden") && block.includes("- B"), "the writer sees them labelled as ours");

ok(recordsNote(JSON.stringify(fs)).includes("IKKE opdigtet"), "the reviewers are told they are the database's own knowledge");
ok(recordsNote(JSON.stringify(sheet(null))) === "", "no records: the dossier is unchanged");
ok(recordsNote("not json") === "", "an unreadable sheet: no note, no crash");

// ─── The enrichment motor (enrich.ts) ──────────────────────────────────────
const ath = (o: Partial<EAthlete> & { id: number; name: string }): EAthlete => ({
  university: "Chowan University", sport: "soccer", gender: "m", home_country: "UK", hometown: "Bolton, England",
  year_enrolled: 2024, division: "NCAA D2", conference: "Conference Carolinas", ...o,
});
const st = (athlete_id: number, goals: number, kind = "outfield") =>
  ({ athlete_id, kind, games: 10, goals, assists: 0, shutouts: kind === "keeper" ? goals : 0, school: "Chowan", fetched_on: "2026-10-21" });
const ed: EnrichData = {
  season: "2026-27", seasonStart: 2026,
  athletes: [
    ath({ id: 1, name: "Robbie Deighan" }),
    ath({ id: 2, name: "Tom Ash", hometown: "Bolton, England", university: "Barton College", conference: "Conference Carolinas" }),
    ath({ id: 3, name: "Sam Bell", hometown: "Leeds, England", year_enrolled: 2026 }),
    ath({ id: 4, name: "Kim Cole", hometown: "Ayr, Scotland", year_enrolled: 2026, university: "Lee University", conference: "Gulf South Conference" }),
    ath({ id: 5, name: "Ann Dee", gender: "f", hometown: "Bolton, England" }),
  ],
  stats: [st(1, 6), st(2, 9), st(3, 2), st(4, 6)],
  awards: [
    { athlete_id: 1, award_name: "Player of the Week", kind: "award", occurred_on: "2026-10-06", summary: "" },
    { athlete_id: 2, award_name: "Player of the Week", kind: "award", occurred_on: "2026-09-29", summary: "" },
    { athlete_id: 1, award_name: "milestone:goals:5", kind: "milestone", occurred_on: "2026-10-20", summary: "" },
  ],
  schools: [{ name: "Barton College", common_name: "Barton" }, { name: "Chowan University", common_name: "Chowan" }],
};
const at = new Date("2026-10-22T08:00:00Z");
const me = ed.athletes[0];
ok(town("Bolton, England") === "Bolton" && nation("Ayr, Scotland") === "Scotland" && nation("Sheffield, UK") === null, "town and home nation");
ok(rankLine(me, ed) === "Robbie Deighan's 6 goals rank joint 2nd among the 4 British players in NCAA Division II men's soccer with stats on file this season (school stats pages, as of 21 October 2026)",
  "rank among ours, ties, the pool named — never «the most by a British player»");
ok(rankLine(ed.athletes[1], ed)?.includes("are the most among the 4 British players") === true, "first place");
ok(teamLine(me, ed) === "Chowan's 2 British men's soccer players with appearances have scored 8 goals between them this season (stats page, as of 21 October 2026)",
  "the team's British players, women's team kept apart");
ok(homeLine(me, ed, at) === "Robbie Deighan is one of 2 men's soccer players from Bolton at Conference Carolinas schools this season (our rosters, as of 22 October 2026)",
  "hometown: the narrowest group of 2+");
ok(homeLine(ed.athletes[2], ed, at) === null, "alone from Leeds: no line");
ok(classLine(ed.athletes[2], ed, at)?.includes("one of 2 British first-year players in NCAA Division II men's soccer") === true, "the first-year class");
ok(classLine(me, ed, at) === null, "not a first-year: no line");
ok(awardsLine(me, ed) === "British players across all sports have won 2 Conference Carolinas weekly or monthly awards this season (our records)", "awards in the conference");
ok(milestoneLine(me, ed, at) === "Robbie Deighan reached 5 goals for the season (school stats page, 20 October 2026)", "a recent milestone");
ok(milestoneLine(me, ed, new Date("2026-10-30T08:00:00Z")) === null, "an old milestone is not news");
ok(schoolKey("The University of Barton") === "barton" && schoolKey("Barton College") === "barton", "school names normalised");
ok(opponentLine(me, "Barton", ed) === "Barton College's men's soccer roster includes 1 British player: Tom Ash (Bolton)", "the opponent's British players");
ok(opponentLine(me, "Chowan", ed) === null && opponentLine(me, "Nowhere State", ed) === null, "own school or no match: nothing");
ok(enrichmentLines(1, "Barton", ed, at).length === 4 && enrichmentLines(1, "Barton", ed, at)[0].includes("reached 5 goals"), "at most four, milestone first");
ok(enrichmentLines(999, null, ed, at).length === 0, "unknown athlete: nothing");

// ─── The leaderboard (src/lib/leaderboard.ts) ──────────────────────────────
ok(JSON.stringify(rankRows([5, 9, 5, 3], (n) => n).map((r) => r.rank)) === "[1,2,2,4]", "competition ranks with ties");
ok(shortDivision("NCAA D2") === "D2" && shortDivision("NAIA") === "NAIA", "short division");
ok(JSON.stringify(crossed(4, 11)) === "[5,10]" && crossed(5, 5).length === 0 && JSON.stringify(crossed(0, 1)) === "[1]", "milestones crossed");
ok(milestoneEvent("goals", 10).summary === "Reached 10 goals for the season" && milestoneEvent("shutouts", 1).summary === "First clean sheet of the season", "milestone lines");
ok(milestoneEvent("goals", 1, "da").summary === "Sæsonens første mål", "Danish milestone line");
const bi = (athlete_id: number, goals: number, o: Partial<BoardInput> = {}): BoardInput => ({
  athlete_id, name: `P${athlete_id}`, slug: `p${athlete_id}`, university: "U", school: "U", sport: "soccer", gender: "m",
  division: "NCAA D1", kind: "outfield", games: 10, goals, assists: 0, shutouts: 0, ...o,
});
const board = buildLeaderboard("UK", "2026-10-22", [bi(1, 9), bi(2, 7), bi(3, 7), bi(4, 0), bi(5, 3, { gender: "f" })], [bi(1, 6), bi(2, 7)], "2026-10-15");
const men = board.tables.find((t) => t.gender === "m" && t.stat === "goals")!;
ok(men.rows.map((r) => `${r.rank}${r.tied ? "=" : ""}:${r.slug}`).join(" ") === "1:p1 2=:p2 2=:p3", "ranked, tied, zero left out");
ok(men.rows[0].prevRank === 2 && men.rows[1].prevRank === 1 && men.rows[2].prevRank === null, "movement against last week");
ok(board.tables.some((t) => t.gender === "f") && !board.tables.some((t) => t.stat === "assists"), "one table per gender; empty stats skipped");
ok(board.tables.every((t) => t.division === null), "one division only: no division tables");
const split = buildLeaderboard("UK", "2026-10-22", [bi(1, 9), bi(2, 7, { division: "NCAA D2" }), bi(3, 5, { division: "NCAA D2" })], null, null);
const menGoals = split.tables.filter((t) => t.gender === "m" && t.stat === "goals");
ok(menGoals.map((t) => t.division ?? "national").join(",") === "national,D1,D2", "national table, then each division");
ok(menGoals[2].rows.map((r) => `${r.rank}:${r.slug}`).join(" ") === "1:p2 2:p3", "a division ranks on its own");

// ─── Awards: tally, duplicates, the Instagram roundup ──────────────────────
const aw = (athlete_id: number, award_name: string, occurred_on: string, o: Partial<AwardInput> = {}): AwardInput => ({
  athlete_id, name: `A${athlete_id}`, slug: `a${athlete_id}`, school: "S", conference: "Patriot League", sport: "field-hockey",
  gender: "f", award_name, occurred_on, source_url: null, ...o,
});
const dup = dedupeAwards([aw(1, "Rookie of the Week/Month", "2026-10-07"), aw(1, "Rookie of the Week/Month", "2026-10-05"), aw(1, "Rookie of the Week/Month", "2026-10-19")]);
ok(dup.length === 2 && dup[0].occurred_on === "2026-10-05", "release and our article within 4 days: one award, the earliest kept");
ok(dedupeAwards([aw(1, "Player of the Week", "2026-10-05"), aw(2, "Player of the Week", "2026-10-05")]).length === 2, "two athletes the same week: two awards");
const tally = buildAwardTally("UK", "2026-27", "2026-10-22", [aw(1, "Player of the Week", "2026-10-05"), aw(1, "Player of the Week", "2026-10-06"),
  aw(2, "All-American", "2026-09-30", { conference: "Ivy League" }), aw(3, "Player of the Year", "", { occurred_on: null })]);
ok(tally.total === 3 && tally.athletes === 3, "counted after the merge; an undated award counts");
ok(tally.months.map((m) => `${m.month}:${m.count}`).join(",") === "2026-10:1,2026-09:1", "months newest first, undated left out");
ok(tally.byConference[0].conference === "Patriot League" && tally.byConference[0].count === 2, "by conference (the undated award counts too)");
ok(previousMonth(new Date("2026-11-01T09:00:00Z")) === "2026-10" && previousMonth(new Date("2027-01-01T09:00:00Z")) === "2026-12", "the roundup's month");
const win = (athlete_id: number, award_name: string, handle: string | null, occurred_on = "2026-10-05"): Winner =>
  ({ athlete_id, name: `W${athlete_id}`, school: "S", conference: "Big Ten", award_name, occurred_on, handle });
const ws = [win(1, "Player of the Week", "@Ann.B"), win(1, "Player of the Week", "ann.b", "2026-10-12"), win(2, "All-American", null), win(3, "Player of the Week", "bad handle!")];
ok(JSON.stringify(tagsFor(ws)) === '["ann.b"]', "tags: own handles, normalised, unique, invalid dropped");
const wl = winnerLines(ws, "en");
ok(wl[0].name === "W2" && wl[1].awards === "2× Player of the Week", "biggest honour first; repeats merged");
const cap = captionFor(ws, "2026-10", "en");
ok(cap.startsWith("October 2026: 4 awards for 3 British athletes") && cap.includes("W1 (@ann.b) — 2× Player of the Week, Big Ten") && cap.endsWith("link in bio."), "caption");
ok(captionFor(ws, "2026-10", "da").startsWith("Oktober 2026: 4 priser til 3 danske atleter"), "Danish caption");
ok(tagPositions(Array.from({ length: 25 }, (_, i) => `u${i}`)).length === 20 && tagPositions(["a"])[0].y >= 0.5, "max 20 tags, in the lower half");

// The weekly update of the leaderboard (src/lib/leaderboard-week.ts).
{
  const now = [bi(1, 9), bi(2, 7), bi(3, 7), bi(6, 5), bi(5, 3, { gender: "f" }), bi(9, 0, { kind: "keeper", shutouts: 4 })];
  const before = [bi(1, 6), bi(2, 7), bi(6, 0), bi(5, 1, { gender: "f" }), bi(9, 0, { kind: "keeper", shutouts: 3 })];
  const wk = buildLeaderboardWeek("UK", "2026-10-27", "2026-11-03", now, before,
    [{ name: "P1", slug: "p1", school: "U", stat: "goals", n: 5 }])!;
  const menGoals = wk.leaders.find((l) => l.gender === "m" && l.stat === "goals")!;
  ok(menGoals.slug === "p1" && menGoals.isNew && menGoals.gained === 3, "a new leader, with the week's gain");
  ok(!wk.leaders.find((l) => l.gender === "f")!.isNew, "a kept lead is not new");
  ok(wk.climbers.some((c) => c.slug === "p6" && c.prevRank === null), "known a week ago at 0 → entered the top 10");
  ok(!wk.climbers.some((c) => c.slug === "p3"), "first seen this week → not «new», we just had not read them");
  ok(wk.best.goals!.map((b) => `${b.slug}:${b.gained}`).join(" ") === "p6:5 p1:3 p5:2" && wk.best.shutouts![0].gained === 1, "the best week per stat");
  ok(wk.active === 4, "players who added to a total");
  const en = weekSections(wk, "en").map((s) => `${s.heading}|${s.lines.map(plain).join(" / ")}`);
  ok(en[0].includes("P1 (U) went top of the men's") && en[0].includes("with 9 goals, 3 of them this week."), "leader sentence");
  ok(en.some((s) => s.includes("P6 (U) entered the top 10 of the men's")), "climber sentence");
  ok(en.some((s) => s.startsWith("Milestones|P1 (U) reached 5 goals for the season.")), "milestone sentence");
  const da = weekSections(wk, "da").map((s) => s.lines.map(plain).join(" / ")).join(" / ");
  ok(da.includes("P1 (U) overtog førstepladsen for mål i herrernes") && da.includes("Flest mål i ugen: P6"), "Danish sentences");
  ok(weekHeadline(wk, "en").startsWith("P1 goes top in men's"), "headline: the new leader");
  ok(buildLeaderboardWeek("UK", "2026-10-27", "2026-11-03", before, before, []) === null, "nothing moved → no page");
  if (process.env.SHOW) console.log(en.join("\n"));
}

console.log(`records: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
