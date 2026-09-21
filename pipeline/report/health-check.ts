/**
 * Platformens helbred, læst direkte hos Cloudflare.
 *
 * HVORFOR DEN FINDES. 21. september 2026 kom der en mail om at workerne ramte
 * CPU-grænsen 100+ gange i døgnet. Den lå i Mikkels indbakke, og gættet herfra
 * pegede på D1's rækkeloft i stedet — forkert, og det kostede en omgang.
 * Tallene ligger i Cloudflares GraphQL-API og kan læses når som helst; så er
 * der ingen grund til at gætte på hvad en mail stod der.
 *
 * Kør:  npx tsx pipeline/report/health-check.ts [--days 3] [--json]
 */
// Filen har ingen imports og ville ellers blive læst som et globalt script —
// så kolliderer `main` med alle andre pipeline-scripts i typetjekket.
export {};

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const GQL = "https://api.cloudflare.com/client/v4/graphql";

/** Grænserne på gratis-planen. Kilde: developers.cloudflare.com/workers/platform/limits */
const FREE = { requestsPerDay: 100_000, d1RowsReadPerDay: 5_000_000, cpuMsPerRequest: 10 };

async function gql<T>(query: string): Promise<T> {
  const res = await fetch(GQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (!json.data) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 200)}`);
  return json.data;
}

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

interface WorkerRow { sum: { requests: number; errors: number }; dimensions: { date: string; scriptName: string } }
interface D1Row { sum: { rowsRead: number; rowsWritten: number }; dimensions: { date: string } }

async function main() {
  const days = Number(process.argv[process.argv.indexOf("--days") + 1]) || 3;
  if (!ACCOUNT || !TOKEN) throw new Error("Mangler CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN");

  const w = await gql<{ viewer: { accounts: { workersInvocationsAdaptive: WorkerRow[] }[] } }>(`query {
    viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
      workersInvocationsAdaptive(limit: 200, filter: { datetime_geq: "${since(days)}" }) {
        sum { requests errors } dimensions { date scriptName }
      } } } }`);

  const d = await gql<{ viewer: { accounts: { d1AnalyticsAdaptiveGroups: D1Row[] }[] } }>(`query {
    viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
      d1AnalyticsAdaptiveGroups(limit: 200, filter: { date_geq: "${since(days).slice(0, 10)}" }) {
        sum { rowsRead rowsWritten } dimensions { date }
      } } } }`);

  const byDay = new Map<string, { req: number; err: number; rows: number }>();
  const get = (k: string) => byDay.get(k) ?? byDay.set(k, { req: 0, err: 0, rows: 0 }).get(k)!;
  for (const r of w.viewer.accounts[0]?.workersInvocationsAdaptive ?? []) {
    const e = get(r.dimensions.date); e.req += r.sum.requests; e.err += r.sum.errors;
  }
  for (const r of d.viewer.accounts[0]?.d1AnalyticsAdaptiveGroups ?? []) {
    get(r.dimensions.date).rows += r.sum.rowsRead;
  }

  const rows = [...byDay.entries()].sort();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rows.map(([date, v]) => ({ date, ...v })), null, 1));
    return;
  }

  console.log("dato        requests   fejl    fejl%   D1-rækker      % af 5M");
  const warnings: string[] = [];
  for (const [date, v] of rows) {
    const pctErr = v.req ? (v.err / v.req) * 100 : 0;
    const pctRows = (v.rows / FREE.d1RowsReadPerDay) * 100;
    console.log(
      `${date}  ${String(v.req).padStart(8)} ${String(v.err).padStart(6)} ${pctErr.toFixed(1).padStart(7)}% ` +
        `${v.rows.toLocaleString("da-DK").padStart(12)} ${pctRows.toFixed(0).padStart(8)}%`,
    );
    // Fejlprocenten ER CPU-grænsen på gratis-planen: en worker der overskrider
    // 10 ms bliver stoppet midt i arbejdet og svarer 1102.
    if (pctErr > 2) warnings.push(`${date}: ${pctErr.toFixed(1)}% af kaldene fejler — CPU-loftet (fejl 1102)`);
    if (pctRows > 70) warnings.push(`${date}: ${pctRows.toFixed(0)}% af D1's daglige rækkeloft brugt`);
    if (v.req > FREE.requestsPerDay * 0.7) warnings.push(`${date}: ${v.req} kald — nærmer sig 100.000/døgn`);
  }
  console.log(warnings.length ? "\n⚠ " + warnings.join("\n⚠ ") : "\nIngen grænser i nærheden.");
}

if (process.argv[1] && process.argv[1].endsWith("health-check.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
