/**
 * The word floor (timeline-entry.ts) and the profile timeline (profile-timeline.ts).
 * Run: npx tsx src/lib/_timeline-test.ts
 */
import { becomesTimelineEntry, timelineDate, timelineLine, timelineParams, wordCount } from "./timeline-entry";
import { buildTimeline } from "./profile-timeline";
import type { AthleteEventRow } from "./athlete-events";
import { hubLines, recordsOf, statColumns } from "./athlete-hub";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

// The floor: UK only, final text, never an addition or an athlete-less draft.
ok(wordCount("  one two\n\nthree ") === 3, "words are whitespace tokens");
ok(becomesTimelineEntry({ country: "UK", article_type: "season_update", content: words(75), athlete_id: 1 }), "75 words on .co.uk → a line");
ok(!becomesTimelineEntry({ country: "UK", article_type: "season_update", content: words(100), athlete_id: 1 }), "100 words stays an article");
ok(becomesTimelineEntry({ country: "DK", article_type: "season_update", content: words(170), athlete_id: 1 }), ".dk: 170 words is a line");
ok(!becomesTimelineEntry({ country: "DK", article_type: "season_update", content: words(175), athlete_id: 1 }), ".dk: 175 words is an article");
ok(!becomesTimelineEntry({ country: "UK", article_type: "addition", content: words(40), athlete_id: 1 }), "an addition is appended, not a line");
ok(!becomesTimelineEntry({ country: "UK", article_type: "news", content: words(40), athlete_id: null }), "no athlete, no profile to put it on");
ok(!becomesTimelineEntry({ country: null, article_type: "news", content: words(40), athlete_id: 1 }), "no country, no floor");

// The line: the approved headline without the name.
ok(timelineLine("Lucy Trinder named Metro Conference Rookie of the Week", "Lucy Trinder") === "Named Metro Conference Rookie of the Week", "name taken off, capitalised");
ok(timelineLine("Lucy Trinder's double sinks Siena", "Lucy Trinder") === "Lucy Trinder's double sinks Siena", "a possessive keeps the name");
ok(timelineLine("Dudley runner Amelia Jones makes CACC Honor Roll", "Amelia Jones") === "Dudley runner Amelia Jones makes CACC Honor Roll", "a name further in stays");
ok(timelineLine("lucy trinder scores", "Lucy Trinder") === "Scores", "case-insensitive match");

// The date: the event's own when it has a year.
ok(timelineDate(JSON.stringify({ event: { date: "September 26, 2026" } }), "2026-10-12T10:00:00Z") === "2026-09-26", "event date");
ok(timelineDate(JSON.stringify({ event: { date: "Sat. Sept. 26" } }), "2026-10-12T10:00:00Z") === "2026-10-12", "no year → publish date");
ok(timelineDate("not json", "2026-10-12T10:00:00Z") === "2026-10-12", "broken sheet → publish date");

// The row: an award keeps its canonical name; anything else is a routine result.
const award = timelineParams({ athlete_id: 7, athlete_name: "Lucy Trinder", title: "Lucy Trinder named Metro Conference Rookie of the Week",
  source_url: "https://x/a", fact_sheet: null }, "2026-10-06T09:00:00Z");
ok(award[3] === "award" && award[4] === "Rookie of the Week/Month", "award kind and name");
ok(award[5] === "Named Metro Conference Rookie of the Week" && award[1] === "2026-10-06", "award line and date");
const result = timelineParams({ athlete_id: 8, athlete_name: "Joseph O'Brien", title: "Joseph O'Brien finishes ninth at Princeton Meadows Challenge",
  source_url: null, fact_sheet: JSON.stringify({ event: { date: "September 26, 2026" } }) }, "2026-10-12T09:00:00Z");
ok(result[3] === "result" && result[4] === null && result[6] === "routine", "a result is routine, no award name");
ok(result[5] === "Finishes ninth at Princeton Meadows Challenge" && result[1] === "2026-09-26", "result line, event date");

