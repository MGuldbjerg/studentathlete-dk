/**
 * Tests for cards in R2: object keys, public URLs and the card-store modes.
 * Run: npx tsx pipeline/lib/_card-store-test.ts   (offline — D1 and R2 are stubs)
 *
 * What must hold:
 *   - unset CARD_STORE is d1, and d1 never touches R2 (merging changes nothing)
 *   - r2 writes the object FIRST and then only an empty marker row, so the
 *     social queue's gate (an EXISTS on card_blobs) still sees the card
 *   - with no media URL configured, every card URL is exactly today's
 */
import { createCardStore, cardStoreMode, R2ObjectClient, sniffContentType, type CardStoreMode } from "./card-store";
import { absoluteUrl, cardMediaUrl, cardObjectKey, isCardKey, mediaBaseUrl } from "../../src/lib/og-static";
import { cardBlobKey, getArticleCoverUrl, getArticleIgCardUrl, igCardBlobKey, CARD_VERSION } from "../../src/lib/seo";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(8)]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

// ── Keys and URLs ────────────────────────────────────────────────────────────
ok(isCardKey(cardBlobKey(12)) && isCardKey(igCardBlobKey(12)), "both card kinds are card keys");
ok(!isCardKey("reel-12") && !isCardKey("roundup-uk-2026-10"), "reels and roundups are not");
ok(cardObjectKey(`card-12-v${CARD_VERSION}`) === `cards/card-12-v${CARD_VERSION}.webp`, "landscape → .webp");
ok(cardObjectKey(`ig-12-v${CARD_VERSION}`) === `cards/ig-12-v${CARD_VERSION}.jpg`, "instagram → .jpg");
let threw = false;
try { cardObjectKey("reel-12"); } catch { threw = true; }
ok(threw, "a non-card key has no object key");

process.env.NEXT_PUBLIC_MEDIA_BASE_URL = "";
ok(mediaBaseUrl() === null, "an empty override means no media URL");
ok(
  getArticleCoverUrl({ id: 12 }) === `/og/cards/card-12-v${CARD_VERSION}.webp?type=card&article=12&v=${CARD_VERSION}`,
  "without media URL the cover is today's static path + query fallback",
);
ok(getArticleIgCardUrl({ id: 12 }) === `/api/og?type=ig&article=12&v=${CARD_VERSION}`, "…and the IG card today's /api/og");
ok(cardMediaUrl(cardBlobKey(12)) === null, "no media URL → cardMediaUrl null");

process.env.NEXT_PUBLIC_MEDIA_BASE_URL = "https://media.studentathlete.dk/";
ok(mediaBaseUrl() === "https://media.studentathlete.dk", "trailing slash trimmed");
ok(
  getArticleCoverUrl({ id: 12, card_ready: 1 }) === `https://media.studentathlete.dk/cards/card-12-v${CARD_VERSION}.webp`,
  "with media URL (and the card rendered) the cover is the versioned bucket object",
);
ok(
  getArticleIgCardUrl({ id: 12, ig_card_ready: 1 }) === `https://media.studentathlete.dk/cards/ig-12-v${CARD_VERSION}.jpg`,
  "…and so is the IG card",
);
ok(absoluteUrl("https://studentathlete.dk", getArticleCoverUrl({ id: 12, card_ready: 1 })).startsWith("https://media."), "absoluteUrl keeps an absolute URL");
ok(absoluteUrl("https://studentathlete.dk", "/og/x.webp") === "https://studentathlete.dk/og/x.webp", "absoluteUrl prefixes a path");
process.env.NEXT_PUBLIC_MEDIA_BASE_URL = "";

ok(sniffContentType(WEBP) === "image/webp" && sniffContentType(JPEG) === "image/jpeg", "format sniffing");

// ── Mode selection ───────────────────────────────────────────────────────────
ok(cardStoreMode(undefined) === "d1" && cardStoreMode("") === "d1", "unset/empty → d1");
ok(cardStoreMode(" R2 ") === "r2" && cardStoreMode("both") === "both", "r2 / both parsed");
threw = false;
try { cardStoreMode("s3"); } catch { threw = true; }
ok(threw, "a typo fails loudly");

// ── Stubs ────────────────────────────────────────────────────────────────────
interface Call { sql: string; params: unknown[] }
function stubDb(rows: Record<string, string> = {}) {
  const calls: Call[] = [];
  const db = {
    calls,
    async query<T>(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });
      const key = params[0] as string;
      const results = /FROM card_blobs/.test(sql) && key in rows
        ? [{ key, png_base64: rows[key] }]
        : [];
      return { results: results as T[], meta: { changes: 0, duration: 0 } };
    },
    async execute<T>(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });
      if (/INSERT INTO card_blobs/.test(sql)) rows[params[0] as string] = params[1] as string;
      return { results: [] as T[], meta: { changes: 1, duration: 0 } };
    },
  };
  return db;
}

function stubR2(objects: Map<string, { bytes: Buffer; type: string }> = new Map(), failWith?: number) {
  const requests: { method: string; url: string; headers: Record<string, string> }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? "GET";
    const headers = (init?.headers ?? {}) as Record<string, string>;
    requests.push({ method, url, headers });
    if (failWith) return new Response("nope", { status: failWith });
    const key = decodeURIComponent(url.split("/objects/")[1]);
    if (method === "PUT") {
      objects.set(key, { bytes: Buffer.from(init!.body as Uint8Array), type: headers["Content-Type"] });
      return new Response("{}", { status: 200 });
    }
    const o = objects.get(key);
    return o
      ? new Response(new Uint8Array(o.bytes), { status: 200, headers: { "content-type": o.type } })
      : new Response("not found", { status: 404 });
  };
  const client = new R2ObjectClient("acc", "tok", "studentathlete-media", fetchImpl, 0);
  return { client, requests, objects };
}

