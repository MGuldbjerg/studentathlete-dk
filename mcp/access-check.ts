/**
 * access_check — what can this PC actually reach? One harmless call per service.
 * ==============================================================================
 *
 * Mikkel, 2026-10-29: «Should you make a permissions check to confirm whether you
 * can or can't do something?» Three surprises in one day (GA4 access nobody
 * remembered, an API token without R2 rights, a Worker token whose scope was
 * guessed) came from answering «can we?» out of memory. This answers it by trying.
 *
 * Every probe is a read: a GET, a one-day report, a list of names. None writes,
 * none prints a credential — only status codes and the service's own error text.
 * Pure and injectable (Deps) so mcp/_access-check-test.ts runs without a network.
 * The access map in docs/RUNBOOK.md says where each credential lives; this checks
 * that it still works.
 */
import { table } from "./ops-guards";

export type Verdict = "yes" | "no" | "unknown";
export interface Check { service: string; verdict: Verdict; detail: string }

export interface Deps {
  env: Record<string, string | undefined>;
  fetch: (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ status: number; text: () => Promise<string> }>;
  exec: (cmd: string, args: string[]) => Promise<string>;
  /** An access token for the service account, for the given scope. Throws if the key is missing. */
  googleToken: (scope: string) => Promise<string>;
}

const GA4 = { DK: "370967469", UK: "557937554" };
/** Worker secrets the site cannot run without; `wrangler secret list` shows names only. */
export const EXPECTED_WORKER_SECRETS = ["ADMIN_TOKEN", "ANALYTICS_SALT", "GITHUB_TOKEN", "MCP_TOKEN"];

/** Cloudflare answers 200 with success, or an HTTP error with `errors[].code`. 10000 = not authorised, 10042 = R2 not enabled. */
export function classifyCloudflare(status: number, body: string, what: string): Check {
  let codes: number[] = [];
  let message = "";
  try {
    const j = JSON.parse(body) as { success?: boolean; errors?: Array<{ code: number; message: string }> };
    codes = (j.errors ?? []).map((e) => e.code);
    message = (j.errors ?? []).map((e) => e.message).join("; ");
    if (status === 200 && j.success !== false) return { service: what, verdict: "yes", detail: "" };
  } catch { /* not JSON — judged by status below */ }
  if (codes.includes(10042)) return { service: what, verdict: "no", detail: "R2 is not enabled on the account (Dashboard → R2)" };
  if (status === 401 || status === 403 || codes.includes(10000)) return { service: what, verdict: "no", detail: `token lacks permission${message ? ` — ${message}` : ""}` };
  return { service: what, verdict: "unknown", detail: `HTTP ${status}${message ? ` — ${message}` : ""}` };
}

