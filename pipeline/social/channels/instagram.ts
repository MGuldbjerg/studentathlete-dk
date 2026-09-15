/**
 * Instagram-adapter (Graph API, Content Publishing).
 * Secrets: IG_USER_ID, IG_ACCESS_TOKEN.
 *
 * TO TRIN, ikke ét: først oprettes en mediecontainer (`POST /<ig-id>/media`),
 * derefter udgives den (`POST /<ig-id>/media_publish`). Det er ikke en detalje
 * i API'et — det er stedet hvor tingene går galt, for **Meta henter selv
 * billedet** ud fra `image_url` i trin 1. Vi uploader ingen bytes. Derfor:
 *
 *  - URL'en skal være offentligt hentbar UDEN login. `Allow: /api/og` i
 *    robots.txt dækker den (matcher på sti, ikke query) — samme regel der blev
 *    skrevet efter det billedløse Facebook-opslag 18. august.
 *  - Billedet skal være JPEG. Ikke WebP, ikke PNG: «JPEG is the only image
 *    format supported». Derfor `cardKind: "ig"`, som både vælger 1080×1350-
 *    kortet OG holder artiklen i kø til dét kort findes.
 *
 * EGET TOKEN, ikke FB_PAGE_ACCESS_TOKEN, selvom begge er page access tokens.
 * Instagram kræver `instagram_basic` + `instagram_content_publish` oveni, og
 * delte vi variabelnavn, ville et token uden de scopes ikke give en tydelig
 * fejl ved opsætningen — den ville komme som en 403 midt i en kø. Samme
 * begrundelse som de adskilte BLUESKY_UK_*-secrets.
 *
 * Grænse: 100 API-udgivelser pr. 24 timer pr. konto. Pacingen rører den ikke.
 */

import { ChannelAuthError, type PostContent, type SocialChannel } from "../types";

// Samme version som facebook.ts — ét sted at bumpe, når Meta udfaser.
const GRAPH = "https://graph.facebook.com/v26.0";

function authFailed(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Permalinket til opslaget. Fail-soft: kender vi det ikke, har vi stadig
 * postet — men `delete-post.ts` får sværere ved at rydde op, så vi prøver.
 */
async function fetchPermalink(mediaId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { permalink?: string };
    return data.permalink ?? null;
  } catch {
    return null;
  }
}

export const instagram: SocialChannel = {
  name: "instagram",
  // Kontoen er dansk: @studentathlete.dk. En britisk konto bliver en EGEN
  // kanal med egne secrets — koblingen konto↔side er 1:1 hos Meta, så UK
  // kræver både sin egen Facebook-side og sin egen Instagram-konto.
  country: "DK",
  cardKind: "ig",

  isConfigured(): boolean {
    return Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN);
  },

  async post(content: PostContent): Promise<{ postUrl: string | null }> {
    const igUserId = process.env.IG_USER_ID!;
    const token = process.env.IG_ACCESS_TOKEN!;

    // Trin 1: containeren. Her henter Meta billedet — en fejl her er typisk
    // billedet (utilgængeligt, forkert format, forkert formforhold), ikke teksten.
    const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: content.imageUrl,
        caption: content.text,
        access_token: token,
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      if (authFailed(createRes.status)) {
        throw new ChannelAuthError(`Instagram afviste tokenet ved containeren (${createRes.status}): ${body}`);
      }
      throw new Error(`Instagram-container fejlede (${createRes.status}): ${body} [image_url: ${content.imageUrl}]`);
    }
    const { id: creationId } = (await createRes.json()) as { id?: string };
    if (!creationId) throw new Error("Instagram-container uden id i svaret");

    // Trin 2: udgivelsen. Billeder er klar med det samme; er de mod forventning
    // ikke det, fejler kaldet, kø-rækken beholder sit forsøg og næste kørsel
    // prøver igen. Det er billigere end at holde en kørsel i live og pulje.
    const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    });
    if (!pubRes.ok) {
      const body = await pubRes.text();
      if (authFailed(pubRes.status)) {
        throw new ChannelAuthError(`Instagram afviste tokenet ved udgivelsen (${pubRes.status}): ${body}`);
      }
      throw new Error(`Instagram-udgivelse fejlede (${pubRes.status}): ${body}`);
    }
    const { id: mediaId } = (await pubRes.json()) as { id?: string };
    if (!mediaId) return { postUrl: null };

    return { postUrl: await fetchPermalink(mediaId, token) };
  },
};
