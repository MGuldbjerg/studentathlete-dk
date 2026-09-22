/**
 * Bluesky-adapter (AT Protocol, gratis).
 *
 * ÉN adapter, ÉN konto pr. land. @studentathlete.dk poster danske artikler,
 * den britiske konto poster britiske — kontoen vælges af kanalnavnet, og
 * hver konto har SINE EGNE secrets. Det sidste er med vilje: hvis UK-kontoen
 * delte variabelnavn med den danske, ville et glemt secret i GitHub ikke give
 * en fejl, men et opslag fra den forkerte konto (præcis hændelsen 2026-08-05).
 *
 * Secrets:
 *   DK: BLUESKY_HANDLE (fx studentathlete.dk)   + BLUESKY_APP_PASSWORD
 *   UK: BLUESKY_UK_HANDLE                        + BLUESKY_UK_APP_PASSWORD
 * App-password laves i Settings → Privacy and Security → App Passwords —
 * IKKE kontoens login-kodeord.
 *
 * Bluesky henter ikke selv link-previews via API'et, så vi uploader
 * kampkortet som blob og sætter et eksternt embed-kort manuelt.
 */

import { countryProfile } from "../../../src/lib/countries";
import { ChannelAuthError, type ChannelName, type PostContent, type SocialChannel } from "../types";
import { accountIsConfigured, readAccountEnv } from "../registry";

const PDS = "https://bsky.social";
const MAX_BLOB_BYTES = 950_000; // Bluesky-grænsen er 1 MB — lidt margen

interface BlueskyAccount {
  country: string;
  handleEnv: string;
  passwordEnv: string;
}

/**
 * Kontoregisteret. Sletningsværktøjet slår op her af samme grund som
 * posteringen gør: et opslag skal fjernes med de credentials der lagde det op.
 */
export const BLUESKY_ACCOUNTS: Record<"bluesky" | "bluesky_uk", BlueskyAccount> = {
  bluesky: { country: "DK", handleEnv: "BLUESKY_HANDLE", passwordEnv: "BLUESKY_APP_PASSWORD" },
  bluesky_uk: { country: "UK", handleEnv: "BLUESKY_UK_HANDLE", passwordEnv: "BLUESKY_UK_APP_PASSWORD" },
};

interface Session {
  accessJwt: string;
  did: string;
  handle: string;
}

async function createSession(handle: string, appPassword: string): Promise<Session> {
  const res = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!res.ok) throw new ChannelAuthError(`Bluesky login fejlede (${res.status}): ${await res.text()}`);
  return (await res.json()) as Session;
}

/** Upload kampkortet som thumb-blob; null ved fejl (kortet er nice-to-have). */
async function uploadThumb(session: Session, imageUrl: string): Promise<unknown | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const bytes = await imgRes.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BLOB_BYTES) return null;
    const contentType = imgRes.headers.get("content-type") ?? "image/png";

    const upRes = await fetch(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
        "Content-Type": contentType,
      },
      body: bytes,
    });
    if (!upRes.ok) return null;
    const data = (await upRes.json()) as { blob: unknown };
    return data.blob;
  } catch {
    return null;
  }
}

/**
 * Selve opslaget, som ren funktion — så sproget kan TESTES uden at poste.
 *
 * `langs` er læservendt: den styrer Blueskys eget sprogfilter, så et engelsk
 * opslag mærket "da" bliver skjult for de britiske læsere det er skrevet til.
 * Derfor kommer sproget fra landeprofilen og er et PÅKRÆVET argument — ikke en
 * konstant med dansk standardværdi (se feedback-reglen om adskilte sites).
 */

/**
 * Hashtag-facetter: dét der gør et tag til et tag.
 * ================================================
 *
 * Uden en facet er «#CollegeGolf» grå tekst i opslaget. Den bliver ikke
 * klikbar, og den indekseres ikke som tag — altså ingen af de to grunde til at
 * skrive den. AT Proto beder om `app.bsky.richtext.facet#tag` med et interval,
 * og `tag`-værdien bærer IKKE sit «#».
 *
 * ⚠️ **Intervallet tælles i UTF-8-BYTES, ikke i tegn.** Det er ikke en
 * spidsfindighed her: opslagene er danske. «å», «ø» og «æ» fylder to bytes
 * hver, så en overskrift med bare ét af dem forskyder tegn-indekset fra
 * byte-indekset — og en facet der peger forkert, markerer et vilkårligt stykke
 * tekst midt i sætningen som hashtag. Derfor TextEncoder, ikke `indexOf`.
 */
export function tagFacets(text: string) {
  const encoder = new TextEncoder();
  const facets: {
    index: { byteStart: number; byteEnd: number };
    features: { $type: string; tag: string }[];
  }[] = [];

  // Tegnklassen er bevidst snæver: bogstaver og tal. Et tag stopper ved
  // mellemrum, tegnsætning og linjeskift, så «#dansksport.» ikke får punktummet
  // med ind i tagget.
  const re = /#([\p{L}\p{N}_]+)/gu;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    facets.push({
      index: {
        byteStart: encoder.encode(text.slice(0, start)).length,
        byteEnd: encoder.encode(text.slice(0, start + m[0].length)).length,
      },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag: m[1] }],
    });
  }
  return facets;
}

export function buildBlueskyRecord(content: PostContent, country: string, thumb: unknown | null = null) {
  const facets = tagFacets(content.text);
  return {
    $type: "app.bsky.feed.post",
    text: content.text,
    createdAt: new Date().toISOString(),
    langs: [countryProfile(country).language],
    // Tomt felt udelades: en post uden tags skal se ud som før.
    ...(facets.length > 0 ? { facets } : {}),
    embed: {
      $type: "app.bsky.embed.external",
      external: {
        uri: content.url,
        title: content.title,
        description: content.summary ?? "",
        ...(thumb ? { thumb } : {}),
      },
    },
  };
}

function createBlueskyChannel(name: "bluesky" | "bluesky_uk"): SocialChannel {
  const account = BLUESKY_ACCOUNTS[name];

  return {
    name: name as ChannelName,
    country: account.country,
    cardKind: "share",

    isConfigured(): boolean {
      return accountIsConfigured("bluesky", account.country);
    },

    async post(content: PostContent): Promise<{ postUrl: string | null }> {
      const handle = readAccountEnv("bluesky", account.country, "HANDLE")!;
      const session = await createSession(handle, readAccountEnv("bluesky", account.country, "APP_PASSWORD")!);
      const thumb = await uploadThumb(session, content.imageUrl);
      const record = buildBlueskyRecord(content, account.country, thumb);

      const res = await fetch(`${PDS}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          record,
        }),
      });
      if (!res.ok) throw new Error(`Bluesky post fejlede (${res.status}): ${await res.text()}`);

      const data = (await res.json()) as { uri: string };
      // at://did:plc:xxx/app.bsky.feed.post/<rkey> → offentligt link
      const rkey = data.uri.split("/").pop();
      return { postUrl: rkey ? `https://bsky.app/profile/${session.handle}/post/${rkey}` : null };
    },
  };
}

/** Dansk konto: @studentathlete.dk */
export const bluesky = createBlueskyChannel("bluesky");

/** Britisk konto: student-athlete.co.uk */
export const blueskyUk = createBlueskyChannel("bluesky_uk");
