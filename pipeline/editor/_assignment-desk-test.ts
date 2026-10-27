/** Tests for the assignment desk's parsing and guards. Run: npx tsx pipeline/editor/_assignment-desk-test.ts */
import { ageDays, applyRules, batches, briefText, buildDeskPack, guardDesk, lineParams, parseDesk, STATUS_FOR, type DeskStory, type DeskVerdict } from "./assignment-desk";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

// parseDesk: only complete verdicts for asked stories count
const answer = `Here you go:
[{"story_id":1,"decision":"article","words":320,"priority":4,"event_date":"2026-10-19","article_type":"season_update","angle":"Third goal in three games","line":"Scored in a 2-1 win.","reason":"decisive"},
 {"story_id":2,"decision":"line","words":60,"priority":1,"event_date":null,"line":"Named to the preseason All-GSC team.","reason":"a list"},
 {"story_id":3,"decision":"fold","fold_into":"story:1","reason":"same match"},
 {"story_id":4,"decision":"skip","reason":"preview"},
 {"story_id":5,"decision":"hold","reason":"illness"},
 {"story_id":99,"decision":"skip","reason":"not asked"}]`;
const v = parseDesk(answer, [1, 2, 3, 4, 5]);
expect("all five asked parsed", v.map((x) => x.decision), ["article", "line", "fold", "skip", "hold"]);
expect("unasked story dropped", v.some((x) => x.story_id === 99), false);
expect("article keeps its priority", v[0].priority, 4);
expect("article keeps its event date", v[0].event_date, "2026-10-19");
expect("a line without a date is allowed", v[1].event_date, null);
expect("no array is no verdicts", parseDesk("I think article", [1]), []);
expect("broken JSON is no verdicts", parseDesk('[{"story_id":1,', [1]), []);
const art = (extra: string) => `[{"story_id":1,"decision":"article","words":300,"priority":3,"event_date":"2026-10-19","article_type":"news","angle":"a","line":"l","reason":"r"${extra}}]`;
expect("complete article parsed", parseDesk(art(""), [1])[0]?.words, 300);
expect("article without angle dropped", parseDesk(art(',"angle":""'), [1]), []);
expect("article with an unknown type dropped", parseDesk(art(',"article_type":"blog"'), [1]), []);
expect("feature is no longer a type (no articles from a school's prose)", parseDesk(art(',"article_type":"feature"'), [1]), []);
expect("priority out of range dropped", parseDesk(art(',"priority":9'), [1]), []);
expect("article without words dropped", parseDesk(art(',"words":"many"'), [1]), []);
expect("article without a line dropped", parseDesk(art(',"line":""'), [1]), []);
expect("a date that isn't a date dropped", parseDesk(art(',"event_date":"last Saturday"'), [1]), []);
expect("line without text dropped", parseDesk('[{"story_id":1,"decision":"line","words":50,"priority":1,"reason":"r"}]', [1]), []);
expect("line without words dropped", parseDesk('[{"story_id":1,"decision":"line","priority":1,"line":"l","reason":"r"}]', [1]), []);
expect("a line keeps its follow-up", parseDesk('[{"story_id":1,"decision":"line","words":170,"priority":5,"line":"l","follow_up":"ask about the season","reason":"r"}]', [1])[0]?.follow_up, "ask about the season");
expect("an article carries no follow-up", parseDesk(art(',"follow_up":"x"'), [1])[0]?.follow_up, null);
expect("fold to a vague target dropped", parseDesk('[{"story_id":1,"decision":"fold","fold_into":"the other one","reason":"r"}]', [1]), []);
expect("fold to an article kept", parseDesk('[{"story_id":1,"decision":"fold","fold_into":"article:812","reason":"r"}]', [1])[0]?.fold_into, "article:812");
expect("unknown decision dropped", parseDesk('[{"story_id":1,"decision":"maybe","reason":"r"}]', [1]), []);
expect("no reason dropped", parseDesk('[{"story_id":1,"decision":"skip"}]', [1]), []);
expect("duplicate answer: first kept", parseDesk('[{"story_id":1,"decision":"skip","reason":"a"},{"story_id":1,"decision":"hold","reason":"b"}]', [1])[0].decision, "skip");

// ageDays: from the event to the day the story was found
expect("found the next day = 1", ageDays("2026-10-24", "2026-10-25 01:12:00"), 1);
expect("found the same day = 0", ageDays("2026-10-24", "2026-10-24 23:00:00"), 0);
expect("no date, no age", ageDays(null, "2026-10-25"), null);

// applyRules: Mikkel's rule and his answers to the hypotheticals (brief.md, «The quiz»).
// Story found on 2026-10-25; an event on the 24th is 1 day old.
const FOUND = "2026-10-25 06:00:00";
const a = (words: number, priority: number, event_date: string | null = "2026-10-24"): DeskVerdict =>
  ({ story_id: 1, decision: "article", article_type: "season_update", priority, angle: "x", line: "l", fold_into: null, words, event_date, follow_up: null, reason: "r" });
