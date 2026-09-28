/**
 * Tests for the check view's text logic (src/lib/check-view.ts).
 *
 * The cases that matter most are FALSE ALARMS: a red mark on a fact that is in
 * the source teaches the reviewer to ignore red. The fixture is draft #405 and
 * its Chowan–King box score (2026-09-26), where "from Leeds" was invented.
 */
import {
  cleanSource, stripMarkdown, splitSentences, extractKeys, buildCheckModel, locateClaim,
} from "../../src/lib/check-view";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const BOX = `Box Score



			1


				Winner
				Chowan
				CHOWAN

			(3-5-0, 3-3-0)




			0

				King (TN)
				KING

			(2-6-0, 1-4-0)




		Final
		Sep. 26, 2026



Goal: CHOWAN Cuddihy, Meah (4) Assist: Hulme, Laura (4) 65:12
Saves: Smith, Kylee 5. Shots: Chowan 6, King 16. Baxter, Ellis 2 shots, 2 on goal.
`;

const DRAFT = `Laura Hulme set up the only goal as Chowan won 1-0 at King on Saturday 26 September.

After a goalless first half, the **senior midfielder** from Huddersfield found Meah Cuddihy, who scored at 65:12.

## Ellis Baxter, a freshman forward from Leeds, had two shots, both on target.`;

// ── Source cleanup ──
const lines = cleanSource(BOX);
ok(lines.includes("1 · Winner · Chowan · (3-5-0, 3-3-0)") && lines.includes("0 · King (TN) · (2-6-0, 1-4-0)"), `box-score cells join into a row, shout dropped (${JSON.stringify(lines.slice(0, 4))})`);
ok(!lines.some((l) => /^\s*$/.test(l)), "no blank lines left");
ok(lines.some((l) => l.startsWith("Goal: CHOWAN Cuddihy")), "prose lines kept whole");
ok(cleanSource(null).length === 0, "no source → no lines");

// ── Markdown ──
const paras = stripMarkdown(DRAFT);
ok(paras.length === 3, "three paragraphs");
ok(paras[1].includes("senior midfielder") && !paras[1].includes("**"), "bold stripped");
ok(paras[2].startsWith("Ellis Baxter"), "heading marker stripped");
ok(stripMarkdown("a<br><br>b").length === 2, "<br><br> becomes a paragraph break (#253's format failure)");

// ── Sentences ──
ok(splitSentences("They met on Sep. 26 at home. It ended 1-0.").length === 2, "no split after 'Sep.'");
ok(splitSentences("J. Smith scored. No. 5 assisted.").length === 2, "no split after an initial or 'No.'");
ok(splitSentences("One. Two! Three?").length === 3, "plain sentences split");

// ── Keys ──
const k = extractKeys("After Hulme's pass, Chowan won 1-0 on Saturday.");
ok(k.some((x) => x.kind === "name" && x.text === "Hulme"), "possessive and sentence-starter peeled");
ok(!k.some((x) => x.text === "Saturday"), "weekday not checked");
ok(k.some((x) => x.kind === "number" && x.text === "1-0"), "score kept whole");

// ── The model ──
const model = buildCheckModel({
  title: "Hulme sets up Chowan winner",
  content: DRAFT,
  sourceRaw: BOX,
  findings: [
    { severity: "high", claim: "Ellis Baxter, a freshman forward from Leeds", why: "Hometown invented." },
    { severity: "medium", claim: "something not in the draft at all", why: "x" },
  ],
  dbFacts: ["Laura Hulme", "Huddersfield", "Chowan University"],
});
const all = [model.title, ...model.paragraphs.flat()];
const key = (t: string) => all.flatMap((s) => s.keys.map((kk) => ({ kk, text: s.text.slice(kk.start, kk.end) }))).find((x) => x.text === t)?.kk;

ok(key("Laura Hulme")?.status === "source", "full name found via surname ('Hulme, Laura')");
ok(key("September")?.status === "source", "month found via 'Sep.'");
ok(key("65:12")?.status === "source", "time found");
ok(key("1-0")?.status === "loose", "score written only as separate cells is loose, not red (honest: not verbatim)");
ok(key("Huddersfield")?.status === "db", "hometown from our own records marked as db, not invented");
ok(key("Leeds")?.status === "missing", "invented hometown is missing");
ok(key("Meah Cuddihy")?.lines.length === 1, "match points at the source line");
ok(model.paragraphs[2][0].findings.length === 1, "finding attached to its sentence");
ok(model.unplaced.length === 1, "unmatched finding kept, shown above the draft");
ok(locateClaim("", ["x"]) === -1, "empty claim not placed");

// Real false alarms from the live queue, 2026-09-28:
const us = buildCheckModel({ title: "x", content: "They won on Sunday 27 September. Murphy scored at 5:13.", sourceRaw: "Murphy, Matt\n9/27/2026 2:45:00 PM\nGoal 05:13 Murphy", findings: [], dbFacts: [] });
const usKeys = us.paragraphs.flat().flatMap((s) => s.keys.map((kk) => ({ t: s.text.slice(kk.start, kk.end), st: kk.status })));
ok(usKeys.find((x) => x.t === "September")?.st === "source", "month matched against a US date (9/27/2026)");
ok(usKeys.find((x) => x.t === "5:13")?.st === "source", "time matched with a leading zero (05:13)");
ok(!/(?<![\d])0?9\/\d/.test("19/2026") , "month 9 does not match inside 19/");

console.log(`check-view: ${pass} ok, ${fail} fejl`);
if (fail) process.exit(1);
