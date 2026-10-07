/**
 * Weekly award → a section on the match report it honours.
 * Run: npx tsx pipeline/generate/_award-section-test.ts
 */
import type { FactSheet } from "./build-factsheet";
import { cleanSection, findParent, isWeeklyAward, nameCore, sectionPrompt, type ParentCandidate } from "./award-section";
import { appendAddition, updateLabel } from "../../src/lib/article-addition";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// ─── Which stories are weekly awards ────────────────────────────────────────
for (const h of [
  "Martin tabbed RMAC Goalkeeper of the Week",
  "Taylor Repeats As CAA Defensive Player Of The Week",
  "Atoyebi and Wright Recognized with GSC Weekly Honors",
  "John Ferry and Amelia Jones Make the CACC Weekly Honor Roll",
]) ok(isWeeklyAward(h), `weekly award: «${h}»`);
for (const h of [
  "Fullbrook named to ANNIKA Award Preseason Watch List",
  "Leia Edwards Earns Preseason All-Patriot League Honors",
  "Ochoa, Franco Score First Collegiate Goals as Warriors Shut Out Cal State East Bay",
]) ok(!isWeeklyAward(h), `not a weekly award: «${h}»`);

// ─── Name cores ─────────────────────────────────────────────────────────────
ok(nameCore("Colorado Mesa University") === "colorado mesa", "«Colorado Mesa University» → «colorado mesa»");
ok(nameCore("No. 14 Miami (Ohio)") === "miami", "rank and brackets are not part of the name");
ok(nameCore("Argent Financial Classic at Squire Creek") === "argent financial classic", "a venue after «at» is cut");
ok(nameCore("UNO") === null, "too short to be a name");
ok(nameCore(["Westminster"]) === null, "a non-string is no name, not a crash");

// ─── Finding the report ─────────────────────────────────────────────────────
const sheet = (opponent: unknown, competition: string | null = null): FactSheet => ({
  has_substance: true, event: { type: "Soccer", date: null, opponent: opponent as string, competition },
  result: null, stats: [], qualitative: [], quotes: [], other_facts: [], box_score_url: null,
});
const martinAward =
  "Martin tabbed RMAC Goalkeeper of the Week. Last week, Martin's efforts helped Fort Lewis defeat Westminster " +
  "University and Colorado Mesa University by identical 2-1 scores.";
const recap536: ParentCandidate = { id: 536, title: "Lucas Martin makes three saves as Fort Lewis beat Colorado Mesa 2-1", published: 1, articleType: "news", factSheet: sheet("Colorado Mesa University") };
const older: ParentCandidate = { id: 480, title: "Lucas Martin keeps clean sheet against Regis", published: 1, articleType: "news", factSheet: sheet("Regis University") };
ok(findParent(martinAward, [recap536, older])?.id === 536, "#555 → #536: the award names the report's opponent");
ok(findParent(martinAward, [older]) === null, "a report on a match the award does not name is not the parent");

const prevAward: ParentCandidate = { id: 500, title: "Martin named RMAC Goalkeeper of the Week", published: 1, articleType: "news", factSheet: sheet("Colorado Mesa University") };
ok(findParent(martinAward, [prevAward]) === null, "an earlier award article is never the parent");
const pending: ParentCandidate = { ...recap536, id: 600, articleType: "addition" };
ok(findParent(martinAward, [pending]) === null, "a pending addition is never the parent");

const golf: ParentCandidate = { id: 700, title: "Woodham claims first collegiate title", published: 0, articleType: "news", factSheet: sheet(null, "Argent Financial Classic at Squire Creek") };
ok(findParent("Woodham named Southland Golfer of the Week after winning the Argent Financial Classic", [golf])?.id === 700,
  "a golf award finds its tournament recap by the tournament's name");

const urquhart: ParentCandidate = { id: 520, title: "Urquhart scores as Jacksonville draw at Queens", published: 1, articleType: "news", factSheet: sheet("Queens University of Charlotte") };
ok(findParent("Urquhart's honor came after JU's 1-1 draw at Queens.", [urquhart])?.id === 520,
  "#553: «Queens University of Charlotte» is found as «Queens»");
const uccs: ParentCandidate = { id: 530, title: "Win at UCCS", published: 1, articleType: "news", factSheet: sheet("University of Colorado Colorado Springs") };
ok(findParent("Fort Lewis beat UCCS 2-1.", [uccs]) === null,
  "a name the release abbreviates («UCCS») is not guessed: own article");

// ─── The model's answer ─────────────────────────────────────────────────────
ok(cleanSection('"Martin was named the RMAC Goalkeeper of the Week."') === "Martin was named the RMAC Goalkeeper of the Week.", "quotes are stripped");
ok(cleanSection("## Award\nText") === null, "a heading is not a section");
ok(cleanSection('{"text": "x"}') === null, "JSON is not a section");
ok(cleanSection("x".repeat(800)) === null, "an essay is not a section");
const p = sectionPrompt("en", "Martin made three saves.", "- Named RMAC Goalkeeper of the Week");
ok(p.prompt.includes("already told") && p.prompt.includes("Martin made three saves.") && p.prompt.includes("RMAC"), "the prompt carries the article as already told and the new facts");

// ─── Applying it ────────────────────────────────────────────────────────────
const when = new Date("2026-10-07T10:00:00Z");
ok(updateLabel("en", when) === "Update, 7 October:", "English label");
ok(updateLabel("da", when) === "Opdatering 7. oktober:", "Danish label");
ok(appendAddition("Body.\n", "Martin was named Goalkeeper of the Week.", { live: true, lang: "en", when }) ===
  "Body.\n\n*Update, 7 October:* Martin was named Goalkeeper of the Week.", "a live article gets the dated label");
ok(appendAddition("Body.", "Martin was named Goalkeeper of the Week.", { live: false, lang: "en", when }) ===
  "Body.\n\nMartin was named Goalkeeper of the Week.", "a draft gets the text plainly");
ok(appendAddition("Body.", "  ", { live: true, lang: "en", when }) === "Body.", "an empty addition changes nothing");

console.log(`award-section: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
