/**
 * Season statistics from a school's stats page: tables, names, the line.
 * Run: npx tsx pipeline/stats/_season-stats-test.ts
 */
import { nameKey, parseSeasonTables, seasonLine, statsUrl } from "./season-stats";

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

console.log(`season-stats: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
