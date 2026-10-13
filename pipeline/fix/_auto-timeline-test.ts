/** Tests for the short-draft guardrails. Run: npx tsx pipeline/fix/_auto-timeline-test.ts */
import { whyNot, type ShortDraft } from "./auto-timeline";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

const src = "Jane Doe scored in the 12th minute as Example beat Other 1-0.";
const row: ShortDraft = {
  id: 1, title: "Jane Doe scores in win over Other", country: "UK", article_type: "season_update",
  content: "Jane Doe, the junior forward from Leeds, scored in the 12th minute as Example beat Other 1-0, according to the university's athletics website.",
  source_url: "https://example.edu/news/2026/10/6/x.aspx", fact_sheet: JSON.stringify({ stats: [{ text: src }] }),
  content_raw: src, summary: null, athlete_name: "Jane Doe", gender: "f", class_year: "Jr.", expected_graduation: null,
  sport: "soccer", position: "F", university: "Example University", hometown: "Leeds, England", previous_school: null,
  companions: "[]", merged_sources: "[]", athlete_id: 9, preferred_name: null, sensitive: null,
};

expect("clean short draft goes up", whyNot(row), null);
expect("long draft is not a line", whyNot({ ...row, content: "word ".repeat(140) }), "not under the word floor");
expect("no source, no line", whyNot({ ...row, source_url: null }), "no source to link to");
expect("sensitive stays", whyNot({ ...row, sensitive: "personal" }), "flagged sensitive (personal)");
expect("invented number stays", whyNot({ ...row, title: "Jane Doe scores twice in 3-0 win" })?.startsWith("mechanical check"), true);
expect("addition is never a line", whyNot({ ...row, article_type: "addition" }), "not under the word floor");

console.log(`auto-timeline: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
