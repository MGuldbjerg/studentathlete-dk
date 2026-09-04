/**
 * Tests for the platform limits check (pure evaluation, no network).
 * Run: npx tsx pipeline/checks/_platform-limits-test.ts
 */
import {
  evaluate, completeDays, pct, FREE_LIMITS, THRESHOLDS,
  type DayRow, type WorkerRow,
} from "./platform-limits";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function eq<T>(actual: T, expected: T, msg: string): void {
  assert(actual === expected, `${msg} (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`);
}

const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);

const keys = (d1: DayRow[], w: WorkerRow[]) => evaluate(d1, w).map((f) => f.key).sort();
const day = (date: string, rowsRead: number, rowsWritten = 1000): DayRow => ({ date, rowsRead, rowsWritten });
const w = (date: string, status: string, requests: number): WorkerRow => ({ date, status, requests });

// ── today is never judged ──────────────────────────────────────────────
// A partial day always looks fine; judging it would mean the check is quiet
// exactly on the morning of a bad day.
eq(completeDays([{ date: TODAY }, { date: YESTERDAY }]).length, 1, "today is excluded");
eq(completeDays([{ date: TODAY }]).length, 0, "a run with only today has nothing to judge");
eq(keys([day(TODAY, 99_000_000)], []).length, 0, "a catastrophic TODAY raises nothing");

// ── D1 quota ───────────────────────────────────────────────────────────
eq(keys([day(YESTERDAY, 5_122_094)], []).join(), "d1-quota-exceeded", "over the limit → exceeded");
eq(keys([day(YESTERDAY, 4_000_000)], []).join(), "d1-quota-close", "80 % of the limit → close");
eq(keys([day(YESTERDAY, 2_100_000)], []).length, 0, "42 % (the level after the 09-04 fix) is silent");
// Exceeded and close are the same axis — never both.
assert(!keys([day(YESTERDAY, 9_000_000)], []).includes("d1-quota-close"), "exceeded does not also report close");
eq(keys([day(YESTERDAY, 1000, 80_000)], []).join(), "d1-write-quota", "write quota is its own finding");

// The NEWEST whole day decides — an old bad day must not keep shouting.
eq(keys([day("2026-09-01", 179_000_000), day(YESTERDAY, 1_000_000)], []).length, 0,
  "yesterday is fine → the disaster three days ago is history, not a finding");

// ── Workers ────────────────────────────────────────────────────────────
eq(keys([], [w(YESTERDAY, "success", 8_436), w(YESTERDAY, "exceededResources", 700)]).join(),
  "worker-cpu-limit", "7.7 % on the resource limit → finding");
// The threshold is set so 17 August (4.2 %) would have been caught.
eq(keys([], [w(YESTERDAY, "success", 5_779), w(YESTERDAY, "exceededResources", 259)]).join(),
  "worker-cpu-limit", "4.2 % — the day the failure class appeared — is caught");
eq(keys([], [w(YESTERDAY, "success", 1000), w(YESTERDAY, "exceededResources", 10)]).length, 0,
  "1 % stays under the threshold");
eq(keys([], [w(YESTERDAY, "success", 1000), w(YESTERDAY, "scriptThrewException", 100)]).join(),
  "worker-exceptions", "uncaught exceptions are a separate finding from the CPU limit");
// clientDisconnected counts in the denominator but is not a failure of ours.
eq(keys([], [w(YESTERDAY, "success", 900), w(YESTERDAY, "clientDisconnected", 100)]).length, 0,
  "client disconnects alone raise nothing");
eq(keys([], [w(YESTERDAY, "success", 80_000)]).join(),
  "worker-request-quota", "80 % of the request quota → finding");

// ── both sources at once ───────────────────────────────────────────────
eq(keys([day(YESTERDAY, 5_122_094)], [w(YESTERDAY, "success", 8_436), w(YESTERDAY, "exceededResources", 700)]).join(),
  "d1-quota-exceeded,worker-cpu-limit", "2026-09-03 as it actually was → both findings");

// ── empty input must not crash ─────────────────────────────────────────
eq(keys([], []).length, 0, "no data → no findings");
eq(keys([], [w(YESTERDAY, "success", 0)]).length, 0, "zero requests → no division by zero");

// ── formatting ─────────────────────────────────────────────────────────
eq(pct(700, 9136), "7.7 %", "percentage is rounded to one decimal");
eq(pct(1, 0), "–", "division by zero becomes a dash, not NaN");

// ── the constants are the contract ─────────────────────────────────────
eq(FREE_LIMITS.d1RowsRead, 5_000_000, "D1 free limit is 5M rows read");
eq(THRESHOLDS.failureShare, 0.02, "2 % failure share is the threshold");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
