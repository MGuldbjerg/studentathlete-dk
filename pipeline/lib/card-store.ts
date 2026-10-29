/**
 * Where rendered cards live: D1 (`card_blobs`, base64) or an R2 bucket.
 * =====================================================================
 *
 * The cards were 963 rows / 78 MB of base64 in D1 (35 % of the database on
 * 2026-10-29) and were copied into every deploy. R2 holds them as raw bytes on
 * a public custom domain instead (src/lib/og-static.ts names the objects).
 *
 * `CARD_STORE` picks the backend — unset means `d1`, so merging this changes
 * nothing:
 *
 *   d1    today: full base64 row in card_blobs
 *   both  migration: upload to R2, then the full D1 row; reads R2 → D1 fallback
 *   r2    upload to R2, then an EMPTY marker row in card_blobs
 *
 * The card_blobs row stays the "card exists" index in every mode: the social
 * queue's gate (`cardReadyClause` in post-social.ts) and render-cards' skip
 * check are SQL on it, and a marker costs ~40 bytes instead of ~83 KB. It is
 * written AFTER the upload succeeded, so a row never promises a missing object.
 *
 * R2 is reached through the Cloudflare REST API (the same endpoint
 * `wrangler r2 object put/get` uses) with CLOUDFLARE_API_TOKEN, which needs
 * the account permission «Workers R2 Storage: Edit».
 *
 * Only `card-…` and `ig-…` keys go through here. Reels and the honours roundup
 * stay parked in card_blobs (minutes, or one small row a month) and served by
 * /api/og, as before.
 */
import type { D1Client } from "./d1-client";
import { cardContentType, cardObjectKey, isCardKey } from "../../src/lib/og-static";

export type CardStoreMode = "d1" | "r2" | "both";

/** Bucket name unless CARD_R2_BUCKET says otherwise. */
export const DEFAULT_R2_BUCKET = "studentathlete-media";

/**
 * Cache headers stored on the object and served by the public domain — the
 * same as /api/og sent. A `--force` re-render keeps the key, so this must not
 * be `immutable`; the runbook's purge step covers the edge.
 */
export const CARD_CACHE_CONTROL = "public, max-age=86400, s-maxage=604800";

/** Parse CARD_STORE. Unset/empty → d1. A typo fails loudly rather than silently picking a backend. */
export function cardStoreMode(raw: string | undefined = process.env.CARD_STORE): CardStoreMode {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "") return "d1";
  if (v === "d1" || v === "r2" || v === "both") return v;
  throw new Error(`CARD_STORE must be d1, r2 or both (got "${raw}")`);
}

export interface StoredCard {
  bytes: Buffer;
  contentType: string;
}

export interface CardDims {
  width: number;
  height: number;
}

