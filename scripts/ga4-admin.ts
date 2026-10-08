/**
 * GA4 property settings, from the command line — a narrow tool on purpose.
 *
 * It can read the settings, create event-scoped custom dimensions, add or
 * remove key events, set event-data retention and switch enhanced-measurement
 * options. Nothing else: no access management, no links, no deletion of
 * properties or streams. Mikkel allows exactly this script in Claude Code's
 * permissions (`Bash(npx tsx scripts/ga4-admin.ts:*)`), 2026-10-08.
 *
 * The service account (key in GOOGLE_SEARCH_CONSOLE_KEY) needs the Editor role
 * on the property for anything but `status`.
 *
 * Run:  npx tsx scripts/ga4-admin.ts status
 *       npx tsx scripts/ga4-admin.ts add-dimension both page_type "Page type"
 *       npx tsx scripts/ga4-admin.ts add-key-event both bio_click
 *       npx tsx scripts/ga4-admin.ts remove-key-event uk qualify_lead
 *       npx tsx scripts/ga4-admin.ts retention uk 14
 *       npx tsx scripts/ga4-admin.ts enhanced both pageChangesEnabled=false
 *
 * `dk` / `uk` / `both` name the properties.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { SignJWT, importPKCS8 } from "jose";

const PROPERTIES: Record<string, { id: string; stream: string; site: string }> = {
  dk: { id: "370967469", stream: "5087788715", site: "studentathlete.dk" },
  uk: { id: "557937554", stream: "16059144038", site: "student-athlete.co.uk" },
};
const API = "https://analyticsadmin.googleapis.com/v1alpha";

/** Enhanced-measurement switches this script may change. */
const ENHANCED_FIELDS = [
  "pageChangesEnabled", "scrollsEnabled", "outboundClicksEnabled", "siteSearchEnabled",
  "videoEngagementEnabled", "fileDownloadsEnabled", "formInteractionsEnabled",
];

