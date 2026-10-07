/**
 * Facts from our own records: the national angle and our earlier articles.
 * Run: npx tsx pipeline/generate/_records-test.ts
 */
import type { FactSheet } from "./build-factsheet";
import { renderFactSheet } from "./build-factsheet";
import { recordsNote } from "./draft-dossier";
import { earlierLines, rosterLabel, rosterLine, withRecords } from "./records";

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
ok(rosterLine("X", 3, "DE", "Y", "soccer", "m", asOf) === null, "a collecting country without a site gets no line");

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

console.log(`records: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
