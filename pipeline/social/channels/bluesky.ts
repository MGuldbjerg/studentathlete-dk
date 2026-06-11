/**
 * Bluesky-adapter (AT Protocol, gratis).
 * Secrets: BLUESKY_HANDLE (fx studentathlete.dk), BLUESKY_APP_PASSWORD
 * (app-password fra Settings → Privacy and Security → App Passwords —
 * IKKE kontoens login-kodeord).
 *
 * Bluesky henter ikke selv link-previews via API'et, så vi uploader
 * kampkortet som blob og sætter et eksternt embed-kort manuelt.
 */

import type { PostContent, SocialChannel } from "../types";

const PDS = "https://bsky.social";
const MAX_BLOB_BYTES = 950_000; // Bluesky-grænsen er 1 MB — lidt margen

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
  if (!res.ok) throw new Error(`Bluesky login fejlede (${res.status}): ${await res.text()}`);
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

export const bluesky: SocialChannel = {
  name: "bluesky",

  isConfigured(): boolean {
    return Boolean(process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD);
  },

  async post(content: PostContent): Promise<{ postUrl: string | null }> {
    const handle = process.env.BLUESKY_HANDLE!;
    const session = await createSession(handle, process.env.BLUESKY_APP_PASSWORD!);
    const thumb = await uploadThumb(session, content.imageUrl);

    const record = {
      $type: "app.bsky.feed.post",
      text: content.text,
      createdAt: new Date().toISOString(),
      langs: ["da"],
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