async function token(write: boolean): Promise<string> {
  const path = process.env.GOOGLE_SEARCH_CONSOLE_KEY ?? "~/.config/gcloud/sa-searchconsole.json";
  const key = JSON.parse(readFileSync(path.replace(/^~/, homedir()), "utf8"));
  const pk = await importPKCS8(key.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const scope = `https://www.googleapis.com/auth/analytics.${write ? "edit" : "readonly"}`;
  const assertion = await new SignJWT({ scope })
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

async function call<T = Record<string, unknown>>(t: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.replace(/\s+/g, " ").slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

function targets(which: string | undefined): string[] {
  if (which === "both") return Object.keys(PROPERTIES);
  if (which && PROPERTIES[which]) return [which];
  throw new Error(`property must be dk, uk or both — got ${which}`);
}

interface KeyEvent { name: string; eventName: string }
interface Dimension { parameterName: string; displayName: string }

async function status(t: string, p: string): Promise<void> {
  const { id, stream, site } = PROPERTIES[p];
  const prop = await call<{ timeZone: string; currencyCode: string }>(t, "GET", `properties/${id}`);
  const ret = await call<{ eventDataRetention: string }>(t, "GET", `properties/${id}/dataRetentionSettings`);
  const keys = (await call<{ keyEvents?: KeyEvent[] }>(t, "GET", `properties/${id}/keyEvents`)).keyEvents ?? [];
  const dims = (await call<{ customDimensions?: Dimension[] }>(t, "GET", `properties/${id}/customDimensions`)).customDimensions ?? [];
  const em = await call<Record<string, unknown>>(t, "GET", `properties/${id}/dataStreams/${stream}/enhancedMeasurementSettings`);
  const ads = (await call<{ adsenseLinks?: unknown[] }>(t, "GET", `properties/${id}/adSenseLinks`)).adsenseLinks ?? [];
  console.log(`\n${p.toUpperCase()} — ${site} (property ${id})`);
  console.log(`  time zone ${prop.timeZone}, currency ${prop.currencyCode}, event data retention ${ret.eventDataRetention}`);
  console.log(`  AdSense linked: ${ads.length > 0 ? "yes" : "no"}`);
  console.log(`  key events: ${keys.map((k) => k.eventName).join(", ") || "(none)"}`);
  console.log(`  custom dimensions: ${dims.map((d) => `${d.parameterName} («${d.displayName}»)`).join(", ") || "(none)"}`);
  console.log(`  enhanced measurement: ${ENHANCED_FIELDS.map((f) => `${f.replace("Enabled", "")}=${em[f] === true}`).join(" ")}`);
}

async function main(): Promise<void> {
  const [cmd, which, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "status") {
    const t = await token(false);
    for (const p of targets(which ?? "both")) await status(t, p);
    return;
  }
  const t = await token(true);
  for (const p of targets(which)) {
    const { id, stream } = PROPERTIES[p];
    if (cmd === "add-dimension") {
      const [param, displayName, description = ""] = rest;
      if (!param || !displayName) throw new Error("add-dimension <dk|uk|both> <parameter> <display name> [description]");
      const dims = (await call<{ customDimensions?: Dimension[] }>(t, "GET", `properties/${id}/customDimensions`)).customDimensions ?? [];
      if (dims.some((d) => d.parameterName === param)) { console.log(`${p}: dimension ${param} already exists`); continue; }
      await call(t, "POST", `properties/${id}/customDimensions`, { parameterName: param, displayName, description, scope: "EVENT" });
      console.log(`${p}: dimension ${param} («${displayName}») created`);
    } else if (cmd === "add-key-event") {
      const [eventName] = rest;
      if (!eventName) throw new Error("add-key-event <dk|uk|both> <event name>");
      const keys = (await call<{ keyEvents?: KeyEvent[] }>(t, "GET", `properties/${id}/keyEvents`)).keyEvents ?? [];
      if (keys.some((k) => k.eventName === eventName)) { console.log(`${p}: key event ${eventName} already exists`); continue; }
      await call(t, "POST", `properties/${id}/keyEvents`, { eventName, countingMethod: "ONCE_PER_EVENT" });
      console.log(`${p}: key event ${eventName} added`);
    } else if (cmd === "remove-key-event") {
      const [eventName] = rest;
      if (!eventName) throw new Error("remove-key-event <dk|uk|both> <event name>");
      const keys = (await call<{ keyEvents?: KeyEvent[] }>(t, "GET", `properties/${id}/keyEvents`)).keyEvents ?? [];
      const hit = keys.find((k) => k.eventName === eventName);
      if (!hit) { console.log(`${p}: no key event ${eventName}`); continue; }
      await call(t, "DELETE", hit.name.replace(/^\//, ""));
      console.log(`${p}: key event ${eventName} removed (the events themselves are still collected)`);
    } else if (cmd === "retention") {
      const months = rest[0];
      const value = { "2": "TWO_MONTHS", "14": "FOURTEEN_MONTHS" }[months ?? ""];
      if (!value) throw new Error("retention <dk|uk|both> <2|14>");
      await call(t, "PATCH", `properties/${id}/dataRetentionSettings?updateMask=eventDataRetention`, { eventDataRetention: value });
      console.log(`${p}: event data retention ${value}`);
    } else if (cmd === "enhanced") {
      const updates: Record<string, boolean> = {};
      for (const kv of rest) {
        const [field, v] = kv.split("=");
        if (!ENHANCED_FIELDS.includes(field) || (v !== "true" && v !== "false")) {
          throw new Error(`enhanced <dk|uk|both> field=true|false … — fields: ${ENHANCED_FIELDS.join(", ")}`);
        }
        updates[field] = v === "true";
      }
      if (Object.keys(updates).length === 0) throw new Error("enhanced: nothing to change");
      await call(t, "PATCH", `properties/${id}/dataStreams/${stream}/enhancedMeasurementSettings?updateMask=${Object.keys(updates).join(",")}`, updates);
      console.log(`${p}: enhanced measurement ${JSON.stringify(updates)}`);
    } else {
      throw new Error(`unknown command ${cmd} — status | add-dimension | add-key-event | remove-key-event | retention | enhanced`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
