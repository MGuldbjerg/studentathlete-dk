/**
 * Renew Instagram-login tokens before they die (weekly, refresh-ig-tokens.yml).
 *
 *   npx tsx pipeline/social/refresh-ig-tokens.ts [--dry-run]
 *
 * Accounts on Instagram API with Instagram Login (`IG_<CC>_LOGIN=instagram`,
 * see channels/instagram.ts) hold a long-lived token that lasts 60 days. A
 * refresh returns a new 60-day token, and Meta refuses it for a token under
 * 24 hours old — so a weekly run always has margin on both ends.
 *
 * The new token is written back to the same GitHub secret with `gh secret set`.
 * That needs `GH_TOKEN` = a fine-grained PAT with Secrets: write on this repo
 * (the workflow's own GITHUB_TOKEN cannot write secrets). The PAT expires too,
 * so its expiry is read from GitHub's response header and warned about early.
 *
 * Any failure exits 1, so the workflow's Discord step fires. A token that is
 * not renewed for 60 days stops Instagram for that market.
 */

import { spawnSync } from "node:child_process";
import { allAccounts, envNameFor, readAccountEnv } from "./registry";
import { usesInstagramLogin } from "./channels/instagram";

const REFRESH_URL = "https://graph.instagram.com/refresh_access_token";

/** Warn this many days before the PAT that writes the secrets expires. */
const PAT_WARNING_DAYS = 21;

/** Days left until the PAT expires, from GitHub's header; null = no expiry or unknown. */
export function patDaysLeft(expirationHeader: string | null, now: Date = new Date()): number | null {
  if (!expirationHeader) return null;
  const at = Date.parse(expirationHeader.replace(" UTC", "Z").replace(" ", "T"));
  if (Number.isNaN(at)) return null;
  return Math.floor((at - now.getTime()) / 86_400_000);
}

function patExpiryHeader(repo: string): string | null {
  const res = spawnSync("gh", ["api", "-i", `/repos/${repo}`], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`gh api fejlede: ${res.stderr.trim()}`);
  const line = res.stdout.split(/\r?\n/).find((l) => /^github-authentication-token-expiration:/i.test(l));
  return line ? line.split(":").slice(1).join(":").trim() : null;
}

async function refresh(token: string): Promise<{ token: string; days: number }> {
  const res = await fetch(`${REFRESH_URL}?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`refresh fejlede (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("refresh-svaret havde intet access_token");
  return { token: data.access_token, days: Math.floor((data.expires_in ?? 0) / 86_400) };
}

function writeSecret(name: string, value: string, repo: string): void {
  // Value on stdin, never as an argument: arguments show up in process lists.
  const res = spawnSync("gh", ["secret", "set", name, "--repo", repo], { input: value, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`gh secret set ${name} fejlede: ${res.stderr.trim()}`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const repo = process.env.GITHUB_REPOSITORY;
  if (!dryRun && (!repo || !process.env.GH_TOKEN)) {
    throw new Error("GITHUB_REPOSITORY og GH_TOKEN (PAT med Secrets: write) skal være sat");
  }

  let failed = false;
  const accounts = allAccounts(["instagram"]).filter((a) => usesInstagramLogin(a.country));
  if (accounts.length === 0) console.log("Ingen konti på Instagram login — intet at forny.");

  for (const a of accounts) {
    const name = envNameFor("instagram", a.country, "ACCESS_TOKEN");
    const token = readAccountEnv("instagram", a.country, "ACCESS_TOKEN");
    if (!token) {
      console.log(`${a.channel}: ${name} mangler — springes over`);
      continue;
    }
    if (dryRun) {
      console.log(`${a.channel} [dry-run]: ville forny ${name}`);
      continue;
    }
    try {
      const fresh = await refresh(token);
      // Mask before anything could echo it; GitHub hides the value from then on.
      console.log(`::add-mask::${fresh.token}`);
      writeSecret(name, fresh.token, repo!);
      console.log(`${a.channel}: ${name} fornyet ✓ — gyldig ${fresh.days} dage`);
    } catch (err) {
      failed = true;
      console.error(`${a.channel}: ✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!dryRun && accounts.length > 0) {
    const days = patDaysLeft(patExpiryHeader(repo!));
    if (days === null) console.log("PAT: intet udløb oplyst");
    else if (days < PAT_WARNING_DAYS) {
      failed = true;
      console.error(`PAT: udløber om ${days} dage — lav en ny og gem den som GH_SECRETS_PAT`);
    } else console.log(`PAT: ${days} dage tilbage ✓`);
  }

  if (failed) process.exit(1);
}

// Entrypoint guard: importing must never call Meta or GitHub.
if (process.argv[1] && /refresh-ig-tokens\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Fornyelse fejlede:", err);
    process.exit(1);
  });
}
