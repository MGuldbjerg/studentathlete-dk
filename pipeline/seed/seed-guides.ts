/**
 * Genererer db/seed-guides.sql: de 13 viden-guider som redigerbare pages-rækker
 * (kind='guide'). Konverterer den strukturerede VIDEN_GUIDES til markdown, som
 * ArticleBody kan rendere, så indholdet kan redigeres i admin → Sider.
 *
 * Kør:  npx tsx pipeline/seed/seed-guides.ts
 * Indlæs:  wrangler d1 execute studentathlete-dk --remote --file=db/seed-guides.sql
 *
 * Idempotent (ON CONFLICT DO UPDATE). NB: kører du den IGEN efter manuelle
 * admin-redigeringer, overskrives indholdet med koden — kun til engangs-seed.
 */
import { writeFileSync } from "node:fs";
import { VIDEN_GUIDES, guideToMarkdown } from "../../src/lib/viden-content";
import { guidesContentHash, seedHashUpsertSql, SEED_HASH_KEYS } from "../lib/content-hash";

const esc = (s: string) => s.replace(/'/g, "''");

const stmts = VIDEN_GUIDES.map((g) => {
  const md = guideToMarkdown(g);
  return `INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('${esc(g.slug)}', '${esc(g.title)}', '${esc(md)}', '${esc(g.description)}', 1, 'guide', '${esc(g.category)}', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');`;
});

// Seed-hash-stempel: fortæller drift-tjekket at D1 nu matcher denne kode-version
stmts.push(seedHashUpsertSql(SEED_HASH_KEYS.guides, guidesContentHash()));

writeFileSync("db/seed-guides.sql", stmts.join("\n\n") + "\n");
console.log(`Skrev ${stmts.length - 1} guide-upserts + seed-hash til db/seed-guides.sql`);
