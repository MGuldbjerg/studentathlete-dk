/**
 * Images go out WITH the social posts: the queue never posts an article whose
 * card is not stored, and posts it once it is — with cards in R2.
 * Run: npx tsx pipeline/social/_card-gate-test.ts   (offline: node:sqlite as
 * D1, a stub R2 bucket, stub channels)
 *
 * What must hold (r2 mode, media URL set):
 *   - card missing → postOne skips the article this round (no post, no attempt
 *     used, the row stays queued) — for the share card and the Instagram card
 *   - a failed R2 upload writes no marker row, so the gate stays shut
 *   - card stored → the post goes out, and the image URL it carries is the
 *     bucket object, which exists at that moment
 */
import { createRequire } from "node:module";
import type { D1Client } from "../lib/d1-client";
import { createCardStore, R2ObjectClient } from "../lib/card-store";
import { cardBlobKey, igCardBlobKey } from "../../src/lib/seo";
import { postOne } from "./post-social";
import type { PostContent, SocialChannel } from "./types";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// ── D1 as node:sqlite ────────────────────────────────────────────────────────
interface Stmt { run(...p: unknown[]): unknown; all(...p: unknown[]): Record<string, unknown>[] }
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): Stmt };
};
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(`
  CREATE TABLE athletes (id INTEGER PRIMARY KEY, sport TEXT);
  CREATE TABLE articles (id INTEGER PRIMARY KEY, title TEXT, summary TEXT, content TEXT, slug TEXT,
    cover_image_url TEXT, country TEXT, athlete_id INTEGER, published INTEGER, published_at TEXT);
  CREATE TABLE social_posts (id INTEGER PRIMARY KEY, article_id INTEGER, channel TEXT, status TEXT,
    attempts INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), posted_at TEXT,
    post_url TEXT, last_error TEXT);
  CREATE TABLE card_blobs (key TEXT PRIMARY KEY, png_base64 TEXT NOT NULL, width INTEGER NOT NULL,
    height INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  INSERT INTO athletes VALUES (1, 'golf');
  INSERT INTO articles VALUES (1, 'Win at the conference', 'She won.', 'She won the title.', 'win',
    NULL, 'UK', 1, 1, datetime('now'));
  INSERT INTO social_posts (id, article_id, channel, status) VALUES (1, 1, 'test-share', 'queued');
  INSERT INTO social_posts (id, article_id, channel, status) VALUES (2, 1, 'test-ig', 'queued');
`);
const db = {
  async query<T>(sql: string, params: unknown[] = []) {
    return { results: sqlite.prepare(sql).all(...params) as T[] };
  },
  async execute(sql: string, params: unknown[] = []) {
    sqlite.prepare(sql).run(...params);
    return { results: [] };
  },
} as unknown as D1Client;
const setAge = (key: string, minutes: number) =>
  sqlite.prepare(`UPDATE card_blobs SET created_at = datetime('now', ?) WHERE key = ?`).run(`-${minutes} minutes`, key);
const ageMinutes = (key: string) =>
  Number(sqlite.prepare(`SELECT (julianday('now') - julianday(created_at)) * 1440 AS m FROM card_blobs WHERE key = ?`).all(key)[0]?.m ?? -1);
const row = (id: number) => sqlite.prepare("SELECT status, attempts FROM social_posts WHERE id = ?").all(id)[0];

// ── R2 bucket stub (the REST API card-store.ts talks to) ────────────────────
const objects = new Map<string, Uint8Array>();
let r2Down = false;
const r2 = new R2ObjectClient("acct", "tok", "bucket", async (url, init) => {
  const key = decodeURIComponent(url.split("/objects/")[1]);
  if (init?.method === "PUT") {
    if (r2Down) return new Response("nope", { status: 400 });
    objects.set(key, init.body as Uint8Array);
    return new Response("{}", { status: 200 });
  }
  const b = objects.get(key);
  return b ? new Response(b as unknown as BodyInit, { status: 200 }) : new Response("", { status: 404 });
}, 0);
const store = createCardStore(db, { mode: "r2", r2 });

