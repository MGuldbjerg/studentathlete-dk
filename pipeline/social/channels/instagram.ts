/**
 * Instagram-adapter (Graph API, Content Publishing).
 * Secrets: IG_USER_ID, IG_ACCESS_TOKEN.
 *
 * TRE TRIN, ikke ét: først oprettes en mediecontainer (`POST /<ig-id>/media`),
 * så VENTES der til den er `FINISHED`, og først derefter udgives den
 * (`POST /<ig-id>/media_publish`). Det er ikke en detalje i API'et — det er
 * stedet hvor tingene går galt, for **Meta henter selv billedet** ud fra
 * `image_url` i trin 1, og den hentning er asynkron. Vi uploader ingen bytes.
 * Ventetrinnet var udeladt indtil 17. september; se `waitForContainer`. Derfor:
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Hvad betyder containerens `status_code`?
 *
 * Udskilt fra ventelykken med vilje: selve beslutningen er ren og kan testes,
 * hvor en løkke med `setTimeout` ikke kan. Ukendte værdier tolkes som «vent» —
 * Meta må gerne tilføje en status uden at vi taber et opslag på det; deadlinen
 * i `waitForContainer` sikrer at «vent» aldrig bliver «for evigt».
 */
export function interpretContainerStatus(statusCode: string | undefined): "ready" | "wait" | "dead" {
  if (statusCode === "FINISHED" || statusCode === "PUBLISHED") return "ready";
  if (statusCode === "ERROR" || statusCode === "EXPIRED") return "dead";
  return "wait";
}

/**
 * Er det «media-id'et er ikke slået igennem endnu» (9007) — eller en ægte fejl?
 *
 * Kun den første må prøves igen. Tjekket læser fejlkoden i JSON'en og ikke
 * beskedteksten: teksten er engelsk prosa fra Meta og kan ændre sig, koden kan
 * ikke. `2207027` er undersubkoden, som artikel 275 ramte tre gange.
 */
export function isContainerNotReadyError(body: string): boolean {
  return /"code"\s*:\s*9007/.test(body);
}

/** Hvor længe vi venter på en container, og hvor tit vi spørger. */
const CONTAINER_TIMEOUT_MS = 90_000;
const CONTAINER_POLL_MS = 3_000;

/**
 * Vent til containeren er FINISHED.
 *
 * Meta henter selv billedet i trin 1, og den hentning er asynkron. `status_code`
 * er det eneste ærlige svar på «må jeg udgive nu?»:
 *   IN_PROGRESS — henter stadig · FINISHED — klar · ERROR/EXPIRED — dødfødt.
 *
 * ERROR og EXPIRED kastes som almindelige fejl, ikke som ChannelAuthError:
 * dét ER opslagets problem (billedet), og så skal forsøget tælle.
 */
async function waitForContainer(creationId: string, token: string): Promise<void> {
  const deadline = Date.now() + CONTAINER_TIMEOUT_MS;
  let lastStatus = "ukendt";

  while (Date.now() < deadline) {
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) {
      const body = await res.text();
      if (authFailed(res.status)) {
        throw new ChannelAuthError(`Instagram afviste tokenet ved statusopslaget (${res.status}): ${body}`);
      }
      // Et enkelt fejlende statusopslag er ikke et dødt opslag — prøv igen
      // indtil deadline. Det er netop dét tålmodighed er til for.
      lastStatus = `opslag fejlede (${res.status})`;
      await sleep(CONTAINER_POLL_MS);
      continue;
    }
    const data = (await res.json()) as { status_code?: string; status?: string };
    lastStatus = data.status_code ?? "uden status_code";

    const verdict = interpretContainerStatus(data.status_code);
    if (verdict === "ready") return;
    if (verdict === "dead") {
      throw new Error(`Instagram-containeren endte som ${lastStatus}: ${data.status ?? "ingen forklaring"}`);
    }
    await sleep(CONTAINER_POLL_MS);
  }

  throw new Error(
    `Instagram-containeren blev ikke klar inden for ${CONTAINER_TIMEOUT_MS / 1000} s (sidste status: ${lastStatus})`,
  );
}

/**
 * Udgiv containeren, med plads til at media-id'et er et øjeblik bagefter.
 *
 * Kun 9007 prøves igen — enhver anden fejl er ægte og skal koste et forsøg.
 */
async function publishWithRetry(igUserId: string, creationId: string, token: string): Promise<string | null> {
  const delays = [0, 3_000, 6_000, 12_000];

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await sleep(delays[i]);

    const res = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: token }),
    });
    if (res.ok) {
      const { id } = (await res.json()) as { id?: string };
      return id ?? null;
    }

    const body = await res.text();
    if (authFailed(res.status)) {
      throw new ChannelAuthError(`Instagram afviste tokenet ved udgivelsen (${res.status}): ${body}`);
    }
    if (!isContainerNotReadyError(body) || i === delays.length - 1) {
      throw new Error(`Instagram-udgivelse fejlede (${res.status}): ${body}`);
    }
    console.log(`  instagram: media-id'et er ikke slået igennem endnu — prøver igen (${i + 1}/${delays.length - 1})`);
  }
  return null;
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

    // Trin 2: VENT til containeren er færdig. Her stod før at «billeder er klar
    // med det samme, og er de ikke, prøver næste kørsel igen». Begge led var
    // forkerte, og artikel 275 betalte prisen 16. september: tre forsøg, tre
    // gange `9007/2207027 Media ID is not available`, og så `failed` for altid.
    // Næste kørsel prøver nemlig ikke det samme igen — den bygger en HELT NY
    // container og taber det samme kapløb. Et forsøg brugt på en race er et
    // forsøg brugt på ingenting. Ventetiden hører til her, i kørslen.
    await waitForContainer(creationId, token);

    // Trin 3: udgivelsen. Selv en FÆRDIG container kan svare 9007 et øjeblik
    // endnu — media-id'et er ikke slået igennem. Det er sekunder, ikke minutter,
    // så vi prøver igen her frem for at bruge et kø-forsøg på det.
    const mediaId = await publishWithRetry(igUserId, creationId, token);
    if (!mediaId) return { postUrl: null };

    return { postUrl: await fetchPermalink(mediaId, token) };
  },
};
