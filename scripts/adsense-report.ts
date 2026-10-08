/**
 * AdSense: each site's approval state, and earnings / RPM / CPM per site.
 * Read-only. Needs the token from scripts/adsense-auth.ts (run that once).
 *
 * Run:  npx tsx scripts/adsense-report.ts             (last 30 days)
 *       npx tsx scripts/adsense-report.ts --days 7
 *       npx tsx scripts/adsense-report.ts --daily     (one row per day and site)
 *
 * Terms, as AdSense uses them:
 *   page RPM        earnings per 1,000 page views — the number to compare sites by
 *   impression RPM  earnings per 1,000 ad impressions (what is usually meant by CPM)
 *   coverage        share of ad requests that got an ad
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const CLIENT_FILE = `${homedir()}/.config/gcloud/adsense-client.json`;
const TOKEN_FILE = `${homedir()}/.config/gcloud/adsense-token.json`;
const API = "https://adsense.googleapis.com/v2";
const METRICS = ["ESTIMATED_EARNINGS", "PAGE_VIEWS", "PAGE_VIEWS_RPM", "IMPRESSIONS", "IMPRESSIONS_RPM", "CLICKS", "AD_REQUESTS_COVERAGE"];

async function accessToken(): Promise<string> {
  const raw = JSON.parse(readFileSync(CLIENT_FILE, "utf8"));
  const client = raw.installed ?? raw.web;
  const { refresh_token } = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.client_id, client_secret: client.client_secret, refresh_token, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed (${res.status}) — run scripts/adsense-auth.ts again: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function get<T>(t: string, path: string): Promise<T> {
  const res = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

function ymd(d: Date) {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const i = args.indexOf("--days");
  const days = i >= 0 ? parseInt(args[i + 1], 10) : 30;
  const daily = args.includes("--daily");

  const t = await accessToken();
  const { accounts = [] } = await get<{ accounts?: { name: string; displayName: string; state?: string }[] }>(t, "accounts");
  for (const acct of accounts) {
    console.log(`\n${acct.displayName} (${acct.name})${acct.state ? ` — account ${acct.state}` : ""}`);

    const { sites = [] } = await get<{ sites?: { domain: string; state: string; autoAdsEnabled?: boolean }[] }>(t, `${acct.name}/sites`);
    console.log("\nSites:");
    for (const s of sites) console.log(`  ${s.domain.padEnd(28)} ${s.state}${s.autoAdsEnabled ? " · auto ads on" : ""}`);

    const end = new Date();
    const start = new Date(Date.now() - (days - 1) * 86400_000);
    const q = new URLSearchParams({ dateRange: "CUSTOM", currencyCode: "DKK" });
    for (const [k, v] of Object.entries(ymd(start))) q.append(`startDate.${k}`, String(v));
    for (const [k, v] of Object.entries(ymd(end))) q.append(`endDate.${k}`, String(v));
    if (daily) q.append("dimensions", "DATE");
    q.append("dimensions", "DOMAIN_NAME");
    for (const m of METRICS) q.append("metrics", m);
    if (daily) q.append("orderBy", "+DATE");

    const rep = await get<{ headers: { name: string }[]; rows?: { cells: { value: string }[] }[]; totals?: { cells: { value: string }[] } }>(
      t, `${acct.name}/reports:generate?${q}`,
    );
    const head = rep.headers.map((h) => h.name);
    const col = (row: { cells: { value: string }[] }, name: string) => row.cells[head.indexOf(name)]?.value ?? "";
    const n = (v: string, dp = 2) => (v === "" ? "-" : Number(v).toFixed(dp));
    console.log(`\nLast ${days} days, DKK:`);
    console.log(`  ${daily ? "date        " : ""}${"site".padEnd(28)} earnings  page views  page RPM  impressions  impr. RPM  clicks  coverage`);
    for (const r of rep.rows ?? []) {
      console.log(
        `  ${daily ? col(r, "DATE").padEnd(12) : ""}${col(r, "DOMAIN_NAME").padEnd(28)} ${n(col(r, "ESTIMATED_EARNINGS")).padStart(8)}  ${col(r, "PAGE_VIEWS").padStart(10)}  ${n(col(r, "PAGE_VIEWS_RPM")).padStart(8)}  ${col(r, "IMPRESSIONS").padStart(11)}  ${n(col(r, "IMPRESSIONS_RPM")).padStart(9)}  ${col(r, "CLICKS").padStart(6)}  ${(Number(col(r, "AD_REQUESTS_COVERAGE") || 0) * 100).toFixed(0).padStart(7)}%`,
      );
    }
    if (!rep.rows?.length) console.log("  (no rows — nothing served in the period)");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