// ── Channels: record what they would post, and whether the image exists ─────
const MEDIA = "https://media.studentathlete.dk";
process.env.NEXT_PUBLIC_MEDIA_BASE_URL = MEDIA;
const posted: { channel: string; imageUrl: string; imageExists: boolean }[] = [];
function channel(name: string, cardKind: "share" | "ig"): SocialChannel {
  return {
    name, platform: "bluesky", cardKind, country: "UK",
    isConfigured: () => true,
    async post(content: PostContent) {
      const objectKey = content.imageUrl.startsWith(`${MEDIA}/`) ? content.imageUrl.slice(MEDIA.length + 1) : "";
      posted.push({ channel: name, imageUrl: content.imageUrl, imageExists: objects.has(objectKey) });
      return { postUrl: null };
    },
  } as SocialChannel;
}
const share = channel("test-share", "share");
const ig = channel("test-ig", "ig");

const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(8)]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

async function main(): Promise<void> {
  const quiet = console.warn;
  console.warn = () => {};
  try {
    // 1) No card yet: skipped, not posted, no attempt used.
    let r = await postOne(db, share, false);
    ok(!r.posted && r.empty && posted.length === 0, "share card missing → nothing posted this round");
    ok(row(1).status === "queued" && row(1).attempts === 0, "…the row stays queued, no attempt used");
    r = await postOne(db, ig, false);
    ok(!r.posted && posted.length === 0 && row(2).status === "queued", "IG card missing → nothing posted");

    // 2) The R2 upload fails: no marker row, so the gate stays shut.
    r2Down = true;
    let threw = false;
    try { await store.putCard(cardBlobKey(1), WEBP, "image/webp", { width: 1200, height: 630 }); } catch { threw = true; }
    r2Down = false;
    ok(threw && sqlite.prepare("SELECT key FROM card_blobs").all().length === 0, "failed R2 put → no card_blobs row");
    r = await postOne(db, share, false);
    ok(!r.posted && posted.length === 0, "…and still nothing posted");

    // 3) The share card is stored (object first, then the empty marker row).
    await store.putCard(cardBlobKey(1), WEBP, "image/webp", { width: 1200, height: 630 });
    const marker = sqlite.prepare("SELECT png_base64 FROM card_blobs WHERE key = ?").all(cardBlobKey(1))[0];
    ok(marker?.png_base64 === "" && objects.has(`cards/${cardBlobKey(1)}.webp`), "r2: object in the bucket, empty marker in D1");
    ok(ageMinutes(cardBlobKey(1)) < 1, "the marker's created_at is set on write");

    // 3a) Just stored, and 2 minutes old: held (the drawn fallback may still be cached).
    r = await postOne(db, share, false);
    ok(!r.posted && posted.length === 0 && row(1).attempts === 0, "card just stored → held, no attempt used");
    setAge(cardBlobKey(1), 2);
    r = await postOne(db, share, false);
    ok(!r.posted && posted.length === 0 && row(1).status === "queued", "card 2 min old → held");

    // A re-render refreshes created_at, so the wait starts again.
    setAge(cardBlobKey(1), 30);
    await store.putCard(cardBlobKey(1), WEBP, "image/webp", { width: 1200, height: 630 });
    ok(ageMinutes(cardBlobKey(1)) < 1, "a re-render refreshes created_at");

    // 3b) 7 minutes old: posted.
    setAge(cardBlobKey(1), 7);
    r = await postOne(db, share, false);
    ok(r.posted && posted.length === 1, "share card stored → posted");
    ok(posted[0]?.imageUrl === `${MEDIA}/cards/${cardBlobKey(1)}.webp`, "…with the bucket URL");
    ok(posted[0]?.imageExists === true, "…which exists when the post goes out");
    ok(row(1).status === "posted", "…and the row is marked posted");

    // The IG channel still waits: its own card is not there.
    r = await postOne(db, ig, false);
    ok(!r.posted && posted.length === 1, "IG waits for the IG card even with the share card stored");
    await store.putCard(igCardBlobKey(1), JPEG, "image/jpeg", { width: 1080, height: 1350 });
    r = await postOne(db, ig, false);
    ok(!r.posted && posted.length === 1, "IG card just stored → held by the same 6-minute rule");
    setAge(igCardBlobKey(1), 7);
    r = await postOne(db, ig, false);
    ok(r.posted && posted[1]?.imageUrl === `${MEDIA}/cards/${igCardBlobKey(1)}.jpg` && posted[1]?.imageExists, "IG card stored → posted with the existing bucket JPEG");
  } finally {
    console.warn = quiet;
    delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  }
  console.log(`${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
