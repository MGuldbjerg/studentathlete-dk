/**
 * PLATFORM LIMITS CHECK — the ceilings Cloudflare enforces, which nothing in
 * our own code can feel.
 *
 * Two findings sit behind this, both spotted far too late on the free plan:
 *
 *   1. **D1's row limit.** The account ran 32x over the free plan's 5M rows
 *      read per day for months, until Cloudflare started REJECTING queries on
 *      1 September 2026. See IDEA-datalag.md.
 *   2. **Workers' CPU limit.** 10 ms per request on the free plan; measured
 *      2026-09-04, 4-24 % of all requests died with `exceededResources`
 *      (error 1102), invisible anywhere but the Workers analytics.
 *
 * WORKERS PAID since 2026-09-30. The ceilings became monthly ALLOWANCES, and
 * going over them no longer breaks the site — it costs money. So the check now
 * projects month-to-date usage to the end of the month and prices the overage.
 * The failure-share check stays: on Paid a request dies on the resource limit
 * when it passes OUR cap (`limits.cpu_ms` in wrangler.toml) or runs out of
 * memory, and that is still a reader looking at an error page.
 *
 * Read-only — writes nothing, costs no tokens, does not touch D1.
 *
 *   npx tsx pipeline/checks/platform-limits.ts          # report
 *   npx tsx pipeline/checks/platform-limits.ts --json   # machine-readable
 *   npx tsx pipeline/checks/platform-limits.ts --days 7 # show more days
 */

/**
 * Workers Paid monthly allowances and overage prices (USD). Source, checked
 * 2026-09-30: developers.cloudflare.com/workers/platform/pricing and
 * /d1/platform/pricing. If the plan or the prices change, these must follow.
 */
export const PAID_PLAN = {
  d1RowsRead: { included: 25_000_000_000, perMillion: 0.001 },
  d1RowsWritten: { included: 50_000_000, perMillion: 1.0 },
  workerRequests: { included: 10_000_000, perMillion: 0.3 },
  workerCpuMs: { included: 30_000_000, perMillion: 0.02 },
  /** Storage is billed per GB-month; checked against the latest size. */
  d1StorageBytes: { included: 5_000_000_000, perGbMonth: 0.75 },
} as const;

/** Our own per-request CPU cap — mirrors `[limits] cpu_ms` in wrangler.toml. */
export const CPU_CAP_MS = 5000;

/** When a number is worth waking someone for. */
export const THRESHOLDS = {
  /** Projected share of a monthly allowance that triggers a warning. */
  allowanceShare: 0.7,
  /**
   * Share of requests allowed to die on the resource limit. Chosen on the
   * free plan so the check would have shouted on 17 August (4.2 %).
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
  /** CPU time summed over the rows, in microseconds (Cloudflare's unit). */
  cpuTimeUs?: number;
}

export interface Usage {
  /** Month-to-date totals over COMPLETE days only. */
  rowsRead: number;
  rowsWritten: number;
  requests: number;
  cpuMs: number;
  /** Complete days counted, and days in the month. */
  daysCounted: number;
  daysInMonth: number;
}

type Metered = "d1RowsRead" | "d1RowsWritten" | "workerRequests" | "workerCpuMs";

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

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * TODAY DOES NOT COUNT. A partial day always looks fine, so only WHOLE days
 * are judged, and the newest whole day decides the failure checks.
 */
export function completeDays<T extends { date: string }>(rows: T[]): T[] {
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((r) => r.date < today).sort((a, b) => a.date.localeCompare(b.date));
}

export function pct(part: number, whole: number): string {
  return whole > 0 ? `${((100 * part) / whole).toFixed(1)} %` : "–";
}

