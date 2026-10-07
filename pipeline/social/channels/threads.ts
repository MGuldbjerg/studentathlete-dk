/**
 * Threads adapter (graph.threads.net). One factory, one account per country.
 * Secrets (registry.ts): THREADS_<CC>_USER_ID + THREADS_<CC>_ACCESS_TOKEN.
 *
 * Why Threads at all: it is the Meta channel where links are CLICKABLE. On
 * Instagram a caption link is dead text, so Instagram is reach and Threads is
 * page views (2026-10-05).
 *
 * OWN TOKEN, not the Instagram one. Threads has its own host, its own scopes
 * (`threads_basic`, `threads_content_publish`) and its own 60-day token with
 * its own refresh grant (`th_refresh_token`). `refresh-ig-tokens.ts` renews it
 * weekly next to the Instagram-login tokens.
 *
 * The same three steps as Instagram: create a container, wait until it is
 * FINISHED, publish. Meta says to wait "on average 30 seconds" before
 * publishing; we ask the status endpoint instead of sleeping a fixed time.
 *
 * The link goes in `link_attachment`, not in the text: Threads then draws a
 * preview card from the article's og:image. That is why `cardKind` is "share"
 * — the article must have its share card before the post goes out.
 *
 * Limits: 500 characters of text, one `topic_tag`, 250 posts per 24 hours.
 */

import { ChannelAuthError, type PostContent, type SocialChannel } from "../types";
import { accountIsConfigured, channelNameFor, readAccountEnv } from "../registry";
import { COUNTRY_TAGS } from "../hashtags";
import { interpretContainerStatus } from "./instagram";

export const THREADS_GRAPH = "https://graph.threads.net/v1.0";

const CONTAINER_TIMEOUT_MS = 120_000;
const CONTAINER_POLL_MS = 5_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function authFailed(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * The post's one topic. Threads allows a single tag, and it goes to the niche
 * (the country tag, same as on Bluesky), not the sport: «#CollegeSoccer» is an
 * ocean, Danes/Brits in US college sport is the audience. Rules: 1-50
 * characters, no periods or ampersands — both country tags satisfy them.
 */
export function threadsTopicTag(country: string): string | null {
  return COUNTRY_TAGS[country.toUpperCase()] ?? null;
}

/** The container request, as a pure function so the shape can be tested. */
export function threadsContainerParams(content: PostContent, country: string, token: string): URLSearchParams {
  const params = new URLSearchParams({
    media_type: "TEXT",
    text: content.text,
    link_attachment: content.url,
    access_token: token,
  });
  const topic = threadsTopicTag(country);
  if (topic) params.set("topic_tag", topic);
  return params;
}

/**
 * "Media Not Found" right after the container reported FINISHED.
 *
 * Seen 2026-10-07 (threads_uk, fbtrace A7BtsrpY7P9M9at5liWR2Ru): the status
 * endpoint said FINISHED, and threads_publish answered 400, code 24, subcode
 * 4279009, "The media with id … cannot be found". Meta flags it
 * is_transient:false, but it is the publish endpoint not yet seeing what the
 * status endpoint already sees. Publishing the SAME container again a little
 * later is the fix; any other 400 is a real failure.
 */
export function isMediaNotYetVisible(status: number, body: string): boolean {
  return status === 400 && /"error_subcode"\s*:\s*4279009/.test(body);
}

/** Waits before re-publishing a container the publish endpoint could not see yet. */
export const PUBLISH_RETRY_DELAYS_MS = [10_000, 30_000];

async function waitForContainer(creationId: string, token: string): Promise<void> {
  const deadline = Date.now() + CONTAINER_TIMEOUT_MS;
  let lastStatus = "unknown";

  while (Date.now() < deadline) {
    const res = await fetch(
      `${THREADS_GRAPH}/${creationId}?fields=status,error_message&access_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) {
      const body = await res.text();
      if (authFailed(res.status)) {
        throw new ChannelAuthError(`Threads refused the token at the status check (${res.status}): ${body}`);
      }
      lastStatus = `status check failed (${res.status})`;
      await sleep(CONTAINER_POLL_MS);
      continue;
    }
    const data = (await res.json()) as { status?: string; error_message?: string };
    lastStatus = data.status ?? "no status";

    const verdict = interpretContainerStatus(data.status);
    if (verdict === "ready") return;
    if (verdict === "dead") {
      throw new Error(`Threads container ended as ${lastStatus}: ${data.error_message ?? "no explanation"}`);
    }
    await sleep(CONTAINER_POLL_MS);
  }

  throw new Error(`Threads container not ready within ${CONTAINER_TIMEOUT_MS / 1000} s (last status: ${lastStatus})`);
}

/** Fail-soft: without the permalink we have still posted. */
async function fetchPermalink(mediaId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${THREADS_GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { permalink?: string };
    return data.permalink ?? null;
  } catch {
    return null;
  }
}

export function createThreadsChannel(country: string): SocialChannel {
  return {
    name: channelNameFor("threads", country),
    platform: "threads",
    country,
    cardKind: "share",

    isConfigured(): boolean {
      return accountIsConfigured("threads", country);
    },

    async post(content: PostContent): Promise<{ postUrl: string | null }> {
      const userId = readAccountEnv("threads", country, "USER_ID")!;
      const token = readAccountEnv("threads", country, "ACCESS_TOKEN")!;

      const createRes = await fetch(`${THREADS_GRAPH}/${userId}/threads`, {
        method: "POST",
        body: threadsContainerParams(content, country, token),
      });
      if (!createRes.ok) {
        const body = await createRes.text();
        if (authFailed(createRes.status)) {
          throw new ChannelAuthError(`Threads refused the token at the container (${createRes.status}): ${body}`);
        }
        throw new Error(`Threads container failed (${createRes.status}): ${body}`);
      }
      const { id: creationId } = (await createRes.json()) as { id?: string };
      if (!creationId) throw new Error("Threads container without an id in the response");

      await waitForContainer(creationId, token);

      const publish = () =>
        fetch(`${THREADS_GRAPH}/${userId}/threads_publish`, {
          method: "POST",
          body: new URLSearchParams({ creation_id: creationId, access_token: token }),
        });
      let pubRes = await publish();
      for (const delay of PUBLISH_RETRY_DELAYS_MS) {
        if (pubRes.ok) break;
        const body = await pubRes.clone().text();
        if (!isMediaNotYetVisible(pubRes.status, body)) break;
        await sleep(delay);
        pubRes = await publish();
      }
      if (!pubRes.ok) {
        const body = await pubRes.text();
        if (authFailed(pubRes.status)) {
          throw new ChannelAuthError(`Threads refused the token at publish (${pubRes.status}): ${body}`);
        }
        throw new Error(`Threads publish failed (${pubRes.status}): ${body}`);
      }
      const { id: mediaId } = (await pubRes.json()) as { id?: string };
      if (!mediaId) return { postUrl: null };

      return { postUrl: await fetchPermalink(mediaId, token) };
    },
  };
}