const rule = (x: DeskVerdict) => applyRules(x, FOUND).decision;
expect("250 words is always an article", rule(a(250, 1)), "article");
expect("quiz: UK goal in a 3-1 loss + coach quote, 230 words, p3 → article", rule(a(230, 3)), "article");
expect("quiz: DK golfer T12 with the day's best round, 220 words, p3 → article", rule(a(220, 3)), "article");
expect("quiz: UK assist in a 1-1 draw, 210 words, p2 → line", rule(a(210, 2)), "line");
expect("quiz: DK assist in a 1-1 draw, 210 words, p3 → article", rule(a(210, 3)), "article");
expect("7th in a track final, 220 words, p1 → line", rule(a(220, 1)), "line");
expect("quiz: All-American on thin material, 180 words, p5 → line", rule(a(180, 5)), "line");
expect("quiz: a goal in a win, 260 words, 9 days old → line", rule(a(260, 3, "2026-10-16")), "line");
expect("simple stat 2 days old → line", rule(a(300, 3, "2026-10-23")), "line");
expect("big news 3 days old → still an article", rule(a(300, 4, "2026-10-22")), "article");
expect("big news 4 days old → line", rule(a(300, 5, "2026-10-21")), "line");
expect("quiz: Tuesday roundup of Saturday's brace → line", applyRules(a(280, 3, "2026-10-24"), "2026-10-27 01:00:00").decision, "line");
expect("no date: freshness can't be judged, length decides", rule(a(300, 3, null)), "article");
expect("a demoted article keeps its line", applyRules(a(150, 5), FOUND).line, "l");
expect("a demoted article drops its type", applyRules(a(150, 5), FOUND).article_type, null);
expect("the length reason says why", applyRules(a(150, 5), FOUND).reason.startsWith("length rule"), true);
expect("the freshness reason says why", applyRules(a(300, 3, "2026-10-16"), FOUND).reason.startsWith("freshness rule"), true);
expect("a line is never promoted", rule({ ...a(400, 5), decision: "line" }), "line");
expect("guardDesk applies the rules", guardDesk(a(120, 4), { sensitive: null, discovered_at: FOUND }).decision, "line");

// guardDesk: a sensitive story is never assigned by the machine
const S = (sensitive: string | null) => ({ sensitive, discovered_at: "2026-10-19 12:00:00" });
expect("sensitive article becomes hold", guardDesk(v[0], S("health")).decision, "hold");
expect("sensitive line becomes hold", guardDesk(v[1], S("health")).decision, "hold");
expect("sensitive skip stays skip", guardDesk(v[3], S("health")).decision, "skip");
expect("plain fresh story untouched", guardDesk(v[0], S(null)), v[0]);

// batches: an athlete is never split, a batch stays under the size
const st = (id: number, athlete_id: number, d = "2026-10-20 08:00:00") => ({ id, athlete_id, discovered_at: d });
const b = batches([st(1, 7), st(2, 7), st(3, 8), st(4, 9), st(5, 9), st(6, 9)], 4);
expect("athletes kept whole", b.map((x) => x.map((g) => g.map((s) => s.id))), [[[1, 2], [3]], [[4, 5, 6]]]);
const perDay = batches([st(1, 7, "2026-10-20 08:00:00"), st(2, 7, "2026-10-22 08:00:00")], 8, (s) => `${s.athlete_id}:${s.discovered_at.slice(0, 10)}`);
expect("backtest key splits an athlete by day", perDay[0].length, 2);

// the brief: the evidence section never reaches the model
expect("evidence cut", briefText("rules\n<!-- evidence: x -->\nnumbers").includes("numbers"), false);
expect("the real brief has the decisions", ["article", "line", "fold", "skip", "hold"].every((d) => briefText().includes(`**${d}**`)), true);
expect("the quiz table stays out of the prompt", briefText().includes("The quiz"), false);
// Backtest 2026-10-27: the model judged freshness against TODAY, not the day
// found, and made 101 fresh stories into lines. The code applies it; the
// brief must say so.
expect("the brief keeps freshness out of the model's hands", briefText().includes("Do not judge freshness yourself"), true);

// the pack names every story so the answer can refer to it
const story: DeskStory = {
  id: 41, athlete_id: 7, headline: "Smith scores twice", summary: null, content_raw: "Jane Smith scored twice.", source_url: "https://x.edu/a",
  discovered_at: "2026-10-20 08:00:00", relevance_score: 95, sensitive: null, athlete_name: "Jane Smith", sport: "soccer",
  university: "X University", home_country: "UK", class_year: "Jr.", position: "F", hometown: "Leeds, England",
};
const pack = buildDeskPack([{ stories: [story], ctx: { articles: [{ id: 5, title: "Smith scores", published_at: "2026-10-12" }], earlier: [], events: [] } }], "BRIEF", new Map([[41, ["Amy Jones"]]]));
expect("pack names the story", pack.includes("story:41"), true);
expect("pack names the earlier article", pack.includes("article:5"), true);
expect("pack counts the stories", pack.includes("(1 of them)"), true);
expect("pack names our other athlete in the same source", pack.includes("Also ours in this source: Amy Jones"), true);

// live (2026-10-27): what a decision does to the story and the profile
expect("article is not in STATUS_FOR: it stays new for drafting", "article" in STATUS_FOR, false);
expect("skip leaves the queue", STATUS_FOR.skip, "skipped");
expect("hold leaves the queue", STATUS_FOR.hold, "held");
const lineV: DeskVerdict = { story_id: 41, decision: "line", article_type: null, priority: 2, angle: null, line: "Jane Smith named to the preseason All-GSC team", fold_into: null, words: 60, event_date: "2026-10-18", follow_up: null, reason: "r" };
const lp = lineParams(lineV, story);
expect("line: the athlete", lp[0], 7);
expect("line: dated by the event", lp[1], "2026-10-18");
expect("line: the name taken off the front", lp[5], "Named to the preseason All-GSC team");
expect("line: the source kept", lp[7], "https://x.edu/a");
expect("line without an event date: dated by the source or the day found", lineParams({ ...lineV, event_date: null }, story)[1], "2026-10-20");
expect("the brief asks for lines in the site's language", briefText().includes("Danish for a DK athlete"), true);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
