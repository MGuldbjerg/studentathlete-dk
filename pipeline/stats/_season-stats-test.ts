/**
 * Season statistics from a school's stats page: tables, names, the line.
 * Run: npx tsx pipeline/stats/_season-stats-test.ts
 */
import { nameKey, pageSeason, parseSeasonTables, parseTeamPage, parseTennisTables, scorersOf, seasonLine, statsUrl, teamContextFor, tennisLine, tennisRecord, winLoss } from "./season-stats";
import { readTeamContext, teamParagraphs } from "../../src/lib/team-context";
import { archiveYear } from "./season-stats";
import { careerParagraph, careerRows, seasonsBack } from "../../src/lib/career";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

ok(statsUrl("https://gocuhawks.com/sports/mens-soccer/roster", 2026) === "https://gocuhawks.com/sports/mens-soccer/stats/2026", "roster → stats");
ok(statsUrl("https://gseagles.com/sports/womens-soccer/roster/", 2026) === "https://gseagles.com/sports/womens-soccer/stats/2026", "trailing slash");
ok(statsUrl("https://x.edu/roster.aspx?path=msoc", 2026) === null, "an old-style roster URL gets no guess");

ok(nameKey("Deighan, Robbie") === nameKey("Robbie Deighan"), "«Last, First» = «First Last»");
ok(nameKey("Gibbs, Dylan Robert Ray Frank") === nameKey("Dylan Robert Ray Frank Gibbs"), "several first names");
ok(nameKey("Mujica, Zara") !== nameKey("Zara Mujica-Lopez"), "a longer surname is someone else");

// The classic layout: a captioned overall table, then the conference one.
const classic = `
<table><caption>Individual Overall Offensive Statistics</caption>
<tr><th>#</th><th>Player</th><th>GP</th><th>GS</th><th>G</th><th>A</th><th>PTS</th></tr>
<tr><td>17</td><td><a>Deighan, Robbie</a> <span>Deighan, Robbie</span></td><td>11</td><td>7</td><td>6</td><td>1</td><td>13</td></tr>
<tr><td>9</td><td><a>Smith, Joe</a></td><td>11</td><td>11</td><td>9</td><td>2</td><td>20</td></tr>
<tr><td>4</td><td><a>Bench, Ben</a></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td></td><td>Total</td><td>11</td><td>-</td><td>39</td><td>20</td><td>98</td></tr>
</table>
<table><caption>Individual Overall Goalkeeping Statistics</caption>
<tr><th>#</th><th>Player</th><th>GP</th><th>GA</th><th>GAA</th><th>SV</th><th>SHO/CBO</th></tr>
<tr><td>1</td><td><a>Mujica, Zara</a></td><td>10</td><td>10</td><td>1.00</td><td>46</td><td>4/1</td></tr>
</table>
<table><caption>Individual Conference Offensive Statistics</caption>
<tr><th>#</th><th>Player</th><th>GP</th><th>GS</th><th>G</th><th>A</th><th>PTS</th></tr>
<tr><td>17</td><td><a>Deighan, Robbie</a></td><td>5</td><td>3</td><td>2</td><td>0</td><td>4</td></tr>
</table>`;
const t = parseSeasonTables(classic);
ok(t.outfield.length === 3 && t.keepers.length === 1, "the overall tables are read, the total row is not a player");
const d = new Date("2026-10-08T09:00:00Z");
ok(seasonLine("Robbie Deighan", "Chowan", t, d) ===
  "Chowan's season statistics (stats page, 8 October 2026): Robbie Deighan has 6 goals and 1 assist in 11 games",
  "overall, not conference totals; no team lead when someone has more");
ok(seasonLine("Joe Smith", "Chowan", t, d)?.endsWith("— the team lead in goals") === true, "the team lead");
ok(seasonLine("Zara Mujica", "Stanislaus State", t, d) ===
  "Stanislaus State's season statistics (stats page, 8 October 2026): Zara Mujica has 10 games in goal, 46 saves, a goals-against average of 1.00, 4 shutouts",
  "a goalkeeper gets the goalkeeping line, shutouts from «SHO/CBO»");
