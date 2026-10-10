/** Tests for the automatic editor's guardrails. Run: npx tsx pipeline/fix/_auto-editor-test.ts */
import { buildEditorPack, guard, parseVerdict, type EditorRow } from "./auto-editor";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

const row: EditorRow = {
  id: 1, title: "Jane Doe scores", content: "x", country: "UK", article_type: "season_update",
  source_url: "https://example.edu/news", fact_sheet: JSON.stringify({ stats: [{ text: "Jane Doe scored in the 12th minute" }] }),
  content_raw: "Jane Doe scored in the 12th minute as Example beat Other 1-0.", summary: null,
  athlete_name: "Jane Doe", gender: "f", class_year: "Jr.", expected_graduation: null, sport: "soccer",
  position: "F", university: "Example University", hometown: "Leeds, England", previous_school: null,
  companions: "[]", merged_sources: "[]", athlete_id: 9, preferred_name: null, headline: "Example beat Other", sensitive: null,
};

// parseVerdict: only complete answers count
expect("publish parsed", parseVerdict('{"action":"publish","title":"T","summary":"S","content":"C"}')?.action, "publish");
expect("prose around JSON tolerated", parseVerdict('Here:\n{"action":"reject","reason":"dup"}\n')?.action, "reject");
expect("publish without content is no verdict", parseVerdict('{"action":"publish","title":"T","summary":"S"}'), null);
expect("reject without reason is no verdict", parseVerdict('{"action":"reject"}'), null);
expect("unknown action is no verdict", parseVerdict('{"action":"approve","reason":"x"}'), null);
expect("broken JSON is no verdict", parseVerdict('{"action":"hold",'), null);
expect("no JSON at all", parseVerdict("I cannot decide this."), null);

// guard: the machine never decides what it shouldn't
expect("no verdict → hold", guard(row, null).action, "hold");
expect("sensitive → hold even if model says publish",
  guard({ ...row, sensitive: "injury" }, { action: "publish", title: "T", summary: "S", content: "C" }).action, "hold");
expect("reject passes through", guard(row, { action: "reject", reason: "dup" }), { action: "reject", reason: "dup" });
expect("clean publish passes",
  guard(row, { action: "publish", title: "Jane Doe scores as Example beat Other", summary: "Jane Doe scored.",
    content: "Jane Doe, the junior forward from Leeds, scored in the 12th minute as Example beat Other 1-0, according to the university's athletics website." }).action,
  "publish");
expect("invented quote → hold",
  guard(row, { action: "publish", title: "Jane Doe scores", summary: "s",
    content: 'Jane Doe scored. "It was the best night of my life," Coach Smith said.' }).action,
  "hold");

// pack: duplicates and rules are in front of the model
const pack = buildEditorPack(row, [{ title: "Jane Doe scores again", published_at: "2026-10-01", published: 1 }]);
expect("pack lists prior article", pack.includes("PUBLISHED 2026-10-01 «Jane Doe scores again»"), true);
expect("pack has Northern Ireland rule", pack.includes("Northern Ireland is a place only"), true);
expect("pack shows source before draft", pack.indexOf("example.edu/news") < pack.indexOf("## The draft"), true);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