const KEY = `card-12-v${CARD_VERSION}`;
const DIMS = { width: 1200, height: 630 };

async function storeTests(): Promise<void> {
  // d1: today's behaviour, R2 never constructed or called.
  {
    const db = stubDb();
    const r2 = stubR2();
    const store = createCardStore(db, { mode: "d1", r2: r2.client });
    await store.putCard(KEY, WEBP, "image/webp", DIMS);
    ok(r2.requests.length === 0, "d1: no R2 request");
    const insert = db.calls.find((c) => c.sql.includes("INSERT INTO card_blobs"));
    ok(insert?.params[1] === WEBP.toString("base64"), "d1: full base64 row");
    ok(await store.hasCard(KEY), "d1: hasCard after put");
    ok((await store.getCard(KEY))?.contentType === "image/webp", "d1: getCard decodes and sniffs");
    // The default mode must not need any R2 env at all.
    const saved = process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CARD_STORE;
    let err: unknown = null;
    try { createCardStore(stubDb()); } catch (e) { err = e; }
    ok(err === null, "default store builds without any R2 env");
    if (saved !== undefined) process.env.CLOUDFLARE_API_TOKEN = saved;
  }

  // r2: object first, then an empty marker; reads come from R2.
  {
    const db = stubDb();
    const r2 = stubR2();
    const store = createCardStore(db, { mode: "r2", r2: r2.client });
    await store.putCard(KEY, WEBP, "image/webp", DIMS);
    const put = r2.requests.find((r) => r.method === "PUT");
    ok(put?.url === `https://api.cloudflare.com/client/v4/accounts/acc/r2/buckets/studentathlete-media/objects/cards/${KEY}.webp`, "r2: PUT to the object URL");
    ok(put?.headers["Content-Type"] === "image/webp" && /max-age/.test(put.headers["Cache-Control"]), "r2: content type and cache headers");
    ok(put?.headers.Authorization === "Bearer tok", "r2: API token");
    ok(r2.objects.get(`cards/${KEY}.webp`)?.bytes.equals(WEBP) === true, "r2: raw bytes, not base64");
    const insert = db.calls.find((c) => c.sql.includes("INSERT INTO card_blobs"));
    ok(insert?.params[1] === "", "r2: D1 gets an empty marker, not the image");
    ok(await store.hasCard(KEY), "r2: marker counts as 'card exists' (social gate)");
    ok((await store.getCard(KEY))?.bytes.equals(WEBP) === true, "r2: getCard reads the bucket");
    ok((await store.getCard(`card-99-v${CARD_VERSION}`)) === null, "r2: missing → null");
  }

  // r2 upload fails → no marker row, so the queue keeps waiting.
  {
    const db = stubDb();
    const r2 = stubR2(new Map(), 403);
    const store = createCardStore(db, { mode: "r2", r2: r2.client });
    let err: Error | null = null;
    try { await store.putCard(KEY, WEBP, "image/webp", DIMS); } catch (e) { err = e as Error; }
    ok(err !== null && /R2 Storage: Edit/.test(err.message), "403 names the token permission");
    ok((err as { status?: number } | null)?.status === 403, "…and carries the status");
    ok(!db.calls.some((c) => c.sql.includes("INSERT")), "failed upload writes no row");
  }

  // both: both written; reads prefer R2, fall back to D1.
  {
    const db = stubDb({ [`card-7-v${CARD_VERSION}`]: JPEG.toString("base64") });
    const r2 = stubR2();
    const store = createCardStore(db, { mode: "both", r2: r2.client });
    await store.putCard(KEY, WEBP, "image/webp", DIMS);
    ok(r2.objects.has(`cards/${KEY}.webp`), "both: object written");
    const insert = db.calls.find((c) => c.sql.includes("INSERT INTO card_blobs"));
    ok(insert?.params[1] === WEBP.toString("base64"), "both: full D1 row too");
    ok((await store.getCard(KEY))?.bytes.equals(WEBP) === true, "both: reads R2");
    const n = r2.requests.length;
    ok((await store.getCard(`card-7-v${CARD_VERSION}`))?.contentType === "image/jpeg", "both: falls back to D1 when R2 lacks it");
    ok(r2.requests.length === n + 1, "…after asking R2 once");
  }

  // Guards.
  {
    const store = createCardStore(stubDb(), { mode: "r2", r2: stubR2().client });
    let err = false;
    try { await store.putCard(KEY, JPEG, "image/jpeg", DIMS); } catch { err = true; }
    ok(err, "a JPEG under a .webp key is refused");
    err = false;
    try { await store.putCard("reel-12", WEBP, "image/webp", DIMS); } catch { err = true; }
    ok(err, "non-card keys are refused");
  }

  // exists() is a GET; a 404 is false, not an error.
  {
    const r2 = stubR2(new Map([[`cards/${KEY}.webp`, { bytes: WEBP, type: "image/webp" }]]));
    ok(await r2.client.exists(`cards/${KEY}.webp`), "exists: present");
    ok(!(await r2.client.exists("cards/card-1-v1.webp")), "exists: 404 → false");
  }

  // Modes are the three named ones.
  const modes: CardStoreMode[] = ["d1", "r2", "both"];
  ok(modes.every((m) => createCardStore(stubDb(), { mode: m, r2: stubR2().client }).mode === m), "store reports its mode");
}

storeTests().then(() => {
  console.log(`card-store: ${pass} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
