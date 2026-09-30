/**
 * Browser Rendering budget — one ceiling for every script that renders.
 *
 * On the free plan Cloudflare stopped us at 10 minutes a day (a 429), and we
 * hit that wall every day from 2026-09-18. On Workers Paid (2026-09-30) there
 * is no wall: 10 hours a month are included, then $0.09 an hour. Six scripts
 * render (box scores, fact sheets, content backfill, rosters, JS rosters,
 * honours), so a per-script limit can't be the ceiling. This is.
 *
 * Source of truth is Cloudflare's own usage figure (GraphQL
 * browserRenderingBrowserTimeUsageAdaptiveGroups). The month's budget is paced
 * evenly: today may use (budget − used before today) / days left, so an early
 * burst can't eat the month. Analytics lag a few minutes, so within one run we
 * also count our own wall time. If the lookup fails, the run gets a
 * conservative fixed allowance rather than an open tap.
 *
 * Tested in pipeline/lib/_browser-budget-test.ts.
 */

/** 10 h included + up to 5 h at $0.09 = at most $0.45 extra a month. */
export const MONTHLY_BUDGET_MINUTES = Number(process.env.BROWSER_MONTHLY_MINUTES ?? 900);

/**
 * No single day may use more than this, whatever the month has left. Pacing
 * alone would hand the last day of a quiet month hours (2026-09-30 computed
 * 650 min), and Cloudflare may count the included hours per billing cycle, not
 * per calendar month. 60 min is twice the even pace.
 */
export const DAILY_CEILING_MINUTES = 60;

/** Allowance for a run whose usage lookup failed — the old free-plan pace. */
export const FALLBACK_RUN_MINUTES = 8;

export interface BudgetState {
  /** Minutes Cloudflare counted this month BEFORE today (UTC). */
  usedBeforeToday: number;
  /** Minutes Cloudflare counted today so far. */
  usedToday: number;
  /** Days left in the month, today included. */
  daysLeft: number;
}

/** Minutes today may still use. Pure — the pacing rule, testable. */
export function minutesLeftToday(s: BudgetState, monthly = MONTHLY_BUDGET_MINUTES): number {
  const remainingMonth = Math.max(0, monthly - s.usedBeforeToday);
  const todaysShare = Math.min(remainingMonth / Math.max(1, s.daysLeft), DAILY_CEILING_MINUTES);
  return Math.max(0, todaysShare - s.usedToday);
}

export function daysLeftInMonth(now = new Date()): number {
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  return last - now.getUTCDate() + 1;
}

/** Month-to-date usage from Cloudflare, split into before-today and today. */
export async function fetchUsage(
  account: string,
  token: string,
  now = new Date(),
): Promise<BudgetState> {
  const monthStart = now.toISOString().slice(0, 8) + "01";
  const today = now.toISOString().slice(0, 10);
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query{viewer{accounts(filter:{accountTag:"${account}"}){
        browserRenderingBrowserTimeUsageAdaptiveGroups(limit:40,filter:{date_geq:"${monthStart}"}){
          sum{totalSessionDurationMs} dimensions{date}}}}}`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json()) as {
    data?: { viewer: { accounts: { browserRenderingBrowserTimeUsageAdaptiveGroups: { sum: { totalSessionDurationMs: number }; dimensions: { date: string } }[] }[] } };
    errors?: { message: string }[] | null;
  };
  if (!json.data) throw new Error(json.errors?.map((e) => e.message).join("; ") ?? "no data");
  let before = 0, todayMs = 0;
  for (const r of json.data.viewer.accounts[0]?.browserRenderingBrowserTimeUsageAdaptiveGroups ?? []) {
    if (r.dimensions.date === today) todayMs += r.sum.totalSessionDurationMs;
    else before += r.sum.totalSessionDurationMs;
  }
  return { usedBeforeToday: before / 60000, usedToday: todayMs / 60000, daysLeft: daysLeftInMonth(now) };
}
