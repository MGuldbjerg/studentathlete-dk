/** How stored honours read. Run: npx tsx src/lib/_honour-label-test.ts */
import { honourText, isReleaseLabel, labelFromSentence, tidyLabel } from "./honour-label";

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

// Real article-harvest sentences, 2026-11-09.
eq("named to the … on", labelFromSentence("Named to the All-CAA Second Team on 4 November 2026 after anchoring Hofstra's defence in 16 games and 15 starts."), "All-CAA Second Team");
eq("tier first", labelFromSentence("Named Third Team All-CAA on 5 November 2026 after scoring two goals"), "Third Team All-CAA");
eq("year dropped", labelFromSentence("Named to the 2026 All-Conference Carolinas Third Team, his second straight year of all-league honours."), "All-Conference Carolinas Third Team");
eq("first of two", labelFromSentence("Named to the Conference USA All-Conference Second Team and the CUSA All-Freshman Team on 6 November 2026."), "Conference USA All-Conference Second Team");
eq("earned … mention", labelFromSentence("Earned All-GAC/MIAA Honorable Mention on 4 November 2026, his third all-conference honour."), "All-GAC/MIAA Honorable Mention");
eq("no honour phrase", labelFromSentence("Named captain for the 2026 season."), null);
eq("not a named sentence", labelFromSentence("Scored twice in the final."), null);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
