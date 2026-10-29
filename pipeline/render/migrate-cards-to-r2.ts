/**
 * Backfill: copy the current-version cards from D1 card_blobs into R2.
 * ====================================================================
 *
 * One-off for the move to R2 (pipeline/lib/card-store.ts, docs/RUNBOOK.md
 * «Cards in R2»). Reads `card-<id>-v<N>` and `ig-<id>-v<N>` rows for the
 * current CARD_VERSION in pages, and uploads each as raw bytes to
 * `cards/<key>.webp|.jpg`. Older versions are not copied: every URL — new,
 * and old ones via /api/og's redirect — points at the current version.
 *
 * Idempotent: an object already in the bucket is skipped (checked with a GET,
 * see R2ObjectClient.exists), so a rerun after a failure only uploads the rest.
 *
 * It does NOT delete or change anything in D1. Emptying card_blobs is a later,
 * separate decision — see the note at the end of «Cards in R2» in the runbook.
 *
 *   npx tsx pipeline/render/migrate-cards-to-r2.ts --dry-run   # reads only: D1 rows + R2 existence
 *   npx tsx pipeline/render/migrate-cards-to-r2.ts [--limit N]
 *
 * Needs CLOUDFLARE_API_TOKEN (with «Workers R2 Storage: Edit»), CLOUDFLARE_ACCOUNT_ID,
 * CLOUDFLARE_D1_DATABASE_ID; CARD_R2_BUCKET (default studentathlete-media).
 */
import { createD1Client } from "../lib/d1-client";
import { R2ObjectClient, sniffContentType } from "../lib/card-store";
import { CARD_VERSION } from "../../src/lib/seo";
import { cardContentType, cardObjectKey, isCardKey } from "../../src/lib/og-static";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg >= 0 ? parseInt(args[limitArg + 1] ?? "", 10) : Infinity;
const PAGE = 25; // ~83 KB of base64 per row; keeps each D1 HTTP response small

async function main(): Promise<void> {
  const db = createD1Client();
  const r2 = R2ObjectClient.fromEnv();
  console.log(`${DRY_RUN ? "DRY-RUN — nothing is written. " : ""}D1 card_blobs (v${CARD_VERSION}) → R2 bucket ${r2.bucket}`);

  const n = { scanned: 0, uploaded: 0, exists: 0, marker: 0, wrongFormat: 0, failed: 0 };
  let after = "";
  outer: for (;;) {
    // Keyset paging on the primary key: each page reads its own rows only.
    const { results } = await db.query<{ key: string; png_base64: string }>(
      `SELECT key, png_base64 FROM card_blobs
        WHERE key > ? AND (key LIKE ? OR key LIKE ?)
        ORDER BY key LIMIT ?`,
      [after, `card-%-v${CARD_VERSION}`, `ig-%-v${CARD_VERSION}`, PAGE],
    );
    if (results.length === 0) break;
    for (const row of results) {
      after = row.key;
      if (!isCardKey(row.key)) continue;
      if (n.scanned >= LIMIT) break outer;
      n.scanned++;
      if (!row.png_base64) { n.marker++; continue; } // written in r2 mode: already in R2
      const bytes = Buffer.from(row.png_base64, "base64");
      const want = cardContentType(row.key);
      const got = sniffContentType(bytes);
      if (got !== want) {
        // The object's URL fixes the extension; never serve a PNG as .webp.
        console.warn(`  ! ${row.key}: ${got ?? "unknown format"}, expected ${want} — skipped (re-render it)`);
        n.wrongFormat++;
        continue;
      }
      const objectKey = cardObjectKey(row.key);
      try {
        if (await r2.exists(objectKey)) { n.exists++; continue; }
        if (!DRY_RUN) await r2.put(objectKey, bytes, want);
        n.uploaded++;
        console.log(`  ${DRY_RUN ? "·" : "✓"} ${objectKey} (${Math.round(bytes.length / 1024)} KB)`);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 401 || status === 403) throw err; // the token, not this card
        n.failed++;
        console.error(`  ✗ ${objectKey}: ${(err as Error).message}`);
      }
    }
    if (results.length < PAGE) break;
  }

  console.log(
    `\nDone: ${n.scanned} cards scanned · ${n.uploaded} ${DRY_RUN ? "would be uploaded" : "uploaded"} · ` +
      `${n.exists} already in R2 · ${n.marker} r2 markers · ${n.wrongFormat} wrong format · ${n.failed} failed.`,
  );
  if (n.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Card backfill failed:", err);
  process.exit(1);
});
