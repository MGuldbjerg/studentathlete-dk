/**
 * Drift check: do the live sport/guide pages show the code's texts?
 *
 * D1 `pages` rows override the code, so a code change to SPORT_CONTENT /
 * VIDEN_GUIDES is invisible until someone pushes it to D1 (gotcha 2026-07-02).
 *
 * WHY IT READS THE PAGES, NOT JUST THE STAMP (2026-09-24). The first version
 * only compared the code hash with the seed stamp in `site_content`. On
 * 2026-09-17 Mikkel's proofread went live via `generate-sport-sql.ts`, which
 * writes the text but not the stamp — so the check cried drift for eight days
 * about pages that were byte-identical to the code. What the alarm is FOR is
 * "readers see something other than the code", so that is what it now measures.
 *
 * Per text set:
 *   - every page equals the code          → in sync (whatever the stamp says)
 *   - pages differ, code hash == stamp    → admin edits made after the last
 *                                           seed; the code hasn't moved, so
 *                                           that is the editor's choice, not drift
 *   - pages differ, code hash != stamp    → DRIFT: the code changed and did not
 *                                           reach the site (exit 1 → Discord)
 *
 * Run: npx tsx pipeline/checks/content-drift.ts
 * Fix on drift:
 *   npx tsx pipeline/seed/seed-sport.ts  && wrangler d1 execute studentathlete-dk --remote --file=db/seed-sport.sql
 *   npx tsx pipeline/seed/seed-guides.ts && wrangler d1 execute studentathlete-dk --remote --file=db/seed-guides.sql
 *   NB: the pages listed as differing may hold admin edits — the seed overwrites them.
 */
import { createD1Client } from "../lib/d1-client";
import { sportContentHash, guidesContentHash, SEED_HASH_KEYS } from "../lib/content-hash";
import { SPORT_CONTENT } from "../../src/lib/sport-content";
import { VIDEN_GUIDES, guideToMarkdown } from "../../src/lib/viden-content";

interface PageRow {
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
}

/** What the code says a page should contain, keyed by slug. */
type Expected = Map<string, { title: string; content: string; meta: string }>;

const sportExpected: Expected = new Map(
  Object.entries(SPORT_CONTENT).map(([slug, c]) => [
    slug,
    { title: c.title, content: c.pillar, meta: c.metaDescription },
  ]),
);

const guidesExpected: Expected = new Map(
  VIDEN_GUIDES.map((g) => [
    g.slug,
    { title: g.title, content: guideToMarkdown(g), meta: g.description },
  ]),
);

/** Slugs whose live row is missing or differs from the code, with the fields. */
function differences(expected: Expected, live: PageRow[]): string[] {
  const bySlug = new Map(live.map((r) => [r.slug, r]));
  const out: string[] = [];
  for (const [slug, e] of expected) {
    const row = bySlug.get(slug);
    if (!row) {
      out.push(`${slug} (missing in D1)`);
      continue;
    }
    const fields = [
      row.title !== e.title && "title",
      row.content !== e.content && "content",
      (row.meta_description ?? "") !== e.meta && "meta",
    ].filter(Boolean);
    if (fields.length) out.push(`${slug} (${fields.join(", ")})`);
  }
  return out;
}

async function main(): Promise<void> {
  const db = createD1Client();

  const stampRows = await db.query<{ key: string; value: string }>(
    // country = 'DK': the stamp belongs to the Danish seed texts (migration 037).
    `SELECT key, value FROM site_content WHERE key IN (?, ?) AND country = 'DK'`,
    [SEED_HASH_KEYS.sport, SEED_HASH_KEYS.guides],
  );
  const stamped: Record<string, string> = {};
  for (const row of stampRows.results) stamped[row.key] = row.value;

  const checks = [
    { name: "sport-pillars (SPORT_CONTENT)", kind: "sport", key: SEED_HASH_KEYS.sport, code: sportContentHash(), expected: sportExpected },
    { name: "viden-guider (VIDEN_GUIDES)", kind: "guide", key: SEED_HASH_KEYS.guides, code: guidesContentHash(), expected: guidesExpected },
  ];

  let drift = false;
  for (const c of checks) {
    const live = await db.query<PageRow>(
      `SELECT slug, title, content, meta_description FROM pages WHERE kind = ? AND country = 'DK'`,
      [c.kind],
    );
    const diff = differences(c.expected, live.results);

    if (diff.length === 0) {
      const note = stamped[c.key] === c.code ? "" : " — seed stamp is stale, but the pages match";
      console.log(`✓ ${c.name}: all ${c.expected.size} pages match the code${note}`);
      continue;
    }

    if (stamped[c.key] === c.code) {
      console.log(`✓ ${c.name}: code unchanged since last seed; ${diff.length} page(s) edited in admin: ${diff.join(", ")}`);
      continue;
    }

    drift = true;
    console.error(`✗ ${c.name}: code changed and ${diff.length} page(s) do not show it: ${diff.join(", ")}`);
  }

  if (drift) {
    console.error("\nDRIFT: code texts are not live. See fix commands in the file header.");
    process.exit(1);
  }
  console.log("\nNo drift — the live pages match the code.");
}

main().catch((err) => {
  console.error("Drift check failed:", err);
  process.exit(1);
});
