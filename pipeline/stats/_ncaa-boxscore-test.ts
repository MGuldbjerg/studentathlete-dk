/**
 * Tests for the NCAA.com box-score line (ncaa-boxscore.ts). No network: the
 * fetcher is a stub fed with the shapes ncaa-api returned on 2026-10-09.
 *   npx tsx pipeline/stats/_ncaa-boxscore-test.ts
 */
import {
  abbreviatedNameMatches, candidateDates, finalScore, findPlayer, isOpponent, isOurTeam,
  officialLine, pickGame, statLine, type Fetcher, type ScoreboardGame, type SoccerPlayerStats,
} from "./ncaa-boxscore";
import { schoolKeys } from "./ncaa-rankings";

let passed = 0;
let failed = 0;
function check(actual: unknown, expected: unknown, name: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

const team = (short: string, seo: string, score = "0") => ({ score, names: { short, seo, full: "" } });
const game = (id: string, away: ReturnType<typeof team>, home: ReturnType<typeof team>, state = "final"): ScoreboardGame =>
  ({ gameID: id, away, home, gameState: state, startDate: "10/06/2026" });

// ── names ───────────────────────────────────────────────────────────────────
const gaSo = schoolKeys("Georgia Southern University", "Georgia Southern");
check(isOurTeam(team("Ga. Southern", "ga-southern"), gaSo), true, "«Ga. Southern» is Georgia Southern");
check(isOurTeam(team("Southern Conn. St.", "southern-conn-st"), schoolKeys("Southern Connecticut State University", null)), true, "«Southern Conn. St.»");
check(isOurTeam(team("AUM", "aub-montgomery"), schoolKeys("Auburn University at Montgomery", "Auburn at Montgomery")), true, "seo «aub-montgomery» is Auburn at Montgomery");
check(isOurTeam(team("Georgia", "georgia"), gaSo), false, "Georgia is not Georgia Southern");
check(isOurTeam(team("Ga. Southern", "ga-southern"), schoolKeys("Georgia State University", null)), false, "Georgia State is not Ga. Southern");
check(abbreviatedNameMatches("Southern Miss.", "southern mississippi"), true, "«Southern Miss.»");
check(abbreviatedNameMatches("Mo. Southern", "mississippi southern"), false, "«mo» does not abbreviate «mississippi»");
check(isOpponent(team("Clemson", "clemson"), "#5 Clemson"), true, "a ranking before the opponent is ignored");
check(isOpponent(team("West Ala.", "west-ala"), "West Alabama (UWA)"), true, "«West Ala.» is West Alabama, the bracket ignored");
check(isOpponent(team("Holy Family", "holy-family"), "Holy Family University"), true, "«Holy Family University» is Holy Family");
check(isOpponent(team("Kansas City", "kansas-city"), "Kansas"), false, "Kansas is not Kansas City");
check(isOpponent(team("Cal St. Fullerton", "cal-st-fullerton"), "Cal State Fullerton Titans"), true, "a mascot after the name");
check(isOpponent(team("Ga. Southern", "ga-southern"), "Georgia Southern"), true, "an abbreviated opponent");

// ── which game ──────────────────────────────────────────────────────────────
const g1 = game("1", team("Ga. Southern", "ga-southern", "2"), team("Clemson", "clemson", "2"));
const g2 = game("2", team("Ga. Southern", "ga-southern", "1"), team("UAB", "uab", "0"));
check(pickGame([g1, g2], gaSo, "#5 Clemson")?.gameID, "1", "the opponent picks the game");
check(pickGame([g1, g2], gaSo, null), null, "two games and no opponent: no match");
check(pickGame([g1], gaSo, "Drake"), null, "the wrong opponent: no match");
check(pickGame([game("3", team("Ga. Southern", "ga-southern"), team("Clemson", "clemson"), "pre")], gaSo, "Clemson"), null, "an unfinished game is no result");
check(finalScore(game("4", team("Fairfield", "fairfield", "2"), team("Quinnipiac", "quinnipiac", "1"))), "Fairfield 2, Quinnipiac 1", "winner first");

// ── which player ────────────────────────────────────────────────────────────
const p = (first: string, last: string, extra: Partial<SoccerPlayerStats> = {}): SoccerPlayerStats =>
  ({ firstName: first, lastName: last, ...extra });
const roster = [p("MITCH", "PICKSLEY"), p("TOBY", "NEVILE"), p("OWEN", "BARKER")];
check(findPlayer(roster, "Mitch Picksley")?.lastName, "PICKSLEY", "full name, any case");
check(findPlayer(roster, "Picksley"), null, "a surname alone matches nobody");
check(findPlayer([p("Kit", "Smith")], "Christopher Smith", "Kit")?.firstName, "Kit", "the school's preferred first name");
check(findPlayer([p("Sam", "Jackson"), p("Sam", "Jackson")], "Sam Jackson"), null, "two rows with the name: no match");

// ── the line ────────────────────────────────────────────────────────────────
check(statLine(p("a", "b", { starter: true, participated: true, minutesPlayed: "58.8", goals: "2", assists: "0", shots: "3", shotsOnGoal: "2", penalties: { yellowCards: "1", redCards: "0" } })),
  ["started", "59 minutes", "2 goals", "0 assists", "3 shots (2 on goal)", "1 yellow card"], "an outfield line");
check(statLine(p("a", "b", { starter: false, participated: true, goals: "1", assists: "0", shots: "1", shotsOnGoal: "1", saves: "0", goalsAllowed: "0", position: "F" })),
  ["came on as a substitute", "1 goal", "0 assists", "1 shot (1 on goal)"], "a forward's «0 saves, 0 allowed» is not a keeper line");
check(statLine(p("a", "b", { starter: true, participated: true, minutesPlayed: "90", goals: "0", assists: "0", saves: "4", goalsAllowed: "1", position: "GK" })),
  ["started", "90 minutes", "0 goals", "0 assists", "4 saves", "1 goal conceded"], "a keeper line");
check(statLine(p("a", "b", { participated: false })), ["did not play (official box score)"], "did not play");

// ── dates ───────────────────────────────────────────────────────────────────
const now = new Date("2026-10-09T12:00:00Z");
check(candidateDates("October 6, 2026", "2026-10-07 06:00:00", now)[0], "2026-10-06", "the sheet's date first");
check(candidateDates("Oct. 4", "2026-10-07 06:00:00", now)[0], "2026-10-04", "a date without a year takes the story's");
check(candidateDates(null, "2026-10-07 06:00:00", now).length, 7, "no date: the story's day and six before");
check(candidateDates(null, "2026-10-09 06:00:00", now).includes("2026-10-10"), false, "never a future date");

// ── end to end, stubbed ─────────────────────────────────────────────────────
const stub = (boards: Record<string, ScoreboardGame[]>, box: unknown): Fetcher & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    async json<T>(url: string): Promise<T | null> {
      calls.push(url);
      if (url.includes("/scoreboard/")) {
        const date = url.split("/").slice(-3).join("-");
        return { games: (boards[date] ?? []).map((g) => ({ game: g })) } as T;
      }
      return box as T;
    },
  };
};
const box = {
  teams: [{ teamId: "10", seoname: "ga-southern", nameShort: "Ga. Southern", isHome: false }, { teamId: "20", seoname: "clemson", nameShort: "Clemson", isHome: true }],
  teamBoxscore: [
    { teamId: 20, playerStats: [p("MITCH", "PICKSLEY", { goals: "5" })] },
    { teamId: 10, playerStats: [p("MITCH", "PICKSLEY", { starter: true, participated: true, minutesPlayed: "59", goals: "2", assists: "0" })] },
  ],
};
const base = {
  athleteName: "Mitch Picksley", preferredName: null, sport: "soccer", gender: "m", division: "NCAA D1",
  university: "Georgia Southern University", commonName: "Georgia Southern", opponent: "#5 Clemson",
  eventDate: "October 6, 2026", storyDate: "2026-10-07 06:00:00",
};
(async () => {
  const f = stub({ "2026-10-06": [g1] }, box);
  const line = await officialLine(base, f);
  check(line?.statLine, ["started", "59 minutes", "2 goals", "0 assists"], "our team's row, not the opponent's namesake");
  check(line?.url, "https://www.ncaa.com/game/1", "the NCAA.com game page as the source");
  check(await officialLine({ ...base, division: "NAIA" }, stub({}, box)), null, "NAIA is not on NCAA.com");
  check(await officialLine({ ...base, sport: "golf" }, stub({}, box)), null, "golf has no box score");
  const noOpp = stub({ "2026-10-05": [g1] }, box);
  check(await officialLine({ ...base, opponent: null, eventDate: null }, noOpp), null, "no opponent and no date: nothing tried");
  check(noOpp.calls.length, 0, "…and no calls made");
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
