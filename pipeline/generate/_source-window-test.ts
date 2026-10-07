/**
 * selectSourceWindow: the fact-sheet model reads the RIGHT 8000 characters.
 * Run: npx tsx pipeline/generate/_source-window-test.ts
 */
import { selectSourceWindow } from "./source-window";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// A Sidearm game page: thousands of one-cell table lines, then the story.
const table = Array.from({ length: 1500 }, (_, i) => (i % 3 === 0 ? "Shots" : String(i % 17))).join("\n");
const boxRow = "#1 Mujica, Zara\nSaves\n3\nMinutes\n90:00";
const lead = "ALAMEDA, Calif.--- Alexi Ochoa and Karissa Franco each scored their first collegiate goals as Stan State defeated Cal State East Bay 2-0 Sunday afternoon.";
const firstHalf = "Cal State East Bay generated the first scoring opportunities of the afternoon, but Mujica kept the Pioneers off the board in the seventh minute.";
const filler = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} about another player entirely, with enough words in it to count as running text on the page.`).join("\n");
const notable = " Mujica recorded three saves for her fourth shutout of the season and the 10th of her Stan State career, eighth in program history.";
const page = [table, boxRow, table, lead, firstHalf, filler, "Warrior Notables", notable].join("\n");

ok(page.length > 8000, "the fixture is longer than the window");
const w = selectSourceWindow(page, "Zara Mujica");
ok(w.length <= 8000, "the window respects the budget");
ok(w.includes("10th of her Stan State career"), "#8180: the athlete's notable at the very end is read (it was cut before)");
ok(w.includes("kept the Pioneers off the board"), "the athlete's paragraph in the story is read");
ok(w.includes(lead), "the lead paragraph is read");
ok(w.includes("Mujica, Zara\nSaves\n3"), "the table rows around her name are read");
ok(w.indexOf(lead) < w.indexOf("10th of her Stan State career"), "lines keep their page order");
ok(w.includes("\n…\n"), "a gap between distant lines is marked");

const short = "Short story. Mujica made three saves.";
ok(selectSourceWindow(short, "Zara Mujica") === short, "a source inside the budget is passed through untouched");

console.log(`source-window: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