ok(seasonLine("Ben Bench", "Chowan", t, d) === null, "no games, no line");
ok(seasonLine("Robbie Deighans", "Chowan", t, d) === null, "no exact name, no line");

// The new layout: no captions, lower-case headers.
const nuxt = `<table><tr><th>#</th><th>Player</th><th>gp</th><th>Gs</th><th>g</th><th>A</th><th>pts</th></tr>
<tr><td>7</td><td><span>Picksley, Mitch</span></td><td>10</td><td>10</td><td>5</td><td>1</td><td>11</td></tr>
<tr><td>9</td><td><span>Beorlegui, Broden</span></td><td>10</td><td>9</td><td>5</td><td>3</td><td>13</td></tr></table>`;
ok(seasonLine("Mitch Picksley", "Georgia Southern", parseSeasonTables(nuxt), d)?.endsWith("5 goals and 1 assist in 10 games — tied for the team lead in goals") === true,
  "the new layout, and a shared lead");

// Tennis (classic Sidearm): win-loss records, first table of each kind is overall.
const tennis = `<h1>2026-27 Men's Tennis Cumulative Statistics</h1>
<table><caption>Individual Singles Overall Statistics</caption>
<tr><th>Singles</th><th>Overall</th><th>Dual</th><th>Tour</th><th>Conf</th><th>Streak</th></tr>
<tr><th>Nat'l</th><th>Reg'l</th></tr>
<tr><td><a href="/x">Albiero, Andrea</a></td><td>3-0</td><td>3-0</td><td>0-0</td><td>2-0</td><td>W 3</td></tr>
<tr><td><a href="/y">Horsley, Thomas</a></td><td>0-0</td><td>0-0</td><td>0-0</td><td>0-0</td><td>&nbsp;&mdash;&nbsp;</td></tr></table>
<table><caption>Individual Doubles Overall Statistics</caption>
<tr><th>Doubles</th><th>Overall</th><th>Dual</th><th>Tour</th><th>Conf</th><th>Streak</th></tr>
<tr><td><a href="/x">Albiero, Andrea</a></td><td>2-1</td><td>2-1</td><td>0-0</td><td>1-0</td><td>W 1</td></tr></table>
<table><caption>Individual Singles Conference Statistics</caption>
<tr><th>Singles</th><th>Overall</th></tr><tr><td><a>Albiero, Andrea</a></td><td>9-9</td></tr></table>`;
const tt = parseTennisTables(tennis);
const rec = tennisRecord("Andrea Albiero", tt);
ok(rec?.cells.singles === "3-0" && rec?.cells.doubles === "2-1" && rec?.matches === 6, "singles and doubles overall, conference table ignored");
ok(tennisRecord("Thomas Horsley", tt) === null, "no match played → no record");
ok(tennisRecord("Someone Else", tt) === null, "not on the page → nothing");
ok(JSON.stringify(winLoss("12-4")) === "[12,4]" && JSON.stringify(winLoss("—")) === "[0,0]", "win-loss parse");
ok(tennisLine("Andrea Albiero", "Adelphi", rec!.cells, d).endsWith("Andrea Albiero has a 3-0 singles record and 2-1 in doubles"), "tennis line");
ok(pageSeason(tennis) === "2026-27" && pageSeason("<h1>Stats</h1>") === null, "the page's own season");

