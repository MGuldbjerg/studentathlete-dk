/**
 * Facebook Page-adapter (Graph API).
 * Secrets: FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN.
 *
 * Token-noter: brug et page access token afledt af en long-lived user token
 * (60 dage) — eller bedst: hent det via /me/accounts med en long-lived user
 * token, så er page-tokenet i praksis uden udløb. Link-preview (OG-kortet)
 * rendres automatisk af Facebook ud fra `link`-feltet.
 *
 * OM BILLEDET (Amtrup-opslaget 2026-08-18, uden billede): Facebook renderer
 * kortet ud fra SIN EGEN cachede scrape af URL'en, ikke ud fra noget vi sender
 * med. Var scrapen tom eller mislykket, viser opslaget titel og tekst uden
 * billede — og cachen holder ~30 dage. Den gang var årsagen vores robots.txt
 * (`Disallow: /api/`, hvor OG-billedet ligger; se src/lib/robots-txt.ts), men
 * fejlklassen er generel: en enkelt dårlig scrape smitter alle senere delinger af
 * samme URL. Derfor beder vi Facebook om at scrape FORFRA lige før vi poster.
 * Kaldet må aldrig kunne vælte opslaget — en manglende forhåndsvisning er en
 * skønhedsfejl, et tabt opslag er ikke.
 */

import { ChannelAuthError, type PostContent, type SocialChannel } from "../types";

// Meta udgiver ~2 versioner om året og holder hver i ~2 år. v26.0 udkom
// 29. juli 2026. Bump ved lejlighed — et kald mod en udfaset version fejler
// med en fejlkode, ikke med stilhed.
const GRAPH = "https://graph.facebook.com/v26.0";

/**
 * Bed Facebook om at hente OG-data forfra for en URL.
 *
 * Fejl sluges med vilje (og logges): kaldet er en forbedring af kortet, ikke en
 * forudsætning for opslaget.
 */
export async function refreshLinkPreview(url: string): Promise<boolean> {
  if (!process.env.FB_PAGE_ACCESS_TOKEN) return false;
  try {
    const res = await fetch(`${GRAPH}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: url,
        scrape: true,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN,
      }),
    });
    if (!res.ok) {
      console.warn(`  ⚠ Facebook-scrape af ${url} fejlede (${res.status}) — poster alligevel.`);
      return false;
    }
    const data = (await res.json()) as { image?: { url?: string }[] };
    const hasImage = Array.isArray(data.image) && data.image.length > 0;
    if (!hasImage) {
      console.warn(`  ⚠ Facebooks scrape af ${url} fandt INTET billede — opslaget får intet kort.`);
    }
    return hasImage;
  } catch (err) {
    console.warn(
      `  ⚠ Facebook-scrape kunne ikke gennemføres: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

export const facebook: SocialChannel = {
  name: "facebook",
  // Kontoen er dansk: @studentathlete.dk / den danske side.
  country: "DK",

  isConfigured(): boolean {
    return Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
  },

  async post(content: PostContent): Promise<{ postUrl: string | null }> {
    await refreshLinkPreview(content.url);

    const res = await fetch(`${GRAPH}/${process.env.FB_PAGE_ID}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content.text,
        link: content.url,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      // Et udløbet eller inddraget page-token er kontoens problem, ikke
      // artiklens — samme skelnen som Blueskys login (se ChannelAuthError).
      if (res.status === 401 || res.status === 403) {
        throw new ChannelAuthError(`Facebook afviste tokenet (${res.status}): ${body}`);
      }
      throw new Error(`Facebook post fejlede (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { id?: string };
    // id-format: "<pageId>_<postId>" — kan linkes direkte
    return { postUrl: data.id ? `https://www.facebook.com/${data.id}` : null };
  },
};