/** Read the image format from the bytes, as /api/og does. */
export function sniffContentType(b: Uint8Array): string | null {
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  return null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface HttpError extends Error {
  status?: number;
}

function httpError(what: string, status: number, body: string): HttpError {
  const hint = status === 401 || status === 403
    ? " — CLOUDFLARE_API_TOKEN needs the account permission «Workers R2 Storage: Edit»"
    : "";
  const err = new Error(`R2 ${what} failed (${status})${hint}: ${body.slice(0, 300)}`) as HttpError;
  err.status = status;
  return err;
}

function transient(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch's network failure
  const status = (err as HttpError)?.status;
  return typeof status === "number" && (status === 429 || status >= 500);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Object access in one bucket via the Cloudflare REST API. */
export class R2ObjectClient {
  constructor(
    private accountId: string,
    private apiToken: string,
    readonly bucket: string = DEFAULT_R2_BUCKET,
    private fetchImpl: FetchLike = (i, init) => fetch(i, init),
    private retryDelayMs = 1000,
  ) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env, fetchImpl?: FetchLike): R2ObjectClient {
    const token = env.CLOUDFLARE_API_TOKEN;
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    if (!token) throw new Error("CARD_STORE uses R2 but CLOUDFLARE_API_TOKEN is not set");
    if (!accountId) throw new Error("CARD_STORE uses R2 but CLOUDFLARE_ACCOUNT_ID is not set");
    return new R2ObjectClient(accountId, token, env.CARD_R2_BUCKET || DEFAULT_R2_BUCKET, fetchImpl);
  }

  objectUrl(objectKey: string): string {
    const path = objectKey.split("/").map(encodeURIComponent).join("/");
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucket}/objects/${path}`;
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    for (let i = 1; ; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i >= attempts || !transient(err)) throw err;
        await sleep(this.retryDelayMs * i);
      }
    }
  }

  async put(objectKey: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.withRetry(async () => {
      const res = await this.fetchImpl(this.objectUrl(objectKey), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": contentType,
          "Cache-Control": CARD_CACHE_CONTROL,
        },
        body: bytes as unknown as BodyInit,
      });
      if (!res.ok) throw httpError(`PUT ${objectKey}`, res.status, await res.text().catch(() => ""));
    });
  }

  /** The object, or null if it does not exist. */
  async get(objectKey: string): Promise<StoredCard | null> {
    return this.withRetry(async () => {
      const res = await this.fetchImpl(this.objectUrl(objectKey), {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiToken}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw httpError(`GET ${objectKey}`, res.status, await res.text().catch(() => ""));
      const bytes = Buffer.from(await res.arrayBuffer());
      return { bytes, contentType: res.headers.get("content-type") ?? sniffContentType(bytes) ?? "application/octet-stream" };
    });
  }

  /**
   * Does the object exist? A GET, not a HEAD: the REST API documents GET/PUT/
   * DELETE on objects, and a HEAD that wrongly answered 200 would make the
   * backfill skip everything. ~83 KB per call; only the backfill uses it.
   */
  async exists(objectKey: string): Promise<boolean> {
    return (await this.get(objectKey)) !== null;
  }
}

type Db = Pick<D1Client, "query" | "execute">;

export interface CardStore {
  readonly mode: CardStoreMode;
  /** Store a rendered card. `contentType` must match the key's kind (WebP for card-, JPEG for ig-). */
  putCard(key: string, bytes: Buffer, contentType: string, dims: CardDims): Promise<void>;
  /** The card's bytes, or null. */
  getCard(key: string): Promise<StoredCard | null>;
  /** Has the card been stored? The card_blobs index row, in every mode (no R2 call). */
  hasCard(key: string): Promise<boolean>;
}

const UPSERT = `INSERT INTO card_blobs (key, png_base64, width, height)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET png_base64 = excluded.png_base64, width = excluded.width,
               height = excluded.height, created_at = datetime('now')`;

/**
 * The store CARD_STORE asks for. `r2` is only constructed for the R2 modes, so
 * `d1` (the default) needs no bucket, no extra env and no R2 permission.
 */
export function createCardStore(
  db: Db,
  opts: { mode?: CardStoreMode; r2?: R2ObjectClient } = {},
): CardStore {
  const mode = opts.mode ?? cardStoreMode();
  const r2 = mode === "d1" ? null : opts.r2 ?? R2ObjectClient.fromEnv();

  async function d1Get(key: string): Promise<StoredCard | null> {
    const { results } = await db.query<{ png_base64: string }>(
      "SELECT png_base64 FROM card_blobs WHERE key = ?",
      [key],
    );
    const b64 = results[0]?.png_base64;
    if (!b64) return null; // absent, or an r2-mode marker
    const bytes = Buffer.from(b64, "base64");
    return { bytes, contentType: sniffContentType(bytes) ?? "application/octet-stream" };
  }

  return {
    mode,

    async putCard(key, bytes, contentType, dims) {
      if (!isCardKey(key)) throw new Error(`putCard: not a card key: ${key}`);
      if (contentType !== cardContentType(key)) {
        // The public URL's extension is fixed by the key; a mismatch would serve
        // a JPEG as .webp (or the reverse).
        throw new Error(`putCard: ${key} must be ${cardContentType(key)}, got ${contentType}`);
      }
      if (r2) await r2.put(cardObjectKey(key), bytes, contentType);
      const payload = mode === "r2" ? "" : bytes.toString("base64");
      await db.execute(UPSERT, [key, payload, dims.width, dims.height]);
    },

    async getCard(key) {
      if (mode === "d1") return d1Get(key);
      const fromR2 = await r2!.get(cardObjectKey(key));
      if (fromR2 || mode === "r2") return fromR2;
      return d1Get(key);
    },

    async hasCard(key) {
      const { results } = await db.query<{ key: string }>("SELECT key FROM card_blobs WHERE key = ?", [key]);
      return results.length > 0;
    },
  };
}
