/** How stored honours read. Run: npx tsx src/lib/_honour-label-test.ts */
import { honourText, isReleaseLabel, tidyLabel } from "./honour-label";

let pass = 0, fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

// Real labels from the 2026-11-09 dry run.
eq("capitals, acronym kept, sport dropped", tidyLabel("CACC MEN'S SOCCER ALL-CONFERENCE FIRST TEAM"), "CACC All-Conference First Team");
eq("capitals with a conference name", tidyLabel("ALL-BIG TEN, SECOND TEAM"), "All-Big Ten, Second Team");
eq("ALL-GLIAC", tidyLabel("ALL-GLIAC FIRST TEAM"), "All-GLIAC First Team");
eq("mixed case kept, sport dropped", tidyLabel("ECC Men's Soccer All-Conference First Team"), "ECC All-Conference First Team");
eq("already tidy", tidyLabel("All-Sun Belt Conference First Team"), "All-Sun Belt Conference First Team");
eq("of the year", tidyLabel("Defensive Player of the Year"), "Defensive Player of the Year");

eq("a label", isReleaseLabel("All-MEC Second Team"), true);
eq("a sentence is not a label", isReleaseLabel("Named to All-Sun Belt First Team in men's soccer"), false);
eq("a full stop is not a label", isReleaseLabel("Placed eighth at the CACC Championships."), false);

eq("English site shows the release label", honourText("ALL-GLIAC FIRST TEAM", "All-Conference", "en"), "All-GLIAC First Team");
eq("Danish site keeps its own bucket name for a bare English label", honourText("All-MEC Second Team", "All-Conference", "da") !== "All-MEC Second Team", true);
eq("a sentence shows as stored", honourText("Named to All-Summit League first team", "All-Conference", "en"), "Named to All-Summit League first team");
eq("bucket only → bucket label", honourText("All-Conference", "All-Conference", "en"), "All-Conference");

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
