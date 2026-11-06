/** The award fast lane's pick. Run: npx tsx pipeline/fix/_award-fast-lane-test.ts */
import { pickAwardStories, type Candidate } from "./award-fast-lane";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

const rows: Candidate[] = [
  { id: 1, headline: "Women's Soccer: Dukes Earn Three Major Awards, Six Named All-Sun Belt", desk: null },
  { id: 2, headline: "Women's Soccer: Dukes Finish to 1-1 Draw with Georgia Southern", desk: null },
  { id: 3, headline: "Smith Named CAA Player of the Year", desk: "skip" },
  { id: 4, headline: "Jones Named First Team All-CACC", desk: "article" },
  { id: 5, headline: "Brown tabbed RMAC Goalkeeper of the Week", desk: null },
  { id: 6, headline: "Lee Earns All-Region Honors", desk: "fold" },
];

expect("season awards the desk has not turned down", pickAwardStories(rows, 5), [1, 4]);
expect("capped", pickAwardStories(rows, 1), [1]);
expect("none", pickAwardStories([rows[1], rows[4]], 5), []);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
