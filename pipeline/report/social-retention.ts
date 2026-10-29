/**
 * Social visitors before vs after a date, from GA4 — read-only.
 *
 * Mikkel, 2026-10-28: social posts bring decent traffic for our follower count,
 * but many bounce. #80 (live 2026-10-29 07:42 UTC) gave every article a «read
 * next» that never runs dry, an athlete card, clickable tags and a band for
 * `?source=`/`?kilde=` visitors. This measures whether it worked.
 *
 * Social = default channel group «Organic Social» OR session medium «social».
 * Our tagged links arrive as medium «social» via campaignFromSource
 * (src/lib/ga4.ts); untagged ones (e.g. the app opening a link) as Organic Social.
 *
 * Same service account as scripts/ga4-admin.ts (key in GOOGLE_SEARCH_CONSOLE_KEY,
 * default ~/.config/gcloud/sa-searchconsole.json), readonly scope, Data API only.
 *
 *   npx tsx pipeline/report/social-retention.ts                     # since 2026-10-29
 *   npx tsx pipeline/report/social-retention.ts --since 2026-10-29 --days 14
 *
 * «after» = since … since+days-1 (capped at yesterday); «before» = the same
 * number of days ending the day before `since`.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { SignJWT, importPKCS8 } from "jose";

const PROPERTIES = { DK: "370967469", UK: "557937554" } as const;

async function token(): Promise<string> {
  const path = process.env.GOOGLE_SEARCH_CONSOLE_KEY ?? "~/.config/gcloud/sa-searchconsole.json";
  const key = JSON.parse(readFileSync(path.replace(/^~/, homedir()), "utf8"));
  const pk = await importPKCS8(key.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/analytics.readonly" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(key.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return day(d); };

/** The two equal windows around `since`; «after» never runs past yesterday. */
export function windows(since: string, days: number, today = day(new Date())) {
  const yesterday = addDays(today, -1);
  let afterEnd = addDays(since, days - 1);
  if (afterEnd > yesterday) afterEnd = yesterday;
  const n = Math.round((Date.parse(afterEnd) - Date.parse(since)) / 86_400_000) + 1;
  if (n < 1) throw new Error(`no full day after ${since} yet`);
  return { before: { from: addDays(since, -n), to: addDays(since, -1) }, after: { from: since, to: afterEnd }, days: n };
}

const METRICS = ["sessions", "engagedSessions", "engagementRate", "screenPageViewsPerSession", "userEngagementDuration", "bounceRate"];

async function report(t: string, property: string, w: ReturnType<typeof windows>) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [
        { startDate: w.before.from, endDate: w.before.to, name: "before" },
        { startDate: w.after.from, endDate: w.after.to, name: "after" },
      ],
      metrics: METRICS.map((name) => ({ name })),
      dimensionFilter: { orGroup: { expressions: [
        { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { value: "Organic Social" } } },
        { filter: { fieldName: "sessionMedium", stringFilter: { value: "social" } } },
      ] } },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`runReport ${property}: ${res.status} ${text.replace(/\s+/g, " ").slice(0, 300)}`);
  const rows = (JSON.parse(text).rows ?? []) as Array<{ dimensionValues: { value: string }[]; metricValues: { value: string }[] }>;
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const m: Record<string, number> = {};
    METRICS.forEach((name, i) => (m[name] = Number(r.metricValues[i].value)));
    out[r.dimensionValues[0].value] = m;
  }
  return out;
}

function fmt(m: Record<string, number> | undefined) {
  if (!m || !m.sessions) return { sessions: "0", engaged: "–", views: "–", time: "–", bounce: "–" };
  return {
    sessions: String(m.sessions),
    engaged: `${(m.engagementRate * 100).toFixed(0)} %`,
    views: m.screenPageViewsPerSession.toFixed(2),
    time: `${Math.round(m.userEngagementDuration / m.sessions)} s`,
    bounce: `${(m.bounceRate * 100).toFixed(0)} %`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const val = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const since = val("--since") ?? "2026-10-29";
  const w = windows(since, Number(val("--days") ?? 14));
  const t = await token();
  console.log(`Social sessions (Organic Social or medium=social), ${w.days} day(s) each`);
  console.log(`before ${w.before.from}…${w.before.to}  vs  after ${w.after.from}…${w.after.to}\n`);
  console.log("site | period | sessions | engagement rate | views/session | engaged time/session | bounce");
  for (const [site, id] of Object.entries(PROPERTIES)) {
    const r = await report(t, id, w);
    for (const p of ["before", "after"] as const) {
      const f = fmt(r[p]);
      console.log(`${site} | ${p} | ${f.sessions} | ${f.engaged} | ${f.views} | ${f.time} | ${f.bounce}`);
    }
  }
  console.log("\nSmall numbers: read the direction, not the decimals.");
}

if (/[\\/]social-retention\.ts$/.test(process.argv[1] ?? "")) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
