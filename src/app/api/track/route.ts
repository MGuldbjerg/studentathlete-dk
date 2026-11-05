import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB, getEnv } from "@/lib/db";
import { ingestTrack, trackAck } from "@/lib/track-ingest";

/**
 * The analytics beacon. In production the Worker entry (`workers/entry.ts`)
 * answers POST /api/track itself and this route is not reached; it stays for
 * local dev (`npm run dev`), where there is no Worker entry. Both call
 * `ingestTrack`, so the logic exists once.
 */
export async function POST(req: NextRequest) {
  let asn: number | undefined;
  try {
    const { cf } = await getCloudflareContext({ async: true });
    asn = (cf as { asn?: number } | undefined)?.asn;
  } catch {
    /* no Cloudflare context (local dev) */
  }
  await ingestTrack(req, { db: await getDB(), env: await getEnv(), asn });
  return trackAck();
}
