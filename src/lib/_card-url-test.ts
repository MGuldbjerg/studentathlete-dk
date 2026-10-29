/**
 * The page never links a card that does not exist.
 * Run: npx tsx src/lib/_card-url-test.ts   (offline; SQL against node:sqlite)
 *
 * What must hold:
 *   - d1 mode (no media URL): the cover is the static /og/cards/ path either
 *     way — it falls through to /api/og by itself — and card_ready costs no read
 *   - r2 mode: the bucket URL only when card_ready says the card_blobs row
 *     exists; otherwise /api/og, which draws it (cover) or 404s (Instagram)
 *   - card_ready is one primary-key EXISTS that answers per article row
 *   - the post-publish render dispatch never throws and never hangs
 */
import { createRequire } from "node:module";
import { CARD_VERSION, cardReadySql, getArticleCoverUrl, getArticleIgCardUrl } from "./seo";
import { dispatchCardRender, renderDispatchRequest } from "./card-dispatch";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ ${name}`); }
}

const V = CARD_VERSION;
const STATIC = `/og/cards/card-12-v${V}.webp?type=card&article=12&v=${V}`;
const OG_CARD = `/api/og?type=card&article=12&v=${V}`;
const OG_IG = `/api/og?type=ig&article=12&v=${V}`;
const MEDIA = `https://media.studentathlete.dk/cards/card-12-v${V}.webp`;
const MEDIA_IG = `https://media.studentathlete.dk/cards/ig-12-v${V}.jpg`;

// ── d1 mode: no media URL ────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_MEDIA_BASE_URL = ""; // d1 mode, whatever MEDIA_BASE_URL_CONFIG says
ok(getArticleCoverUrl({ id: 12, card_ready: 1 }) === STATIC, "d1, card exists → static path");
ok(getArticleCoverUrl({ id: 12, card_ready: 0 }) === STATIC, "d1, card missing → static path (its own /api/og fallback)");
ok(getArticleCoverUrl({ id: 12 }) === STATIC, "d1, unknown → static path");
ok(getArticleIgCardUrl({ id: 12, ig_card_ready: 1 }) === OG_IG, "d1, IG card → /api/og as before");
ok(cardReadySql("a") === "1", "d1: card_ready is a constant — no extra read");

// ── r2 mode: media URL set ───────────────────────────────────────────────────
process.env.NEXT_PUBLIC_MEDIA_BASE_URL = "https://media.studentathlete.dk";
ok(getArticleCoverUrl({ id: 12, card_ready: 1 }) === MEDIA, "r2, card exists → bucket URL");
ok(getArticleCoverUrl({ id: 12, card_ready: true }) === MEDIA, "r2, card exists (boolean) → bucket URL");
ok(getArticleCoverUrl({ id: 12, card_ready: 0 }) === OG_CARD, "r2, card missing → /api/og fallback");
ok(getArticleCoverUrl({ id: 12 }) === OG_CARD, "r2, row without card_ready → /api/og (never a guessed bucket URL)");
ok(getArticleCoverUrl({ id: 12, card_ready: null }) === OG_CARD, "r2, card_ready null → /api/og");
ok(getArticleIgCardUrl({ id: 12, ig_card_ready: 1 }) === MEDIA_IG, "r2, IG card exists → bucket URL");
ok(getArticleIgCardUrl({ id: 12 }) === OG_IG, "r2, IG card unknown → /api/og");

// card_ready as SQL, against a real SQLite.
interface Stmt { all(...p: unknown[]): Record<string, unknown>[] }
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: new (path: string) => { exec(sql: string): void; prepare(sql: string): Stmt };
};
const db = new DatabaseSync(":memory:");
db.exec(`
  CREATE TABLE articles (id INTEGER PRIMARY KEY, title TEXT);
  CREATE TABLE card_blobs (key TEXT PRIMARY KEY, png_base64 TEXT NOT NULL, width INTEGER, height INTEGER);
  INSERT INTO articles VALUES (12, 'rendered'), (13, 'marker only'), (14, 'not rendered'), (15, 'old version');
  INSERT INTO card_blobs VALUES ('card-12-v${V}', 'AAAA', 1200, 630);
  INSERT INTO card_blobs VALUES ('card-13-v${V}', '', 1200, 630);
  INSERT INTO card_blobs VALUES ('card-15-v${V - 1}', 'AAAA', 1200, 630);
  INSERT INTO card_blobs VALUES ('ig-14-v${V}', 'AAAA', 1080, 1350);
`);
const sql = cardReadySql("a");
ok(sql.includes("card_blobs") && sql.includes(`'-v${V}'`), "r2: card_ready is the card_blobs EXISTS for this version");
const rows = db.prepare(`SELECT a.id, ${sql} AS card_ready FROM articles a ORDER BY a.id`).all();
const ready = Object.fromEntries(rows.map((r) => [r.id, Number(r.card_ready)]));
ok(ready[12] === 1, "full row → ready");
ok(ready[13] === 1, "r2 marker row (empty bytes) → ready");
ok(ready[14] === 0, "no card row (only the IG card) → not ready");
ok(ready[15] === 0, "an older CARD_VERSION's row → not ready");
const urls = rows.map((r) => getArticleCoverUrl({ id: Number(r.id), card_ready: r.card_ready as number }));
ok(urls[0].startsWith("https://media.") && urls[2].startsWith("/api/og?type=card&article=14"), "query → URL end to end");
process.env.NEXT_PUBLIC_MEDIA_BASE_URL = "";

// ── the render dispatch after a Worker publish ──────────────────────────────
const req = renderDispatchRequest(42, "tok");
ok(req.url.endsWith("/actions/workflows/render-cards.yml/dispatches"), "dispatches render-cards.yml");
ok(JSON.parse(String(req.init.body)).inputs.article === "42" && JSON.parse(String(req.init.body)).ref === "main", "with article=42 on main");

async function dispatchTests(): Promise<void> {
  const quiet = console.error;
  console.error = () => {};
  try {
    ok(await dispatchCardRender(42, "tok", async () => new Response(null, { status: 204 })) === true, "204 → dispatched");
    ok(await dispatchCardRender(42, "tok", async () => new Response("no", { status: 403 })) === false, "403 → false, no throw");
    ok(await dispatchCardRender(42, "tok", async () => { throw new TypeError("network"); }) === false, "network error → false, no throw");
    ok(await dispatchCardRender(42, undefined, async () => { throw new Error("must not be called"); }) === false, "no token → false, no call");
    const t0 = Date.now();
    const hang = (_: string, init?: RequestInit) => new Promise<Response>((_r, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });
    ok(await dispatchCardRender(42, "tok", hang) === false && Date.now() - t0 < 5000, "a hanging GitHub is cut off by the timeout");
  } finally {
    console.error = quiet;
  }
}

dispatchTests().then(() => {
  console.log(`${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
});
