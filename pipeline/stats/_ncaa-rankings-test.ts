/**
 * NCAA.com national rankings: parsing, ties, exact school matching, the line.
 * Run: npx tsx pipeline/stats/_ncaa-rankings-test.ts
 */
import {
  ncaaDivision, ncaaSport, ordinal, parseRankingTable, rankingLines, schoolKeys, statLinks, teamKey, throughDate,
  type StoredRanking,
} from "./ncaa-rankings";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// ─── Parsing (the shape of a real NCAA.com page, cut down) ──────────────────
const page = `<select><option value="/stats/soccer-men/d2/current/team/31">Shutout Percentage</option>
<option value="/stats/soccer-men/d2/current/team/30">Scoring Offense</option></select>
<table><thead><tr><th>Rank</th><th>Team</th><th>Team Games</th><th>Shutouts</th><th>Pct</th></tr></thead><tbody>
<tr><td>1</td><td><a href="/x">Cal State LA</a></td><td>11</td><td>8</td><td>.727</td></tr>
<tr><td>2</td><td>Lees-McRae</td><td>10</td><td>7</td><td>.700</td></tr>
<tr><td>3</td><td>Thomas More</td><td>12</td><td>8</td><td>.667</td></tr>
<tr><td>4</td><td>Concord</td><td>11</td><td>7</td><td>.636</td></tr>
<tr><td>-</td><td>Tiffin</td><td>11</td><td>7</td><td>.636</td></tr>
<tr><td>-</td><td>Saint Anselm</td><td>11</td><td>7</td><td>.636</td></tr>
<tr><td>7</td><td>Lincoln (MO)</td><td>3</td><td>2</td><td>.667</td></tr>
<tr><td>11</td><td>Missouri St.</td><td>10</td><td>5</td><td>.500</td></tr>
</tbody></table>`;
const rows = parseRankingTable(page);
ok(rows.length === 8, "every ranked row is read");
ok(rows[0].team === "Cal State LA" && rows[0].value === ".727" && rows[0].valueLabel === "Pct" && rows[0].games === 11,
  "team, last column as the value, its header, games");
ok(rows[3].rank === 4 && rows[3].tied, "the row a tie follows is tied too");
ok(rows[4].rank === 4 && rows[4].tied && rows[5].rank === 4 && rows[5].tied, "«-» shares the rank above");
ok(!rows[0].tied && !rows[6].tied, "untied rows stay untied");
ok(statLinks(page).get("Scoring Offense") === "/stats/soccer-men/d2/current/team/30", "stat links from the dropdown");

// ─── Names: exact, with abbreviations expanded — nothing guessed ────────────
const matches = (ncaa: string, uni: string, common: string | null) => schoolKeys(uni, common).includes(teamKey(ncaa));
ok(matches("Missouri St.", "Missouri State University", "Missouri State"), "«St.» is «State»");
ok(matches("Boston U.", "Boston University", "Boston U"), "«U.» is «University»");
ok(matches("Massachusetts", "University of Massachusetts Amherst", "UMass / Massachusetts"), "a common name with «/» is split");
ok(matches("Lincoln (MO)", "Lincoln University (MO)", null), "a state in brackets survives");
ok(matches("Indiana", "Indiana University", "Indiana"), "«Indiana» is Indiana University");
ok(matches("UNC Asheville", "University of North Carolina at Asheville", "UNC Asheville"), "the common name carries the abbreviation");
ok(matches("Saint John's (MN)", "Saint John's University (MN)", null), "apostrophe and bracket");
ok(!matches("Washington", "George Washington University", "George Washington"), "«Washington» is not George Washington");
ok(!matches("Oklahoma", "Oklahoma State University", "Oklahoma State"), "«Oklahoma» is not Oklahoma State");
ok(!matches("Indiana", "University of Southern Indiana", "Southern Indiana"), "«Indiana» is not Southern Indiana");
ok(!matches("Concord", "Concordia University Irvine", "Concordia-Irvine"), "«Concord» is not Concordia");

ok(ncaaSport("soccer", "f") === "soccer-women" && ncaaSport("field-hockey", "f") === "fieldhockey", "sport slugs");
ok(ncaaSport("soccer", null) === null && ncaaSport("golf", "m") === null, "no gender or no table: nothing");
ok(ncaaDivision("NCAA D2") === "d2" && ncaaDivision("NAIA") === null, "NCAA divisions only");

// ─── The line ───────────────────────────────────────────────────────────────
ok(ordinal(1) === "1st" && ordinal(2) === "2nd" && ordinal(3) === "3rd" && ordinal(4) === "4th" && ordinal(11) === "11th" && ordinal(22) === "22nd",
  "ordinals");
const stored = (over: Partial<StoredRanking>): StoredRanking => ({
  sport: "soccer-men", division: "d2", stat: "Shutout Percentage", rank: 4, tied: 1, team: "Tiffin",
  value: ".636", value_label: "Pct", games: 11, fetched_on: "2026-10-07", ...over,
});
const lines = rankingLines([
  stored({}),
  stored({ stat: "Scoring Offense", rank: 12, tied: 0, value: "2.10", value_label: "Per Game" }),
  stored({ stat: "Team Goals Against Average", rank: 2, tied: 0, value: "0.40", value_label: "GAA", games: 3 }),
  stored({ stat: "Won-Lost-Tied Percentage", rank: 9, tied: 0, value: ".800", value_label: "Pct" }),
]);
ok(lines.length === 2, "only top-10 placings after at least four games, best two");
ok(lines[0] === "NCAA statistics through games of 7 October 2026: Tiffin rank tied for 4th in Division II men's soccer for shutout percentage (.636, 11 games)",
  "the line, dated and with the tie");

// ─── «Through games»: what the numbers are true as of ───────────────────────
ok(throughDate('<div>Last updated</div><div>Tuesday, October 06, 2026 9:10 am</div><span>Through games</span><span>Monday, October 05, 2026</span>') === "2026-10-05",
  "the «through games» date is read");
ok(throughDate("<div>Through games</div><div>Sunday, April 05, 2026</div>") === "2026-04-05",
  "women's basketball on 7 October 2026: last season's final table, dated April");
ok(throughDate("<table></table>") === null, "no date: no table");
ok(lines[1].includes("9th") && lines[1].includes("won-lost-tied percentage"), "the second-best placing");

console.log(`ncaa-rankings: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
