/**
 * One-time Threads setup for one market: token in, GitHub secrets out.
 *
 *   npx tsx pipeline/social/setup-threads.ts --country UK      (or: setup-threads.bat)
 *
 * Paste the token from the app dashboard (Threads use case → "User Token
 * Generator", logged in as the market's Threads profile). The script:
 *   1. upgrades it to a 60-day token if it is short-lived (needs THREADS_APP_SECRET
 *      in the environment; a token from the generator is usually long-lived already),
 *   2. asks /me who it belongs to and prints the username — check it is the
 *      right market's profile before anything is written,
 *   3. writes THREADS_<CC>_USER_ID + THREADS_<CC>_ACCESS_TOKEN with `gh secret set`.
 *
 * From then on refresh-ig-tokens.yml renews the token weekly.
 * The token is read from stdin, never from an argument (process lists).
 */

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { envNameFor } from "./registry";
import { COUNTRIES } from "../../src/lib/countries";

const HOST = "https://graph.threads.net";
const REPO = "MGuldbjerg/studentathlete-dk";

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

function setSecret(name: string, value: string): void {
  const res = spawnSync("gh", ["secret", "set", name, "--repo", REPO], { input: value, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`gh secret set ${name} failed: ${res.stderr.trim()}`);
}

async function main(): Promise<void> {
  const i = process.argv.indexOf("--country");
  const country = (i > 0 ? process.argv[i + 1] : "")?.toUpperCase();
  if (!country || !(country in COUNTRIES)) {
    throw new Error(`--country must be one of ${Object.keys(COUNTRIES).join(", ")}`);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let token = (await rl.question(`Threads token for ${country}: `)).trim();
  if (!token) throw new Error("no token given");

  // Short-lived tokens last an hour; the exchange gives 60 days. A long-lived
  // token is refused by the exchange, so it is only tried with a secret at hand.
  const secret = process.env.THREADS_APP_SECRET;
  if (secret) {
    try {
      const ex = await getJson(
        `${HOST}/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(token)}`,
      );
      if (typeof ex.access_token === "string") {
        token = ex.access_token;
        console.log(`Upgraded to a long-lived token (${Math.floor(Number(ex.expires_in ?? 0) / 86_400)} days).`);
      }
    } catch (err) {
      console.log(`Exchange skipped (${err instanceof Error ? err.message : err}) — assuming the token is long-lived.`);
    }
  }

  const me = await getJson(`${HOST}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
  console.log(`\nToken belongs to @${me.username} (id ${me.id}).`);
  const ok = (await rl.question(`Is that the ${country} profile? Write secrets? [y/N] `)).trim().toLowerCase();
  rl.close();
  if (ok !== "y") {
    console.log("Nothing written.");
    return;
  }

  setSecret(envNameFor("threads", country, "USER_ID"), String(me.id));
  setSecret(envNameFor("threads", country, "ACCESS_TOKEN"), token);
  console.log(`✓ ${envNameFor("threads", country, "USER_ID")} + ${envNameFor("threads", country, "ACCESS_TOKEN")} set. The next social run posts to Threads.`);
}

main().catch((err) => {
  console.error("Setup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