// Team context (P2, 2026-10-26): Total/Opponent rows and the results table on the same page.
{
  const page = `
<table><caption>Individual Overall Offensive Statistics</caption>
<tr><th>#</th><th>Player</th><th>GP</th><th>GS</th><th>MIN</th><th>G</th><th>A</th><th>PTS</th></tr>
<tr><td>9</td><td><a>Bustamante, Wilfer</a></td><td>14</td><td>5</td><td>667</td><td>10</td><td>3</td><td>23</td></tr>
<tr><td>7</td><td><a>Hernandez, Diego</a></td><td>13</td><td>11</td><td>779</td><td>5</td><td>3</td><td>13</td></tr>
<tr><td>4</td><td><a>Stout, Connor</a></td><td>14</td><td>14</td><td>1200</td><td>1</td><td>6</td><td>8</td></tr>
<tr><td></td><td>Total</td><td>14</td><td>-</td><td>13860</td><td>29</td><td>29</td><td>87</td></tr>
<tr><td></td><td>Opponent</td><td>14</td><td>-</td><td>13747</td><td>20</td><td>14</td><td>54</td></tr>
</table>
<table><caption>Game-By-Game Game Results Statistics</caption>
<tr><th>Date</th><th>Opponent</th><th>W/L</th><th>Score</th><th>Overall</th><th>Conference</th><th>Attend</th><th>Goals Scored [Assist]</th></tr>
<tr><td>08/20/2026</td><td>at #12 Clemson</td><td>L</td><td>1-5</td><td>(0-1-0, 0-0-0)</td><td>0-0-0</td><td>4323</td><td>Diego Hernandez (1) (Trip Campbell)</td></tr>
<tr><td>10/20/2026</td><td>vs USC Upstate *</td><td>W</td><td>7-1</td><td>(6-3-4, 2-1-0)</td><td>2-1-0</td><td>757</td><td>Wilfer Bustamante (9) (Connor Stout) Wilfer Bustamante (10) (Grayson Travis)</td></tr>
<tr><td>10/24/2026</td><td>at ETSU</td><td>T</td><td>0-0</td><td>(6-3-5, 2-1-1)</td><td>2-1-1</td><td>145</td><td></td></tr>
<tr><td>10/31/2026</td><td>vs Mercer</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>`;
  const tp = parseTeamPage(page);
  ok(tp.total?.["g"] === "29" && tp.opponent?.["g"] === "20", "Total and Opponent rows");
  ok(tp.results.length === 3 && tp.results[0].opponent === "Clemson" && tp.results[0].away && !tp.results[1].away && tp.results[1].opponent === "USC Upstate", "played games only; opponent cleaned");
  ok(JSON.stringify(scorersOf("Wilfer Bustamante (9) (Connor Stout) Landon Hill (1)")) === JSON.stringify([nameKey("Wilfer Bustamante"), nameKey("Landon Hill")]), "scorers, not assisters");
  const ctx = teamContextFor("Wilfer Bustamante", "Furman", parseSeasonTables(page), tp)!;
  ok(ctx.games === 14 && ctx.record?.w === 6 && ctx.record?.t === 5 && ctx.conf?.l === 1 && ctx.goals === 29 && ctx.against === 20, "team record and totals");
  ok(ctx.ranks.g?.rank === 1 && !ctx.ranks.g?.tied && ctx.ranks.min?.rank === 3 && ctx.scoredIn?.games === 1, "ranks on the team; a brace is one game");
  const en = teamParagraphs(ctx, { name: "Wilfer Bustamante", kind: "outfield", cells: { gp: "14" } }, "en");
  ok(en[0] === "Furman have played 14 games this season: 6 wins, 3 defeats and 5 draws (2-1-1 in conference play). They have scored 29 and conceded 20. Their most recent game was a 0-0 draw at ETSU on 24 October.", "team sentences");
  ok(en[1].startsWith("Wilfer Bustamante has 10 of the team's 29 goals (34%), the most on the team. Bustamante has scored in 1 of Furman's 14 games, most recently against USC Upstate on 20 October."), "athlete sentences");
  ok(en[1].includes("started 5 of 14 appearances and logged 667 minutes, 3rd on the team."), "starts and minutes");
  const da = teamParagraphs(ctx, { name: "Wilfer Bustamante", kind: "outfield", cells: { gp: "14" } }, "da").join(" ");
  ok(da.includes("6 sejre, 3 nederlag og 5 uafgjorte") && da.includes("Seneste kamp endte 0-0 ude mod ETSU den 24. oktober."), "Danish");
  const quiet = teamContextFor("Connor Stout", "Furman", parseSeasonTables(page), tp)!;
  ok(quiet.scoredIn === null && !teamParagraphs(quiet, { name: "Connor Stout", kind: "outfield", cells: { gp: "14" } }, "en")[1].includes("scored in"), "no goals → no «scored in» sentence");
  ok(readTeamContext("{") === null && readTeamContext(null) === null && readTeamContext(JSON.stringify(ctx))?.team === "Furman", "stored JSON read defensively");
  const fh = parseTeamPage(`<table><tr><th>#</th><th>Player</th><th>GP</th><th>G</th><th>A</th><th>PTS</th></tr>
<tr><td>Total</td><td></td><td>14</td><td>17</td><td>17</td><td>51</td></tr></table>`);
  ok(fh.total?.["g"] === "17", "«Total» in the # cell (field hockey layout)");
}

