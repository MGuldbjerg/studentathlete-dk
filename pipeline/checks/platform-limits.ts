/**
 * PLATFORM LIMITS CHECK — the ceilings Cloudflare enforces, which nothing in
 * our own code can feel.
 *
 * Two findings sit behind this, both spotted far too late:
 *
 *   1. **D1's row limit.** The account ran 32x over the free plan's 5M rows
 *      read per day for months. Nobody noticed until Cloudflare started
 *      REJECTING queries on 1 September 2026 — and then the site looked like
 *      it had lost its content (404s, a sitemap with 57 URLs). See
 *      IDEA-datalag.md.
 *
 *   2. **Workers' CPU limit.** The free plan allows 10 ms CPU per request.
 *      Measured 2026-09-04: 4-24 % of ALL requests died with
 *      `exceededResources` — continuously since 17 August. The failure happens
 *      BEFORE our code can log anything: Cloudflare kills the invocation and
 *      answers 1102. It exists in exactly one place — the Workers analytics.
 *
 * What they share: both are invisible from the inside. The site looks healthy,
 * the logs are empty, the pipeline keeps running. This check asks the platform.
 *
 * Read-only — writes nothing, costs no tokens, does not touch D1.
 *
 *   npx tsx pipeline/checks/platform-limits.ts          # report
 *   npx tsx pipeline/checks/platform-limits.ts --json   # machine-readable
 *   npx tsx pipeline/checks/platform-limits.ts --days 7 # look further back
 */

/** Free-plan ceilings. If they change, or we change plan, these must follow. */
export const FREE_LIMITS = {
  /** D1: rows read per UTC day. Exceed it and queries are REJECTED. */
  d1RowsRead: 5_000_000,
  /** D1: rows written per UTC day. */
  d1RowsWritten: 100_000,
  /** Workers: requests per UTC day. */
  workerRequests: 100_000,
} as const;

/** When a number is worth waking someone for. */
export const THRESHOLDS = {
  /** Share of a quota that triggers a warning. 70 % leaves days to react. */
  quotaShare: 0.7,
  /**
   * Share of requests allowed to die on the resource limit.
   *
   * 2 % is not ambitious — it is chosen so the check would have shouted on
   * 17 August (4.2 %), the day the failure class appeared, instead of three
   * weeks later.
   */
  failureShare: 0.02,
} as const;

const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

export interface Finding {
  key: string;
  what: string;
  /** The number that triggered the finding, as text — it IS the evidence. */
  detail: string;
  fix: string;
}

export interface DayRow {
  date: string;
  rowsRead: number;
  rowsWritten: number;
}

export interface WorkerRow {
  date: string;
  status: string;
  requests: number;
}

async function graphql<T>(token: string, query: string): Promise<T> {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = (await res.json()) as { data: T | null; errors: { message: string }[] | null };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("GraphQL responded without data");
  return json.data;
}

/** ISO date N days back, UTC — the quotas reset at UTC midnight. */
function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * TODAY DOES NOT COUNT.
 *
 * A partial day always looks fine — at 09:00 UTC even a catastrophic day sits
 * under every threshold. So the check judges only WHOLE days, and the newest
 * whole day is the one that decides whether a message goes out.
 */
export function completeDays<T extends { date: string }>(rows: T[]): T[] {
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((r) => r.date < today).sort((a, b) => a.date.localeCompare(b.date));
}

export function pct(part: number, whole: number): string {
  return whole > 0 ? `${((100 * part) / whole).toFixed(1)} %` : "–";
}

function num(n: number): string {
  return n.toLocaleString("en-GB");
}

/** Turns the numbers into findings. Pure function — tested without network. */
export function evaluate(d1: DayRow[], workers: WorkerRow[]): Finding[] {
  const findings: Finding[] = [];

  const d1Days = completeDays(d1);
  const last = d1Days[d1Days.length - 1];
  if (last) {
    if (last.rowsRead > FREE_LIMITS.d1RowsRead) {
      findings.push({
        key: "d1-quota-exceeded",
        what: "D1 read more rows than the free plan allows — queries are REJECTED until UTC midnight",
        detail: `${last.date}: ${num(last.rowsRead)} rows read of ${num(FREE_LIMITS.d1RowsRead)} (${pct(last.rowsRead, FREE_LIMITS.d1RowsRead)})`,
        fix: "run `wrangler d1 insights studentathlete-dk --sort-by reads --time-period 1d` and look at numberOfTimesRun, not just the row count. IDEA-datalag.md §7c",
      });
    } else if (last.rowsRead > FREE_LIMITS.d1RowsRead * THRESHOLDS.quotaShare) {
      findings.push({
        key: "d1-quota-close",
        what: "D1's daily read quota is running out",
        detail: `${last.date}: ${num(last.rowsRead)} rows read = ${pct(last.rowsRead, FREE_LIMITS.d1RowsRead)} of the quota`,
        fix: "same recipe as above, while there is still headroom",
      });
    }
    if (last.rowsWritten > FREE_LIMITS.d1RowsWritten * THRESHOLDS.quotaShare) {
      findings.push({
        key: "d1-write-quota",
        what: "D1's daily WRITE quota is running out",
        detail: `${last.date}: ${num(last.rowsWritten)} rows written = ${pct(last.rowsWritten, FREE_LIMITS.d1RowsWritten)} of the quota`,
        fix: "find which pipeline run is writing — historically we sit at ~5 % of it",
      });
    }
  }

  // Workers: group per day, and look at the SHARE that never became a response.
  const byDay = new Map<string, Map<string, number>>();
  for (const r of workers) {
    if (!byDay.has(r.date)) byDay.set(r.date, new Map());
    byDay.get(r.date)!.set(r.status, r.requests);
  }
  const wDays = completeDays([...byDay.keys()].map((date) => ({ date })));
  const lastW = wDays[wDays.length - 1];
  if (lastW) {
    const m = byDay.get(lastW.date)!;
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    const exceeded = m.get("exceededResources") ?? 0;
    const scriptError = m.get("scriptThrewException") ?? 0;

    if (total > 0 && exceeded / total > THRESHOLDS.failureShare) {
      findings.push({
        key: "worker-cpu-limit",
        what: "requests are dying on Workers' resource limit (error 1102) — the reader gets a Cloudflare error page, not the site",
        detail: `${lastW.date}: ${num(exceeded)} of ${num(total)} requests = ${pct(exceeded, total)}`,
        fix: "`wrangler tail studentathlete-dk --format json --status error` shows which URLs. The free plan gives 10 ms CPU per request; Workers Paid gives 30 s",
      });
    }
    if (total > 0 && scriptError / total > THRESHOLDS.failureShare) {
      findings.push({
        key: "worker-exceptions",
        what: "the Worker is throwing uncaught exceptions",
        detail: `${lastW.date}: ${num(scriptError)} of ${num(total)} requests = ${pct(scriptError, total)}`,
        fix: "`wrangler tail --status error` shows the stack",
      });
    }
    if (total > FREE_LIMITS.workerRequests * THRESHOLDS.quotaShare) {
      findings.push({
        key: "worker-request-quota",
        what: "Workers' daily request quota is running out",
        detail: `${lastW.date}: ${num(total)} requests = ${pct(total, FREE_LIMITS.workerRequests)} of the quota`,
        fix: "this is good news dressed as a warning — traffic grew. Workers Paid raises the ceiling",
      });
    }
  }

  return findings;
}