/** The scopes line of `gh api -i user`. Fine-grained tokens send none, which is «unknown», not «no». */
export function parseGhScopes(headers: string): string[] | null {
  const m = headers.match(/^x-oauth-scopes:\s*(.*)$/im);
  if (!m) return null;
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

export function missingSecrets(have: string[], want: string[] = EXPECTED_WORKER_SECRETS): string[] {
  return want.filter((n) => !have.includes(n));
}

/** Runs one probe; a thrown error means «could not tell», never a crash and never a leaked value. */
async function attempt(service: string, f: () => Promise<Check | Check[]>): Promise<Check[]> {
  try {
    const r = await f();
    return Array.isArray(r) ? r : [r];
  } catch (e) {
    return [{ service, verdict: "unknown", detail: (e instanceof Error ? e.message : String(e)).slice(0, 160) }];
  }
}

export async function accessCheck(d: Deps): Promise<Check[]> {
  const cfToken = d.env.CLOUDFLARE_API_TOKEN, account = d.env.CLOUDFLARE_ACCOUNT_ID, dbId = d.env.CLOUDFLARE_D1_DATABASE_ID;
  const cf = async (path: string, what: string): Promise<Check> => {
    if (!cfToken || !account) return { service: what, verdict: "no", detail: "CLOUDFLARE_API_TOKEN / _ACCOUNT_ID not set in this server's environment" };
    const r = await d.fetch(`https://api.cloudflare.com/client/v4${path}`, { headers: { Authorization: `Bearer ${cfToken}` } });
    return classifyCloudflare(r.status, await r.text(), what);
  };
  const ga = async (label: string, id: string): Promise<Check> => {
    const t = await d.googleToken("https://www.googleapis.com/auth/analytics.readonly");
    const r = await d.fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }], metrics: [{ name: "sessions" }], limit: 1 }),
    });
    return r.status === 200 ? { service: `GA4 Data API ${label}`, verdict: "yes", detail: "" }
      : r.status === 403 ? { service: `GA4 Data API ${label}`, verdict: "no", detail: "service account has no access to the property" }
      : { service: `GA4 Data API ${label}`, verdict: "unknown", detail: `HTTP ${r.status}` };
  };

  const groups = await Promise.all([
    attempt("Cloudflare token", () => cf("/user/tokens/verify", "Cloudflare token valid")),
    attempt("Cloudflare D1", () => cf(`/accounts/${account}/d1/database/${dbId}`, "Cloudflare D1")),
    attempt("Cloudflare R2", () => cf(`/accounts/${account}/r2/buckets`, "Cloudflare R2 (cards)")),
    attempt("Cloudflare zones", () => cf("/zones?per_page=1", "Cloudflare zones (cache purge, bot settings)")),
    attempt("GA4 DK", () => ga("DK", GA4.DK)),
    attempt("GA4 UK", () => ga("UK", GA4.UK)),
    attempt("Search Console", async () => {
      const t = await d.googleToken("https://www.googleapis.com/auth/webmasters.readonly");
      const r = await d.fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${t}` } });
      return r.status === 200 ? { service: "Search Console", verdict: "yes" as const, detail: "" } : { service: "Search Console", verdict: r.status === 403 ? "no" as const : "unknown" as const, detail: `HTTP ${r.status}` };
    }),
    attempt("GitHub", async () => {
      const scopes = parseGhScopes(await d.exec("gh", ["api", "-i", "user"]));
      if (!scopes) return { service: "GitHub (gh on this PC)", verdict: "unknown", detail: "logged in, but a fine-grained token reports no scopes" };
      const lacking = ["repo", "workflow"].filter((s) => !scopes.includes(s));
      return { service: "GitHub (gh on this PC)", verdict: lacking.length ? "no" : "yes", detail: lacking.length ? `missing scope: ${lacking.join(", ")}` : `scopes: ${scopes.join(", ")}` };
    }),
    attempt("Brevo", async () => {
      const key = d.env.BREVO_API_KEY;
      if (!key) return { service: "Brevo", verdict: "no", detail: "BREVO_API_KEY not set in this server's environment (mcp/run.sh passes it on)" };
      const r = await d.fetch("https://api.brevo.com/v3/account", { headers: { "api-key": key, accept: "application/json" } });
      return { service: "Brevo", verdict: r.status === 200 ? "yes" : r.status === 401 ? "no" : "unknown", detail: r.status === 200 ? "" : `HTTP ${r.status}` };
    }),
    attempt("Worker secrets", async () => {
      const raw = await d.exec("wrangler", ["secret", "list", "--format", "json"]);
      const have = (JSON.parse(raw) as Array<{ name: string }>).map((s) => s.name);
      const missing = missingSecrets(have);
      return { service: "Worker secrets (names only)", verdict: missing.length ? "no" : "yes", detail: missing.length ? `not set: ${missing.join(", ")}` : "all expected names set — values cannot be tested from here, GITHUB_TOKEN's scope included" };
    }),
  ]);
  return groups.flat();
}

export function formatChecks(checks: Check[]): string {
  const mark = { yes: "✓ can", no: "✗ cannot", unknown: "? unknown" } as const;
  const lines = table(["access", "result", "detail"], checks.map((c) => [c.service, mark[c.verdict], c.detail]));
  const no = checks.filter((c) => c.verdict === "no").length, unk = checks.filter((c) => c.verdict === "unknown").length;
  return `${lines}\n${checks.length - no - unk} can · ${no} cannot · ${unk} unknown. Claude's own quota: claude_quota. Update the «Verified» column in docs/RUNBOOK.md with today's date for what passed.`;
}
