/**
 * Unit-tests for fletnings-sekvensen. Kør: npx tsx src/lib/_athlete-merge-test.ts
 *
 * Den vigtigste test er RÆKKEFØLGEN. Alle tabeller med fremmednøgle til
 * athletes(id) skal være ryddet FØR `DELETE FROM athletes` — ellers fejler
 * fletningen med "FOREIGN KEY constraint failed" midt i sekvensen og
 * efterlader data halvt flyttet. Præcis den fejl ramte /admin/dubletter, fordi
 * merge_candidates peger på taberen med en fremmednøgle.
 */
import { buildMergeStatements, type MergeableAthlete } from "./athlete-merge";

let passed = 0;
let failed = 0;

function ok(cond: boolean, label: string): void {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

const keep: MergeableAthlete = {
  id: 197,
  slug: "alexander-moeldrup",
  name: "Alexander Moeldrup",
  hometown: "Denmark",
  roster_key: "lipscombsports.com#7037",
};
const loser: MergeableAthlete = {
  id: 100,
  slug: "alexander-moldrup",
  name: "Alexander Moldrup",
  hometown: "Aarhus, Denmark",
  position: "Golfer",
};

const stmts = buildMergeStatements(keep, loser);
const sqls = stmts.map((s) => s.sql);
const idx = (needle: string) => sqls.findIndex((s) => s.includes(needle));

// ── Fremmednøgle-sikkerhed: alt der peger på taberen ryddes før sletningen ───
const deleteAthlete = idx("DELETE FROM athletes");
ok(deleteAthlete !== -1, "sekvensen sletter taber-rækken");

for (const table of [
  "merge_candidates", // fremmednøgle (migration 032) — regressionen der ramte prod
  "athlete_aliases", // fremmednøgle
  "photo_suggestions", // fremmednøgle
  "articles",
  "stories",
  "sources",
  "athlete_events",
]) {
  const last = sqls.map((s, i) => (s.includes(table) ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
  ok(last !== -1 && last < deleteAthlete, `${table} ryddes FØR DELETE FROM athletes`);
}

// ── Taberens URL skal overleve som alias ─────────────────────────────────────
const aliasStmt = stmts.find((s) => s.sql.includes("INSERT OR IGNORE INTO athlete_aliases"));
ok(!!aliasStmt, "taberens slug gemmes som alias");
ok(aliasStmt?.params.includes(loser.slug) === true, "aliaset bruger taberens slug");
ok(aliasStmt?.params.includes(keep.id) === true, "aliaset peger på keeperen");

// Et alias må aldrig have samme slug som en levende atlet (redirect-løkke).
ok(
  stmts.some((s) => s.sql.includes("DELETE FROM athlete_aliases WHERE slug = ?") &&
    s.params.includes(keep.slug)),
  "keeperens egen slug fjernes fra alias-tabellen",
);

// ── Felt-arv: en rigtig by slår et bart "Denmark" ────────────────────────────
const fieldMerge = stmts.find((s) => s.sql.includes("UPDATE athletes SET"));
ok(!!fieldMerge, "keeperen arver manglende felter");
ok(
  fieldMerge?.params[2] === "Aarhus, Denmark",
  'bart "Denmark" på keeperen opgraderes til taberens rigtige by',
);

// Omvendt: har keeperen allerede en by, røres den ikke.
const noUpgrade = buildMergeStatements(
  { ...keep, hometown: "Odense, Denmark" },
  { ...loser, hometown: "Aarhus, Denmark" },
).find((s) => s.sql.includes("UPDATE athletes SET"));
ok(noUpgrade?.params[2] === null, "udfyldt hometown på keeperen overskrives aldrig");

// ── Vagt mod at flette en række ind i sig selv ───────────────────────────────
ok(buildMergeStatements(keep, keep).length === 0, "samme id → ingen statements");

console.log(`\nathlete-merge: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