// Career by season (P1, 2026-10-26).
{
  ok(seasonsBack("Fr.") === 0 && seasonsBack("So.") === 1 && seasonsBack("Jr.") === 2 && seasonsBack("Sr.") === 3 && seasonsBack("Gr.") === 4, "class year → seasons back");
  ok(seasonsBack("R-So.") === 2 && seasonsBack("4th Year") === 3 && seasonsBack("Sr. (4th)") === 3 && seasonsBack("FY") === 0 && seasonsBack(null) === 0 && seasonsBack("Rf.") === 0, "redshirts, «4th Year», unknown → 0");
  ok(archiveYear("<title>\n\t2024 Men's Soccer Cumulative Statistics - Adelphi University</title>") === 2024, "archive year from the title");
  ok(archiveYear("<title>2026 Men's Soccer Schedule - Furman University</title>") === null, "a schedule page is no archive");
  const past = [
    { season: "2024-25", kind: "outfield" as const, games: 19, cells: { gp: "19", gs: "2", g: "1", a: "3" }, school: "Adelphi", record: { w: 9, l: 6, t: 4 } },
    { season: "2025-26", kind: "outfield" as const, games: 17, cells: { gp: "17", gs: "11", g: "2", a: "3" }, school: "Adelphi", record: { w: 9, l: 6, t: 4 } },
  ];
  const now = { kind: "outfield", games: 12, cells: { gp: "12", g: "5", a: "1" }, school: "Adelphi" };
  const en = careerParagraph(past, now, "Matthew Murphy", "en");
  ok(en.startsWith("Over 3 seasons at Adelphi (2024–2026), Murphy has 8 goals and 7 assists in 48 games."), "career total, this season included");
  ok(en.includes("This season's 5 goals are already more than in any earlier season (previous best: 2 in 2025).") && en.indexOf("In 2025") < en.indexOf("In 2024"), "season best; newest season first");
  ok(en.includes("In 2025 Murphy played 17 games (11 as a starter) with 2 goals and 3 assists, as Adelphi went 9-6-4."), "a season in one sentence");
  const quiet = careerParagraph([{ season: "2025-26", kind: "outfield", games: 4, cells: { gs: "2", g: "0", a: "0" }, school: "Ashland", record: null }], null, "Noah Brock", "en");
  ok(quiet === "Over 1 season at Ashland (2025), Brock has played 4 games. In 2025 Brock played 4 games (2 as a starter).", "no «0 goals and 0 assists»");
  ok(careerParagraph(past, now, "Matthew Murphy", "da").includes("I 2025 spillede Murphy 17 kampe (11 fra start) med 2 mål og 3 assists, mens Adelphi endte på 9-6-4."), "Danish");
  ok(careerParagraph([], now, "X", "en") === "", "no earlier season → no block");
  ok(careerRows(past, "en")[0].season === "2025" && careerRows(past, "en")[0].cells.map((c) => c[1]).join(",") === "17,11,2,3,,9-6-4", "table rows newest first");
}

console.log(`season-stats: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
