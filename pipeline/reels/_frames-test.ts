/**
 * Reel frames: the records lines parse back exactly, or not at all.
 * Run: npx tsx pipeline/reels/_frames-test.ts
 */
import { buildFrames, earlierFrame, fadeOffsets, hometownCity, rankingFrame, rosterFrame, seasonFrame, totalSeconds } from "./frames";
import { inPostingWindow, reelChannel } from "./make-reel";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// Season, outfield — the exact wording seasonLine() writes.
const s1 = seasonFrame("Chowan University's season statistics (stats page, 8 October 2026): Robbie Deighan has 6 goals and 2 assists in 11 games — the team lead in goals");
ok(s1?.big === "6 goals", "goals are the big number");
ok(s1?.line === "2 assists in 11 games — the team lead in goals", "assists, games and the team lead");
ok(s1?.foot === "Chowan University stats page · 8 October 2026", "source and date in the foot");
ok(seasonFrame("X's season statistics (stats page, 8 October 2026): Y has 1 goal and 1 assist in 1 game")?.line === "1 assist in 1 game", "singulars");
ok(seasonFrame("X's season statistics (stats page, 8 October 2026): Y has 0 goals and 3 assists in 9 games")?.big === "3 assists", "no goals: assists lead");
ok(seasonFrame("X's season statistics (stats page, 8 October 2026): Y has 0 goals and 0 assists in 9 games") === null, "nothing to show");

// Season, goalkeeper.
const k = seasonFrame("Ohio Valley University's season statistics (stats page, 8 October 2026): Z has 10 games in goal, 41 saves, a goals-against average of 0.91, 4 shutouts");
ok(k?.big === "4 shutouts", "shutouts lead for a keeper");
ok(k?.line === "10 games in goal, 41 saves, a goals-against average of 0.91", "the rest of the keeper line");
ok(seasonFrame("Q's season statistics (stats page, 8 October 2026): Z has 3 games in goal, 12 saves")?.big === "12 saves", "no shutouts: saves");
ok(seasonFrame("something else entirely") === null, "an unknown line is dropped, not guessed at");

// Ranking — the exact wording rankingLines() writes.
const r = rankingFrame("NCAA statistics through games of 6 October 2026: Chowan rank tied for 1st in Division II men's soccer for goals per game (3.64, 11 games)");
ok(r?.big === "Joint 1st", "tied → joint");
ok(r?.line === "in Division II men's football for goals per game (3.64)", "British wording, value kept");
ok(r?.foot === "NCAA statistics through 6 October 2026", "dated");
ok(rankingFrame("NCAA statistics through games of 6 October 2026: SMU rank 3rd in Division I women's soccer for goals-against average (0.30)")?.big === "3rd", "untied, no game count");

// Roster.
const ro = rosterFrame("Amy Cotton is one of 4 British players on Chowan University's women's soccer roster (as of 7 October 2026)");
ok(ro?.big === "1 of 4", "one of n");
ok(ro?.line === "British players on Chowan University's women's football roster", "roster label, British");

// Earlier articles.
const e = earlierFrame([
  "Our earlier article (event of October 3, 2026): «A»",
  "Our earlier article: «B»",
  "Our earlier article (event of Sep. 16, 2026): «C»",
], "Student-Athlete.co.uk");
ok(e?.items?.length === 2, "at most two earlier headlines");
ok(e?.items?.[0].date === "3 October 2026", "a dated event in British form");
ok(e?.items?.[1].date === null && e?.items?.[1].title === "B", "an undated one keeps its title");
ok(earlierFrame(["Mitch Picksley is one of 9 British players on …"], "x") === null, "no earlier lines, no frame");

// Frame choice.
ok(hometownCity("Bolton, England") === "Bolton" && hometownCity(null) === null, "the town only");
const frames = buildFrames({
  name: "Amy Cotton", gender: "f", hometown: "Sheffield, UK", university: "Chowan University", sport: "soccer",
  title: "Amy Cotton scores as Chowan fall 2-1 at Barton", brand: "Student-Athlete.co.uk",
  records: [
    "Amy Cotton is one of 4 British players on Chowan University's women's soccer roster (as of 7 October 2026)",
    "Our earlier article (event of Sep. 23, 2026): «Amy Cotton sets up Chowan equaliser»",
    "Chowan University's season statistics (stats page, 8 October 2026): Amy Cotton has 3 goals and 1 assist in 10 games",
  ],
});
ok(frames.map((f) => f.kind).join(",") === "hook,headline,season,roster,end", "season before roster, max two data frames");
ok(frames[0].kicker === "Women's football · Chowan University" && frames[0].line === "From Sheffield", "the hook");
ok(frames[1].big === "Amy Cotton scores as Chowan fall 2-1 at Barton", "the headline is the published title, untouched");
const bare = buildFrames({ name: "N", gender: null, hometown: null, university: null, sport: null, title: "T", brand: "B", records: [] });
ok(bare.map((f) => f.kind).join(",") === "hook,headline,end", "no records: three frames");
ok(bare[0].line === null, "no hometown, no «From»");

// Timing.
ok(JSON.stringify(fadeOffsets([2.6, 4, 3.4])) === JSON.stringify([2.2, 5.8]), "xfade offsets");
ok(Math.abs(totalSeconds([2.6, 4, 3.4]) - 9.2) < 1e-9, "total minus the overlaps");

// Schedule window and channel.
ok(!inPostingWindow(7 * 60 + 50) && inPostingWindow(8 * 60 + 50) && inPostingWindow(9 * 60 + 50) && !inPostingWindow(11 * 60), "08:30–11:00 UK");
ok(reelChannel("UK") === "instagram_uk_reel", "own channel, never drained");

console.log(`\nreel frames: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
