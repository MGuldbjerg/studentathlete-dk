/**
 * X/Twitter-adapter via API v2 (gratis tier: ~500 opslag/md — rigeligt med
 * pacing-grænsen på 24/dag, men værd at huske hvis grænsen hæves).
 *
 * Secrets (fra developer.x.com-appen, user context):
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 *
 * POST /2/tweets kræver OAuth 1.0a-signering (HMAC-SHA1) — implementeret
 * her med node:crypto, ingen ekstra dependency. JSON-body indgår ikke i
 * signaturgrundlaget (kun oauth- og query-parametre, og der er ingen query).
 * Link-kortet rendres automatisk af X ud fra sidens OG-tags.
 */

import crypto from "node:crypto";
import type { PostContent, SocialChannel } from "../types";

const TWEET_URL = "https://api.twitter.com/2/tweets";

/** RFC 3986 percent-encoding (encodeURIComponent friholder !'()* — det må OAuth ikke). */
function pctEncode(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function buildOAuthHeader(): string {
  const params: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(params[k])}`)
    .join("&");
  const baseString = ["POST", pctEncode(TWEET_URL), pctEncode(paramString)].join("&");
  const signingKey = `${pctEncode(process.env.X_API_SECRET!)}&${pctEncode(process.env.X_ACCESS_TOKEN_SECRET!)}`;
  params.oauth_signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  return (
    "OAuth " +
    Object.keys(params)
      .sort()
      .map((k) => `${pctEncode(k)}="${pctEncode(params[k])}"`)
      .join(", ")
  );
}

export const x: SocialChannel = {
  name: "x",

  isConfigured(): boolean {
    return Boolean(
      process.env.X_API_KEY &&
        process.env.X_API_SECRET &&
        process.env.X_ACCESS_TOKEN &&
        process.env.X_ACCESS_TOKEN_SECRET,
    );
  },

  async post(content: PostContent): Promise<{ postUrl: string | null }> {
    const res = await fetch(TWEET_URL, {
      method: "POST",
      headers: {
        Authorization: buildOAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content.text }),
    });
    if (!res.ok) throw new Error(`X post fejlede (${res.status}): ${await res.text()}`);

    const data = (await res.json()) as { data?: { id?: string } };
    const id = data.data?.id;
    return { postUrl: id ? `https://x.com/i/web/status/${id}` : null };
  },
};
