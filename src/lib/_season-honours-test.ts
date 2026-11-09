/** The season-honours page data. Run: npx tsx src/lib/_season-honours-test.ts */
import { buildSeasonHonours, mergeHonours, type HonourInput } from "./season-honours";

let pass = 0, fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

const base = { slug: "x", school: "S", conference: "Sun Belt Conference", gender: "f", division: "NCAA D1", nation: "england", source_url: "https://src" };
const row = (id: number, name: string, award_name: string, summary: string | null, occurred_on = "2026-11-05", extra: Partial<HonourInput> = {}): HonourInput =>
  ({ ...base, athlete_id: id, name, award_name, summary, occurred_on, ...extra });

// The bucket-only "Player of the Year" from our article and the CAA's worded
// Rookie of the Year are one honour: the worded one wins.
const keay = [
  row(1, "Cameron Keay", "Player of the Year", "Player of the Year", "2026-11-06"),
  row(1, "Cameron Keay", "Freshman of the Year", "CAA Rookie of the Year", "2026-11-04"),
  row(1, "Cameron Keay", "All-Conference", "All-Conference", "2026-11-06"),
  row(1, "Cameron Keay", "All-Conference", "All-CAA First Team", "2026-11-04"),
];
eq("bucket twins dropped, worded rows kept", mergeHonours(keay).map((r) => r.summary), ["CAA Rookie of the Year", "All-CAA First Team"]);

// A bucket-only row with no worded twin stays, with a general label.
const h = buildSeasonHonours("UK", "soccer", "2026-27", "2026-11-09", [
  row(2, "Ania Denham", "Player of the Year", "Player of the Year"),
  row(3, "Ginny Lackey", "Player of the Year", "Player of the Year"),
  row(3, "Ginny Lackey", "All-Conference", "All-Sun Belt Conference First Team"),
  row(4, "Toby Mawer", "All-Conference", "All-Sun Belt Conference Second Team", "2026-11-06", { gender: "m" }),
  row(5, "Weekly Person", "Player of the Week", "Player of the Week"),
  row(6, "Dee Two", "All-Conference", "All-SSC First Team", "2026-11-05", { division: "NCAA D2", conference: "Sunshine State Conference" }),
  row(7, "Millie Urquhart", "All-Conference", "Named to the Academic All-ASUN team on 4 November 2026 with a 3.95 GPA."),
]);
eq("weekly awards are not season honours", h.athletes, 4);
eq("women first, then men", h.groups.map((g) => g.gender), ["f", "m"]);
eq("D1 before D2", h.groups[0].divisions.map((d) => d.division), ["NCAA D1", "NCAA D2"]);
const sb = h.groups[0].divisions[0].conferences[0];
eq("alphabetical by surname, no ranking", sb.athletes.map((a) => a.name), ["Ania Denham", "Ginny Lackey"]);
eq("a bucket-only year award is shown generally", sb.athletes[0].honours.map((x) => x.text), ["End-of-season conference award"]);
eq("year award before the team, worded team kept", sb.athletes[1].honours.map((x) => x.text), ["End-of-season conference award", "All-Sun Belt Conference First Team"]);
eq("counts", [h.honours, h.conferences], [5, 2]);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
