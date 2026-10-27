/** Tests for the statistics pages' text. Run: npx tsx src/lib/_stats-prose-test.ts */
import { statsProse } from "./stats-prose";
import type { SiteStats, StatsBlock } from "./athlete-stats";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

const blk = (f: number, m: number, u: number): StatsBlock => ({
  totals: { f, m, u, total: f + m + u },
  bySport: [
    { sport: "soccer", f: 5, m: 21, u: 0, total: 26 },
    { sport: "tennis", f: 8, m: 6, u: 0, total: 14 },
    { sport: "track-and-field", f: 6, m: 3, u: 2, total: 11 },
    { sport: "american-football", f: 0, m: 1, u: 0, total: 1 },
  ],
  byDivision: [
    { division: "NCAA D1", f: 31, m: 17, u: 2, total: 50 },
    { division: "NCAA D2", f: 10, m: 17, u: 0, total: 27 },
    { division: "NAIA", f: 2, m: 10, u: 2, total: 14 },
  ],
});
const uk: SiteStats = { all: blk(40, 47, 4), nations: { england: blk(30, 30, 0), wales: blk(10, 17, 4) }, nationUnknown: 3, excluded: 0 };
const words = (ps: string[]) => ps.join(" ").split(/\s+/).length;

const all = statsProse(uk, null, "en");
expect("all UK: totals first, with the unknowns explained", all[0].startsWith("Our database lists 91 UK athletes") && all[0].includes("4 on a roster"), true);
expect("all UK: the three biggest sports, the first capitalised", all[1].startsWith("Football is the biggest sport, with 26 athletes (29%), followed by tennis (14) and athletics (11)"), true);
expect("all UK: divisions read out", all[2], "By level: 50 in NCAA Division I, 27 in NCAA Division II and 14 in NAIA.");
expect("all UK: home nations, largest first, plus the unplaced", all[3], "By home nation: England 60 and Wales 31. Another 3 have a hometown that only says “UK”.");
expect("all UK: ends with how we count", all[all.length - 1].startsWith("How we count"), true);
expect("all UK: enough words to lift a 92-word page over 200", words(all) >= 120, true);

const wales = statsProse(uk, "wales", "en");
expect("nation page: about that nation", wales[0].startsWith("Our database lists 31 athletes from Wales"), true);
expect("nation page: no home-nation paragraph", wales.some((p) => p.startsWith("By home nation")), false);
expect("nation page: enough words too", words(wales) >= 110, true);

const dk: SiteStats = { all: blk(10, 12, 0), nations: {}, nationUnknown: 0, excluded: 0 };
const da = statsProse(dk, null, "da");
expect("DK: Danish, no unknown clause when there are none", da[0], "Vores database har 22 danske atleter på amerikanske college-hold i denne sæson: 10 kvinder og 12 mænd.");
expect("DK: no nation paragraph", da.some((p) => p.startsWith("Fordelt på nation")), false);

expect("a nation without data: nothing", statsProse(uk, "scotland", "en"), []);
expect("an empty site: nothing", statsProse({ all: blk(0, 0, 0), nations: {}, nationUnknown: 0, excluded: 0 }, null, "en"), []);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
