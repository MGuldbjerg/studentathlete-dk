/**
 * Tests for the platform limits check (pure evaluation, no network).
 * Run: npx tsx pipeline/checks/_platform-limits-test.ts
 */
import {
  evaluate, completeDays, pct, monthUsage, project, PAID_PLAN, THRESHOLDS, CPU_CAP_MS,
  type DayRow, type WorkerRow, type Usage,
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

/** A 30-day month, 10 whole days counted: projection = total × 3. */
const usage = (over: Partial<Usage> = {}): Usage => ({
  rowsRead: 0, rowsWritten: 0, requests: 0, cpuMs: 0, daysCounted: 10, daysInMonth: 30, ...over,
});
const keys = (u: Usage, w: WorkerRow[] = [], storage = 0) => evaluate(u, w, storage).map((f) => f.key).sort();
const w = (date: string, status: string, requests: number, cpuTimeUs = 0): WorkerRow => ({ date, status, requests, cpuTimeUs });

// ── today is never judged ──────────────────────────────────────────────
eq(completeDays([{ date: TODAY }, { date: YESTERDAY }]).length, 1, "today is excluded");
eq(completeDays([{ date: TODAY }]).length, 0, "a run with only today has nothing to judge");

// ── month-to-date usage ────────────────────────────────────────────────
const d1: DayRow[] = [
  { date: "2026-08-31", rowsRead: 999, rowsWritten: 999 },
  { date: "2026-09-01", rowsRead: 100, rowsWritten: 10 },
  { date: "2026-09-02", rowsRead: 200, rowsWritten: 20 },
];
const wr = [w("2026-09-01", "success", 50, 2_000_000), w("2026-09-01", "exceededResources", 5, 500_000), w("2026-09-02", "success", 70, 1_500_000)];
const u = monthUsage(d1, wr, "2026-09");
eq(u.rowsRead, 300, "only the month's own days are summed");
eq(u.requests, 125, "requests summed across statuses");
eq(u.cpuMs, 4000, "CPU microseconds become milliseconds");
eq(u.daysCounted, 2, "two whole days counted");
eq(u.daysInMonth, 30, "September has 30 days");
eq(project(300, u), 4500, "straight-line projection to month end");
eq(project(300, { ...u, daysCounted: 0 }), 0, "no whole day → no projection, no division by zero");

// ── allowances ─────────────────────────────────────────────────────────
// Real September level: ~18M CPU-ms/month → 62 % of 30M, silent.
eq(keys(usage({ cpuMs: 6_200_000 })).length, 0, "62 % of the CPU allowance is silent");
eq(keys(usage({ cpuMs: 8_000_000 })).join(), "workerCpuMs-close", "80 % projected → close");
eq(keys(usage({ cpuMs: 12_000_000 })).join(), "workerCpuMs-overage", "120 % projected → overage");
assert(!keys(usage({ cpuMs: 12_000_000 })).includes("workerCpuMs-close"), "overage does not also report close");
const over = evaluate(usage({ rowsWritten: 20_000_000 }), []).find((f) => f.key === "d1RowsWritten-overage");
assert(!!over && over.detail.includes("$10.00"), "overage is priced: 60M projected − 50M included at $1/M = $10.00");
eq(keys(usage({ rowsRead: 1_000_000_000 })).length, 0, "a billion rows read is 12 % of the read allowance");

// ── storage ────────────────────────────────────────────────────────────
eq(keys(usage(), [], 95_000_000).length, 0, "95 MB of 5 GB is silent");
eq(keys(usage(), [], 4_000_000_000).join(), "d1-storage", "4 GB is close");

// ── Workers failures (newest whole day decides) ────────────────────────
eq(keys(usage(), [w(YESTERDAY, "success", 8_436), w(YESTERDAY, "exceededResources", 700)]).join(),
  "worker-resource-limit", "7.7 % on the resource limit → finding");
eq(keys(usage(), [w(YESTERDAY, "success", 5_779), w(YESTERDAY, "exceededResources", 259)]).join(),
  "worker-resource-limit", "4.2 % — the day the failure class appeared — is caught");
eq(keys(usage(), [w(YESTERDAY, "success", 1000), w(YESTERDAY, "exceededResources", 10)]).length, 0,
  "1 % stays under the threshold");
eq(keys(usage(), [w(YESTERDAY, "success", 1000), w(YESTERDAY, "scriptThrewException", 100)]).join(),
  "worker-exceptions", "uncaught exceptions are a separate finding");
eq(keys(usage(), [w(YESTERDAY, "success", 900), w(YESTERDAY, "clientDisconnected", 100)]).length, 0,
  "client disconnects alone raise nothing");
eq(keys(usage(), [w("2026-09-01", "exceededResources", 900), w(YESTERDAY, "success", 1000)]).length, 0,
  "an old bad day is history, not a finding");
eq(keys(usage(), [w(TODAY, "exceededResources", 900)]).length, 0, "a bad TODAY raises nothing");
const cap = evaluate(usage(), [w(YESTERDAY, "success", 100), w(YESTERDAY, "exceededResources", 10)])[0];
assert(cap.fix.includes(`${CPU_CAP_MS} ms`), "the fix names our own CPU cap");

// ── empty input must not crash ─────────────────────────────────────────
eq(keys(usage({ daysCounted: 0 })).length, 0, "no data → no findings");
eq(keys(usage(), [w(YESTERDAY, "success", 0)]).length, 0, "zero requests → no division by zero");

// ── formatting ─────────────────────────────────────────────────────────
eq(pct(700, 9136), "7.7 %", "percentage is rounded to one decimal");
eq(pct(1, 0), "–", "division by zero becomes a dash, not NaN");

// ── the constants are the contract ─────────────────────────────────────
eq(PAID_PLAN.d1RowsRead.included, 25_000_000_000, "D1 Paid includes 25B rows read a month");
eq(PAID_PLAN.workerCpuMs.included, 30_000_000, "Workers Paid includes 30M CPU-ms a month");
eq(THRESHOLDS.failureShare, 0.02, "2 % failure share is the threshold");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
