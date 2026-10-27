/** Tests for the assignment desk's parsing and guards. Run: npx tsx pipeline/editor/_assignment-desk-test.ts */
import { applyLengthRule, batches, briefText, buildDeskPack, guardDesk, parseDesk, type DeskStory, type DeskVerdict } from "./assignment-desk";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

// parseDesk: only complete verdicts for asked stories count
const answer = `Here you go:
[{"story_id":1,"decision":"article","words":320,"article_type":"season_update","priority":4,"angle":"Third goal in three games","line":"Scored in a 2-1 win.","reason":"decisive"},
 {"story_id":2,"decision":"line","words":60,"priority":1,"line":"Named to the preseason All-GSC team.","reason":"a list"},
 {"story_id":3,"decision":"fold","fold_into":"story:1","reason":"same match"},
 {"story_id":4,"decision":"skip","reason":"preview"},
 {"story_id":5,"decision":"hold","reason":"illness"},
 {"story_id":99,"decision":"skip","reason":"not asked"}]`;
const v = parseDesk(answer, [1, 2, 3, 4, 5]);
expect("all five asked parsed", v.map((x) => x.decision), ["article", "line", "fold", "skip", "hold"]);
expect("unasked story dropped", v.some((x) => x.story_id === 99), false);
expect("article keeps its priority", v[0].priority, 4);
expect("no array is no verdicts", parseDesk("I think article", [1]), []);
expect("broken JSON is no verdicts", parseDesk('[{"story_id":1,', [1]), []);
const art = (extra: string) => `[{"story_id":1,"decision":"article","words":300,"article_type":"news","priority":3,"angle":"a","line":"l","reason":"r"${extra}}]`;
expect("complete article parsed", parseDesk(art(""), [1])[0]?.words, 300);
expect("article without angle dropped", parseDesk(art(',"angle":""'), [1]), []);
expect("article with an unknown type dropped", parseDesk(art(',"article_type":"blog"'), [1]), []);
expect("priority out of range dropped", parseDesk(art(',"priority":9'), [1]), []);
expect("article without words dropped", parseDesk(art(',"words":"many"'), [1]), []);
expect("article without a line dropped", parseDesk(art(',"line":""'), [1]), []);
expect("line without text dropped", parseDesk('[{"story_id":1,"decision":"line","words":50,"priority":1,"reason":"r"}]', [1]), []);
expect("line without words dropped", parseDesk('[{"story_id":1,"decision":"line","priority":1,"line":"l","reason":"r"}]', [1]), []);

// applyLengthRule: Mikkel's 250 / 200-249-if-big / under-200 rule, only ever down
const a = (words: number, priority: number): DeskVerdict => ({ story_id: 1, decision: "article", article_type: "season_update", priority, angle: "x", line: "l", fold_into: null, words, reason: "r" });
expect("250 words is always an article", applyLengthRule(a(250, 1)).decision, "article");
expect("230 words and a big story is an article", applyLengthRule(a(230, 4)).decision, "article");
expect("230 words and a small story is a line", applyLengthRule(a(230, 3)).decision, "line");
expect("150 words is a line, however big", applyLengthRule(a(150, 5)).decision, "line");
expect("a demoted article keeps its line", applyLengthRule(a(150, 5)).line, "l");
expect("a demoted article drops its type", applyLengthRule(a(150, 5)).article_type, null);
expect("the reason says why", applyLengthRule(a(150, 5)).reason.startsWith("length rule"), true);
expect("a line is never promoted", applyLengthRule({ ...a(400, 5), decision: "line" }).decision, "line");
expect("guardDesk applies the length rule", guardDesk(a(120, 4), { sensitive: null }).decision, "line");
expect("fold to a vague target dropped", parseDesk('[{"story_id":1,"decision":"fold","fold_into":"the other one","reason":"r"}]', [1]), []);
expect("fold to an article kept", parseDesk('[{"story_id":1,"decision":"fold","fold_into":"article:812","reason":"r"}]', [1])[0]?.fold_into, "article:812");
expect("unknown decision dropped", parseDesk('[{"story_id":1,"decision":"maybe","reason":"r"}]', [1]), []);
expect("no reason dropped", parseDesk('[{"story_id":1,"decision":"skip"}]', [1]), []);
expect("duplicate answer: first kept", parseDesk('[{"story_id":1,"decision":"skip","reason":"a"},{"story_id":1,"decision":"hold","reason":"b"}]', [1])[0].decision, "skip");

// guardDesk: a sensitive story is never assigned by the machine
expect("sensitive article becomes hold", guardDesk(v[0], { sensitive: "health" }).decision, "hold");
expect("sensitive line becomes hold", guardDesk(v[1], { sensitive: "health" }).decision, "hold");
expect("sensitive skip stays skip", guardDesk(v[3], { sensitive: "health" }).decision, "skip");
expect("plain story untouched", guardDesk(v[0], { sensitive: null }), v[0]);

// batches: an athlete is never split, a batch stays under the size
const st = (id: number, athlete_id: number, d = "2026-10-20 08:00:00") => ({ id, athlete_id, discovered_at: d });
const b = batches([st(1, 7), st(2, 7), st(3, 8), st(4, 9), st(5, 9), st(6, 9)], 4);
expect("athletes kept whole", b.map((x) => x.map((g) => g.map((s) => s.id))), [[[1, 2], [3]], [[4, 5, 6]]]);
const perDay = batches([st(1, 7, "2026-10-20 08:00:00"), st(2, 7, "2026-10-22 08:00:00")], 8, (s) => `${s.athlete_id}:${s.discovered_at.slice(0, 10)}`);
expect("backtest key splits an athlete by day", perDay[0].length, 2);

// the brief: the evidence section never reaches the model
expect("evidence cut", briefText("rules\n<!-- evidence: x -->\nnumbers").includes("numbers"), false);
expect("the real brief has the decisions", ["article", "line", "fold", "skip", "hold"].every((d) => briefText().includes(`**${d}**`)), true);

// the pack names every story so the answer can refer to it
const story: DeskStory = {
  id: 41, athlete_id: 7, headline: "Smith scores twice", summary: null, content_raw: "Jane Smith scored twice.", source_url: "https://x.edu/a",
  discovered_at: "2026-10-20 08:00:00", relevance_score: 95, sensitive: null, athlete_name: "Jane Smith", sport: "soccer",
  university: "X University", home_country: "UK", class_year: "Jr.", position: "F", hometown: "Leeds, England",
};
const pack = buildDeskPack([{ stories: [story], ctx: { articles: [{ id: 5, title: "Smith scores", published_at: "2026-10-12" }], earlier: [], events: [] } }], "BRIEF");
expect("pack names the story", pack.includes("story:41"), true);
expect("pack names the earlier article", pack.includes("article:5"), true);
expect("pack counts the stories", pack.includes("(1 of them)"), true);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