function num(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Month-to-date usage from the daily rows, whole days of `month` only. */
export function monthUsage(d1: DayRow[], workers: WorkerRow[], month: string): Usage {
  const inMonth = <T extends { date: string }>(rows: T[]) => completeDays(rows).filter((r) => r.date.startsWith(month));
  const d1m = inMonth(d1);
  const wm = inMonth(workers);
  const [y, m] = month.split("-").map(Number);
  return {
    rowsRead: d1m.reduce((a, r) => a + r.rowsRead, 0),
    rowsWritten: d1m.reduce((a, r) => a + r.rowsWritten, 0),
    requests: wm.reduce((a, r) => a + r.requests, 0),
    cpuMs: wm.reduce((a, r) => a + (r.cpuTimeUs ?? 0), 0) / 1000,
    daysCounted: new Set([...d1m, ...wm].map((r) => r.date)).size,
    daysInMonth: new Date(Date.UTC(y, m, 0)).getUTCDate(),
  };
}

/** Straight-line projection of a month-to-date total to the end of the month. */
export function project(total: number, u: Usage): number {
  return u.daysCounted > 0 ? (total / u.daysCounted) * u.daysInMonth : 0;
}

/** Turns the numbers into findings. Pure function — tested without network. */
export function evaluate(usage: Usage, workers: WorkerRow[], storageBytes = 0): Finding[] {
  const findings: Finding[] = [];

  const metered: [Metered, number, string][] = [
    ["d1RowsRead", usage.rowsRead, "D1 rows read"],
    ["d1RowsWritten", usage.rowsWritten, "D1 rows written"],
    ["workerRequests", usage.requests, "Worker requests"],
    ["workerCpuMs", usage.cpuMs, "Worker CPU milliseconds"],
  ];
  for (const [key, total, label] of metered) {
    const { included, perMillion } = PAID_PLAN[key];
    const projected = project(total, usage);
    const detail = `${num(total)} in ${usage.daysCounted} days → ~${num(projected)} by month end = ${pct(projected, included)} of ${num(included)}`;
    if (projected > included) {
      findings.push({
        key: `${key}-overage`,
        what: `${label} will pass the monthly allowance — that part is billed`,
        detail: `${detail}; estimated extra ${usd(((projected - included) / 1e6) * perMillion)}`,
        fix: key.startsWith("d1")
          ? "`wrangler d1 insights studentathlete-dk --sort-by reads --time-period 1d` — look at numberOfTimesRun, not just rows. IDEA-datalag.md §7c"
          : "`wrangler tail studentathlete-dk --format json` for what is heavy; the edge cache (workers/entry.ts) is the first lever",
      });
    } else if (projected > included * THRESHOLDS.allowanceShare) {
      findings.push({
        key: `${key}-close`,
        what: `${label} is heading for the monthly allowance`,
        detail,
        fix: "nothing is billed yet — find what grew while there is headroom",
      });
    }
  }

  const { included: storageIncluded, perGbMonth } = PAID_PLAN.d1StorageBytes;
  if (storageBytes > storageIncluded * THRESHOLDS.allowanceShare) {
    findings.push({
      key: "d1-storage",
      what: storageBytes > storageIncluded ? "D1 storage is past the included 5 GB — billed monthly" : "D1 storage is heading for the included 5 GB",
      detail: `${(storageBytes / 1e9).toFixed(2)} GB of ${storageIncluded / 1e9} GB` +
        (storageBytes > storageIncluded ? `; ~${usd(((storageBytes - storageIncluded) / 1e9) * perGbMonth)}/month` : ""),
      fix: "the catalogue and analytics tables are the big ones — check their retention",
    });
  }

  // Workers: the SHARE of the newest whole day that never became a response.
  const byDay = new Map<string, Map<string, number>>();
  for (const r of workers) {
    if (!byDay.has(r.date)) byDay.set(r.date, new Map());
    const m = byDay.get(r.date)!;
    m.set(r.status, (m.get(r.status) ?? 0) + r.requests);
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
        key: "worker-resource-limit",
        what: "requests are dying on the resource limit (error 1102) — the reader gets a Cloudflare error page",
        detail: `${lastW.date}: ${num(exceeded)} of ${num(total)} requests = ${pct(exceeded, total)}`,
        fix: `\`wrangler tail studentathlete-dk --format json --status error\` shows which URLs. On Paid that means our own cap (${CPU_CAP_MS} ms, wrangler.toml [limits]) or memory — fix the page before raising the cap`,
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
  }

  return findings;
}

export async function main(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const daysArg = process.argv.indexOf("--days");
  const showDays = daysArg >= 0 ? parseInt(process.argv[daysArg + 1] ?? "3", 10) : 3;

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) {
    throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set");
  }
  // Month-to-date is the unit now; fetch at least that far back. On the 1st,
  // "month-to-date" has no whole day yet, so the projection uses last month.
  const yesterday = isoDaysAgo(1);
  const month = yesterday.slice(0, 7);
  const monthStart = `${month}-01`;
  const shown = isoDaysAgo(showDays);
  const since = shown < monthStart ? shown : monthStart;

  const d1Data = await graphql<{
    viewer: { accounts: {
      d1AnalyticsAdaptiveGroups: { sum: { rowsRead: number; rowsWritten: number }; dimensions: { date: string } }[];
      d1StorageAdaptiveGroups: { max: { databaseSizeBytes: number }; dimensions: { date: string } }[];
    }[] };
  }>(
    token,
    `query{viewer{accounts(filter:{accountTag:"${account}"}){
      d1AnalyticsAdaptiveGroups(limit:100,filter:{date_geq:"${since}"},orderBy:[date_ASC]){
        sum{rowsRead rowsWritten} dimensions{date}}
      d1StorageAdaptiveGroups(limit:1,filter:{date_geq:"${since}"},orderBy:[date_DESC]){
        max{databaseSizeBytes} dimensions{date}}}}}`,
  );
  const acc = d1Data.viewer.accounts[0];
  const d1: DayRow[] = acc.d1AnalyticsAdaptiveGroups.map((r) => ({
    date: r.dimensions.date,
    rowsRead: r.sum.rowsRead,
    rowsWritten: r.sum.rowsWritten,
  }));
  const storageBytes = acc.d1StorageAdaptiveGroups[0]?.max.databaseSizeBytes ?? 0;

  const wData = await graphql<{
    viewer: { accounts: { workersInvocationsAdaptive: { sum: { requests: number; cpuTimeUs: number }; dimensions: { date: string; status: string } }[] }[] };
  }>(
    token,
    `query{viewer{accounts(filter:{accountTag:"${account}"}){
      workersInvocationsAdaptive(limit:2000,filter:{datetime_geq:"${since}T00:00:00Z"}){
        sum{requests cpuTimeUs} dimensions{date status}}}}}`,
  );
  const workers: WorkerRow[] = wData.viewer.accounts[0].workersInvocationsAdaptive.map((r) => ({
    date: r.dimensions.date,
    status: r.dimensions.status,
    requests: r.sum.requests,
    cpuTimeUs: r.sum.cpuTimeUs,
  }));

  const usage = monthUsage(d1, workers, month);
  const findings = evaluate(usage, workers, storageBytes);

  if (asJson) {
    console.log(JSON.stringify({ ran_at: new Date().toISOString(), month, usage, storageBytes, d1, workers, findings }, null, 2));
  } else {
    console.log(`Platform — Cloudflare's own numbers (Workers Paid, ${month} to date, ${usage.daysCounted} whole days)\n`);
    const line = (label: string, key: Metered, total: number) => {
      const p = PAID_PLAN[key];
      const projected = project(total, usage);
      console.log(`  ${label.padEnd(18)} ${num(total).padStart(16)}  → ~${num(projected).padStart(16)} by month end  (${pct(projected, p.included).padStart(8)} of allowance)`);
    };
    line("D1 rows read", "d1RowsRead", usage.rowsRead);
    line("D1 rows written", "d1RowsWritten", usage.rowsWritten);
    line("Worker requests", "workerRequests", usage.requests);
    line("Worker CPU ms", "workerCpuMs", usage.cpuMs);
    console.log(`  ${"D1 storage".padEnd(18)} ${(storageBytes / 1e9).toFixed(2).padStart(13)} GB  of 5 GB included`);

    const byDay = new Map<string, Map<string, number>>();
    const cpuByDay = new Map<string, number>();
    for (const r of workers) {
      if (!byDay.has(r.date)) byDay.set(r.date, new Map());
      const m = byDay.get(r.date)!;
      m.set(r.status, (m.get(r.status) ?? 0) + r.requests);
      cpuByDay.set(r.date, (cpuByDay.get(r.date) ?? 0) + (r.cpuTimeUs ?? 0));
    }
    console.log("\nLast days:");
    for (const { date } of completeDays([...byDay.keys()].map((date) => ({ date }))).filter((d) => d.date >= shown)) {
      const m = byDay.get(date)!;
      const total = [...m.values()].reduce((a, b) => a + b, 0);
      const ex = m.get("exceededResources") ?? 0;
      const reads = d1.find((r) => r.date === date)?.rowsRead ?? 0;
      console.log(`  ${date}  requests ${String(total).padStart(6)}  resource limit ${String(ex).padStart(5)} (${pct(ex, total).padStart(6)})  CPU ${num((cpuByDay.get(date) ?? 0) / 1e6).padStart(5)} s  D1 reads ${num(reads).padStart(11)}`);
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

// Only run when this file IS the entry point (the test imports it too).
if (process.argv[1]?.endsWith("/platform-limits.ts")) {
  main().catch((err) => {
    console.error("Platform limits check failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
