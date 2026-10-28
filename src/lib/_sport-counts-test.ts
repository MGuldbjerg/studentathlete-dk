/**
 * The sport landing page's counts now come from the cached (sport, active)
 * aggregate instead of their own uncached query. This holds the two views
 * (`activeBySport`, `countsForSport`) to what the old queries returned, run
 * against SQLite (node:sqlite, Node 22).
 * Kør: npx tsx src/lib/_sport-counts-test.ts
 */
import { createRequire } from "node:module";
import { SPORT_ACTIVE_COUNTS_SQL, activeBySport, countsForSport, type SportActiveCount } from "./sport-counts";

let passed = 0;
let failed = 0;
function eq<T>(actual: T, expected: T, msg: string): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++;
  else { failed++; console.error(`  ✗ ${msg} (fik ${JSON.stringify(actual)}, ville have ${JSON.stringify(expected)})`); }
}

// @types/node 20 has no node:sqlite; the runtime (Node 22) does.
interface Stmt { run(...p: unknown[]): unknown; all(...p: unknown[]): Record<string, unknown>[] }
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): Stmt };
};

const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE athletes (id INTEGER PRIMARY KEY, sport TEXT, home_country TEXT, active INTEGER)");
const add = db.prepare("INSERT INTO athletes (sport, home_country, active) VALUES (?, ?, ?)");
const roster: Array<[string | null, string, number | null, number]> = [
  ["soccer", "UK", 1, 5], ["soccer", "UK", 0, 2],
  ["golf", "UK", 1, 3],
  ["tennis", "UK", 0, 4],                 // only former athletes
  ["rowing", "UK", null, 1],              // active unknown: counted as former, as before
  [null, "UK", 1, 6],                     // no sport: in no sport's count
  ["soccer", "DK", 1, 7],                 // another site
];
for (const [sport, country, active, n] of roster) for (let i = 0; i < n; i++) add.run(sport, country, active);

const rows = db.prepare(SPORT_ACTIVE_COUNTS_SQL).all("UK") as unknown as SportActiveCount[];

// The old landing-page query, per sport.
const oldLanding = (sport: string) => {
  let active = 0, alumni = 0;
  for (const r of db.prepare("SELECT active, COUNT(*) as cnt FROM athletes WHERE sport = ? AND home_country = ? GROUP BY active").all(sport, "UK")) {
    if (r.active === 1) active = Number(r.cnt);
    else alumni = Number(r.cnt);
  }
  return { active, alumni };
};
for (const sport of ["soccer", "golf", "tennis", "rowing", "swimming"]) {
  eq(countsForSport(rows, sport), oldLanding(sport), `landing counts for ${sport} match the old query`);
}

// The old home-band query.
const oldBands = new Map(
  db.prepare("SELECT sport, COUNT(*) AS n FROM athletes WHERE active = 1 AND home_country = ? AND sport IS NOT NULL GROUP BY sport")
    .all("UK").map((r) => [String(r.sport), Number(r.n)] as const),
);
eq([...activeBySport(rows)].sort(), [...oldBands].sort(), "home band counts match the old query");
eq(countsForSport(rows, "Soccer"), { active: 0, alumni: 0 }, "the sport key is matched exactly, as in SQL");

console.log(`sport-counts: ${passed} ok, ${failed} fejl`);
if (failed > 0) process.exit(1);
