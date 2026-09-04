/**
 * Apply an editorial pass over the draft queue: correct-and-publish, or reject.
 * ===========================================================================
 *
 * Written for the review of 2026-09-04, where every draft in the queue was
 * checked line by line against its own source. The decisions live in a JSON
 * file so the SQL side stays dumb and auditable:
 *
 *   [{ "id": 189, "action": "publish", "title": "...", "summary": "...", "content": "..." },
 *    { "id": 203, "action": "reject",  "reason": "..." }]
 *
 * It mirrors src/lib/admin.ts (publishArticle / updateArticle / deleteArticle)
 * rather than inventing its own semantics — same review_log rows, same slug
 * regeneration, same child-before-parent delete order. Two deliberate gaps:
 * the IndexNow ping and the athlete_events harvest are Worker-side extras that
 * "must never block a publish", and they are not replayed here.
 *
 *   npx tsx pipeline/fix/apply-draft-decisions.ts <decisions.json> [--dry-run]
 */

import { readFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../../src/lib/slug";

interface Decision {
  id: number;
  action: "publish" | "reject";
  title?: string;
  summary?: string;
  content?: string;
  reason?: string;
}

const [file, ...flags] = process.argv.slice(2);
const DRY = flags.includes("--dry-run");
if (!file) {
  console.error("Usage: apply-draft-decisions.ts <decisions.json> [--dry-run]");
  process.exit(1);
}

const decisions = JSON.parse(readFileSync(file, "utf8")) as Decision[];
const db = createD1Client();

// Language matters for the slug: the Danish pack transliterates æ/ø/å, and the
// article's own country is what decides which pack applies.
const langForCountry = (c: string | null) => (c === "DK" ? "da" : "en");

async function main() {
  let published = 0;
  let rejected = 0;

  for (const d of decisions) {
    const row = (
      await db.query<{
        id: number;
        published: number;
        country: string | null;
        article_type: string | null;
        fabrication_risk: string | null;
        cover_image_url: string | null;
        title: string;
        content: string;
        original_content: string | null;
        story_id: number | null;
        athlete_id: number | null;
        sensitive: string | null;
      }>(
        `SELECT a.id, a.published, a.country, a.article_type, a.fabrication_risk,
                a.cover_image_url, a.title, a.content, a.original_content,
                a.story_id, a.athlete_id, s.sensitive
           FROM articles a LEFT JOIN stories s ON s.id = a.story_id
          WHERE a.id = ?`,
        [d.id],
      )
    ).results[0];

    if (!row) {
      console.log(`  ! #${d.id} no longer exists — skipping`);
      continue;
    }
    if (row.published === 1) {
      console.log(`  ! #${d.id} is already published — skipping`);
      continue;
    }

    if (d.action === "reject") {
      console.log(`  − rejecting #${d.id}: ${row.title}`);
      if (DRY) continue;
      // review_log first: the row must survive the article it describes.
      if (row.original_content) {
        await db.execute(
          `INSERT INTO review_log (article_id, decision, article_type, fabrication_risk, sensitive,
                                   content_snapshot, title_snapshot, story_id, athlete_id)
           VALUES (?, 'rejected', ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.id,
            row.article_type,
            row.fabrication_risk,
            row.sensitive,
            row.original_content,
            row.title,
            row.story_id,
            row.athlete_id,
          ],
        );
      }
      await db.batch([
        { sql: "DELETE FROM draft_reviews WHERE article_id = ?", params: [d.id] },
        { sql: "DELETE FROM social_posts WHERE article_id = ?", params: [d.id] },
        { sql: "DELETE FROM articles WHERE id = ?", params: [d.id] },
      ]);
      rejected++;
      continue;
    }

    // ── publish ──────────────────────────────────────────────────────────────
    const sets: string[] = [];
    const params: unknown[] = [];
    if (d.title !== undefined) {
      sets.push("title = ?", "slug = ?");
      params.push(d.title, generateSlug(d.title, 120, langForCountry(row.country)));
    }
    if (d.summary !== undefined) {
      sets.push("summary = ?");
      params.push(d.summary);
    }
    if (d.content !== undefined) {
      sets.push("content = ?");
      params.push(d.content);
    }

    console.log(`  ✓ publishing #${d.id}: ${d.title ?? row.title}`);
    if (DRY) continue;

    if (sets.length) {
      sets.push("updated_at = datetime('now')");
      await db.execute(`UPDATE articles SET ${sets.join(", ")} WHERE id = ?`, [...params, d.id]);
    }

    // Same rule as publishArticle: an /api/og URL is a meta-tag image, never a
    // visible cover, so it is not frozen onto the article.
    const cover =
      row.cover_image_url && !row.cover_image_url.includes("/api/og")
        ? row.cover_image_url
        : null;

    await db.execute(
      `UPDATE articles
          SET published = 1, published_at = datetime('now'), cover_image_url = ?
        WHERE id = ?`,
      [cover, d.id],
    );

    if (row.original_content) {
      const finalContent = d.content ?? row.content;
      const decision = finalContent === row.original_content ? "approved_as_is" : "edited";
      await db.execute(
        `INSERT INTO review_log (article_id, decision, article_type, fabrication_risk, sensitive)
         VALUES (?, ?, ?, ?, ?)`,
        [d.id, decision, row.article_type, row.fabrication_risk, row.sensitive],
      );
    }
    published++;
  }

  console.log(`\n${DRY ? "[dry-run] " : ""}published: ${published} · rejected: ${rejected}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