async function main(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const daysArg = process.argv.indexOf("--days");
  const days = daysArg >= 0 ? parseInt(process.argv[daysArg + 1] ?? "3", 10) : 3;

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set");
  }
  const since = isoDaysAgo(days);

  const d1Data = await graphql<{
    viewer: { accounts: { d1AnalyticsAdaptiveGroups: { sum: { rowsRead: number; rowsWritten: number }; dimensions: { date: string } }[] }[] };
  }>(
    token,
    `query{viewer{accounts(filter:{accountTag:"${account}"}){
      d1AnalyticsAdaptiveGroups(limit:100,filter:{date_geq:"${since}"},orderBy:[date_ASC]){
        sum{rowsRead rowsWritten} dimensions{date}}}}}`,
  );
  const d1: DayRow[] = d1Data.viewer.accounts[0].d1AnalyticsAdaptiveGroups.map((r) => ({
    date: r.dimensions.date,
    rowsRead: r.sum.rowsRead,
    rowsWritten: r.sum.rowsWritten,
  }));

  const wData = await graphql<{
    viewer: { accounts: { workersInvocationsAdaptive: { sum: { requests: number }; dimensions: { date: string; status: string } }[] }[] };
  }>(
    token,
    `query{viewer{accounts(filter:{accountTag:"${account}"}){
      workersInvocationsAdaptive(limit:500,filter:{datetime_geq:"${since}T00:00:00Z"}){
        sum{requests} dimensions{date status}}}}}`,
  );
  const workers: WorkerRow[] = wData.viewer.accounts[0].workersInvocationsAdaptive.map((r) => ({
    date: r.dimensions.date,
    status: r.dimensions.status,
    requests: r.sum.requests,
  }));

  const findings = evaluate(d1, workers);

  if (asJson) {
    console.log(JSON.stringify({ ran_at: new Date().toISOString(), d1, workers, findings }, null, 2));
  } else {
    console.log("Platform limits — Cloudflare's own numbers\n");
    console.log("D1, rows read/written per day (limit 5,000,000 / 100,000):");
    for (const r of completeDays(d1)) {
      console.log(`  ${r.date}  ${num(r.rowsRead).padStart(12)}  (${pct(r.rowsRead, FREE_LIMITS.d1RowsRead).padStart(7)})   written ${num(r.rowsWritten)}`);
    }
    const byDay = new Map<string, Map<string, number>>();
    for (const r of workers) {
      if (!byDay.has(r.date)) byDay.set(r.date, new Map());
      byDay.get(r.date)!.set(r.status, r.requests);
    }
    console.log("\nWorkers, requests per day:");
    for (const { date } of completeDays([...byDay.keys()].map((date) => ({ date })))) {
      const m = byDay.get(date)!;
      const total = [...m.values()].reduce((a, b) => a + b, 0);
      const ex = m.get("exceededResources") ?? 0;
      console.log(`  ${date}  total ${String(total).padStart(6)}   resource limit ${String(ex).padStart(5)} (${pct(ex, total)})`);
    }
    console.log("");
    if (findings.length === 0) {
      console.log("Nothing to report.");
    } else {
      for (const f of findings) {
        console.log(`▸ ${f.key}`);
        console.log(`  ${f.what}`);
        console.log(`    · ${f.detail}`);
        console.log(`  → ${f.fix}\n`);
      }
    }
  }

  // Exit 0 whatever we find — a red cross every day is a cross you learn to
  // ignore. The workflow reads the count.
  console.log(`PLATFORM_FINDINGS=${findings.length}`);
}

// Only run when this file IS the entry point. `includes("platform-limits")`
// would also match `_platform-limits-test.ts`, and the test would then hit the
// network and print the live report over its own output.
if (process.argv[1]?.endsWith("/platform-limits.ts")) {
  main().catch((err) => {
    console.error("Platform limits check failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
