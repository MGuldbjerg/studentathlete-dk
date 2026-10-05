/**
 * Daily follower count per social account → follower_counts (migration 061).
 *
 *   npx tsx pipeline/social/collect-followers.ts [--dry-run]
 *
 * Runs from follower-counts.yml. One row per channel per day; a second run the
 * same day overwrites, so a re-run is harmless. The channel name is the
 * social_posts.channel value, so the dashboard can put posts and followers on
 * one timeline.
 *
 * Where each count comes from:
 *   bluesky    public AppView getProfile — no login, the handle is enough
 *   instagram  `followers_count` on the IG user (Facebook- or Instagram-login host)
 *   facebook   `followers_count` on the page
 *   threads    threads_insights metric=followers_count (needs the
 *              `threads_manage_insights` scope on the token)
 *
 * Unconfigured and disabled channels (SOCIAL_DISABLED_CHANNELS) are skipped.
 * Any failing account exits 1 so the workflow's Discord step fires; the others
 * are still written.
 */

import { createD1Client } from "../lib/d1-client";
import { allAccounts, accountIsConfigured, readAccountEnv, type SocialAccount } from "./registry";
import { graphFor } from "./channels/instagram";
import { THREADS_GRAPH } from "./channels/threads";
import { channelIsDisabled } from "./post-social";

const FB_GRAPH = "https://graph.facebook.com/v26.0";
const BSKY_APPVIEW = "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile";

export interface FollowerRequest {
  url: string;
  /** Pull the count out of the response; null = the response had none. */
  pick(json: unknown): number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The request for one account, or null when it is not set up. Pure, for tests. */
export function followerRequest(a: SocialAccount): FollowerRequest | null {
  const env = (field: string) => readAccountEnv(a.platform, a.country, field);
  const tok = (t: string) => encodeURIComponent(t);

  switch (a.platform) {
    case "bluesky": {
      const handle = env("HANDLE");
      if (!handle) return null;
      return {
        url: `${BSKY_APPVIEW}?actor=${encodeURIComponent(handle)}`,
        pick: (j) => num((j as { followersCount?: unknown }).followersCount),
      };
    }
    case "instagram": {
      if (!accountIsConfigured("instagram", a.country)) return null;
      return {
        url: `${graphFor(a.country)}/${env("USER_ID")}?fields=followers_count&access_token=${tok(env("ACCESS_TOKEN")!)}`,
        pick: (j) => num((j as { followers_count?: unknown }).followers_count),
      };
    }
    case "facebook": {
      if (!accountIsConfigured("facebook", a.country)) return null;
      return {
        url: `${FB_GRAPH}/${env("PAGE_ID")}?fields=followers_count&access_token=${tok(env("PAGE_ACCESS_TOKEN")!)}`,
        pick: (j) => num((j as { followers_count?: unknown }).followers_count),
      };
    }
    case "threads": {
      if (!accountIsConfigured("threads", a.country)) return null;
      return {
        url: `${THREADS_GRAPH}/${env("USER_ID")}/threads_insights?metric=followers_count&access_token=${tok(env("ACCESS_TOKEN")!)}`,
        pick: (j) => {
          const data = (j as { data?: { name?: string; total_value?: { value?: unknown } }[] }).data ?? [];
          return num(data.find((d) => d.name === "followers_count")?.total_value?.value);
        },
      };
    }
    default:
      return null;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const day = new Date().toISOString().slice(0, 10);
  const counts: { channel: string; followers: number }[] = [];
  let failed = false;

  for (const a of allAccounts()) {
    if (channelIsDisabled(a.channel)) {
      console.log(`${a.channel}: disabled — skipped`);
      continue;
    }
    const req = followerRequest(a);
    if (!req) continue;
    try {
      const res = await fetch(req.url);
      const body = await res.text();
      // Never echo the URL: it carries the token.
      if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 200)}`);
      const n = req.pick(JSON.parse(body));
      if (n === null) throw new Error(`no follower count in the response: ${body.slice(0, 200)}`);
      counts.push({ channel: a.channel, followers: n });
      console.log(`${a.channel}: ${n}`);
    } catch (err) {
      failed = true;
      console.error(`${a.channel}: ✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!dryRun && counts.length > 0) {
    const db = createD1Client();
    for (const c of counts) {
      await db.execute(
        `INSERT INTO follower_counts (channel, day, followers) VALUES (?, ?, ?)
         ON CONFLICT(channel, day) DO UPDATE SET followers = excluded.followers`,
        [c.channel, day, c.followers],
      );
    }
    console.log(`Wrote ${counts.length} counts for ${day}.`);
  }

  if (failed) process.exit(1);
}

if (process.argv[1] && /collect-followers\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Follower collection failed:", err);
    process.exit(1);
  });
}
