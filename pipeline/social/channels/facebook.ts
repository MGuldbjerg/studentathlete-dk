/**
 * Facebook Page-adapter (Graph API).
 * Secrets: FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN.
 *
 * Token-noter: brug et page access token afledt af en long-lived user token
 * (60 dage) — eller bedst: hent det via /me/accounts med en long-lived user
 * token, så er page-tokenet i praksis uden udløb. Link-preview (OG-kortet)
 * rendres automatisk af Facebook ud fra `link`-feltet.
 */

import type { PostContent, SocialChannel } from "../types";

// Meta udgiver ~2 versioner om året og holder hver i ~2 år. v26.0 udkom
// 29. juli 2026. Bump ved lejlighed — et kald mod en udfaset version fejler
// med en fejlkode, ikke med stilhed.
const GRAPH = "https://graph.facebook.com/v26.0";

export const facebook: SocialChannel = {
  name: "facebook",
  // Kontoen er dansk: @studentathlete.dk / den danske side.
  country: "DK",

  isConfigured(): boolean {
    return Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
  },

  async post(content: PostContent): Promise<{ postUrl: string | null }> {
    const res = await fetch(`${GRAPH}/${process.env.FB_PAGE_ID}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content.text,
        link: content.url,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN,
      }),
    });
    if (!res.ok) throw new Error(`Facebook post fejlede (${res.status}): ${await res.text()}`);

    const data = (await res.json()) as { id?: string };
    // id-format: "<pageId>_<postId>" — kan linkes direkte
    return { postUrl: data.id ? `https://www.facebook.com/${data.id}` : null };
  },
};