// The profile timeline.
const ev = (o: Partial<AthleteEventRow> & { article_id?: number | null }): AthleteEventRow & { article_id?: number | null } => ({
  id: 1, season: "2026-27", kind: "award", award_name: null, summary: "", significance: "notable", source_url: null, occurred_on: null, ...o,
});
const rows = buildTimeline(
  [
    ev({ id: 1, award_name: "Rookie of the Week/Month", summary: "Rookie of the Week/Month", occurred_on: "2026-10-06", article_id: 532 }),
    ev({ id: 2, award_name: "MVP", summary: "MVP", significance: "honor", season: "2025-26" }),
    ev({ id: 3, kind: "result", summary: "Finishes ninth at Princeton Meadows Challenge", occurred_on: "2026-09-26", source_url: "https://src" }),
  ],
  [
    { id: 532, title: "Lucy Trinder named Metro Conference Rookie of the Week", published_at: "2026-10-06 12:00:00" },
    { id: 192, title: "Lucy Trinder scores first collegiate goal", published_at: "2026-08-31 10:00:00" },
  ],
  "Lucy Trinder", "en", (a) => `/football/${a.id}`,
);
ok(rows.map((r) => r.key).join(",") === "a532,e3,a192,e2", "newest first, undated honour last, harvested twin dropped");
ok(rows[0].text === "Named Metro Conference Rookie of the Week" && rows[0].href === "/football/532" && !rows[0].external, "article row links inside");
ok(rows[1].text === "Finishes ninth at Princeton Meadows Challenge" && rows[1].external, "kept line keeps its sentence and source");
ok(rows[3].text === "MVP" && rows[3].honor && rows[3].date === null, "honour shows its canonical name by season");

// The hub lines on the profile (athlete-hub.ts): the pipeline's own wording, parsed back.
const hub = hubLines([
  "Robbie Deighan is one of 7 British players on Chowan University's men's soccer roster (as of 7 October 2026)",
  "Chowan University's season statistics (stats page, 8 October 2026): Robbie Deighan has 6 goals and 2 assists in 11 games — the team lead in goals",
  "NCAA statistics through games of 6 October 2026: Chowan rank tied for 1st in Division II men's soccer for goals per game (3.64, 11 games)",
]);
ok(hub.length === 2, "season and ranking, not the roster line");
ok(hub[0].text === "6 goals and 2 assists in 11 games — the team lead in goals" && hub[0].source === "Chowan University stats page, 8 October 2026", "season line and its source");
ok(hub[1].text === "Chowan: tied for 1st in Division II men's football for goals per game (3.64, 11 games)", "ranking, British wording");
ok(hubLines(["Our earlier article: «X»", "anything else"]).length === 0, "unknown lines are dropped");
ok(recordsOf(JSON.stringify({ records: [{ text: "a" }, { text: 3 }] })).join() === "a" && recordsOf("{").length === 0, "records read defensively");

// The stats table on the profile (athlete_season_stats → statColumns).
const out = statColumns("outfield", JSON.stringify({ player: "Deighan, Robbie", gp: "11", gs: "9", min: "", g: "6", a: "2", pts: "14", sh: "-", sog: "12" }), "en");
ok(out.map((c) => `${c.label}=${c.value}`).join(",") === "Games=11,Starts=9,Goals=6,Assists=2,Points=14,On target=12", "empty and dash cells left out, page order kept");
const kp = statColumns("keeper", JSON.stringify({ gp: "10", ga: "9", gaa: "0.91", sv: "41", "sv%": ".820", "sho/cbo": "4/1" }), "da");
ok(kp.map((c) => c.label).join(",") === "Kampe,Mål imod,Pr. kamp,Redninger,Rednings-%,Clean sheets", "keeper columns in Danish, alternative header names");
ok(statColumns("outfield", "{", "en").length === 0, "unreadable cells → no table");

console.log(`\ntimeline: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
