/** Roster URL candidates for teams without an inventory row (2026-10-07). */
import { getRosterUrls, prestoSeason, withCurrentSeason } from "./scrape-rosters";

let passed = 0;
let failed = 0;
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    got:      ${x}\n    expected: ${y}`); }
}

eq(prestoSeason(2026), "2026-27", "season segment");
eq(prestoSeason(2099), "2099-00", "century wrap");
eq(
  getRosterUrls("https://marshilllions.com", "soccer", "prestosports", 2026).slice(0, 3),
  [
    "https://marshilllions.com/sports/msoc/2026-27/roster",
    "https://marshilllions.com/sports/msoc/2025-26/roster",
    "https://marshilllions.com/roster.aspx?path=msoc",
  ],
  "PrestoSports: this season, last season, then the old format",
);
eq(
  getRosterUrls("https://gannonsports.com", "soccer", "sidearm", 2026),
  [
    "https://gannonsports.com/sports/soccer/roster",
    "https://gannonsports.com/sports/mens-soccer/roster",
    "https://gannonsports.com/sports/womens-soccer/roster",
  ],
  "Sidearm unchanged",
);

eq(
  withCurrentSeason("https://angelinaathletics.com/sports/msoc/2025-26/roster", 2026),
  ["https://angelinaathletics.com/sports/msoc/2026-27/roster", "https://angelinaathletics.com/sports/msoc/2025-26/roster"],
  "a stored PrestoSports season rolls forward; last season stays as fallback",
);
eq(
  withCurrentSeason("https://gannonsports.com/sports/womens-soccer/roster", 2026),
  ["https://gannonsports.com/sports/womens-soccer/roster"],
  "a URL without a season is left alone",
);

eq(
  getRosterUrls("https://mmabucs.com/landing/index", "soccer", "prestosports", 2026)[0],
  "https://mmabucs.com/sports/msoc/2026-27/roster",
  "Presto's /landing/index home page is not part of the address",
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
