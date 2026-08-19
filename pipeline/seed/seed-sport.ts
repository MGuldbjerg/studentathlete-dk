/**
 * Genererer db/seed-sport.sql: de 13 sport-pillar-tekster som redigerbare
 * pages-rækker (kind='sport'). title/pillar/metaDescription bliver redigerbare i
 * admin → Sider; sport-landingssiden læser dem via resolveSportContent (D1 over
 * kode-default). `intro` forbliver kode-styret indtil videre (Phase 2 KV).
 *
 * Kør:    npx tsx pipeline/seed/seed-sport.ts
 * Indlæs: wrangler d1 execute studentathlete-dk --remote --file=db/seed-sport.sql
 *
 * Idempotent. NB: kør ikke igen efter manuelle admin-redigeringer (overskriver).
 * NB: `pages` har UNIQUE (slug, country) — ON CONFLICT skal nævne BEGGE
 * kolonner, ellers fejler hele sætningen (samme fælde som site_content/037).
 */
import { writeFileSync } from "node:fs";
import { SPORT_CONTENT } from "../../src/lib/sport-content";
import { sportContentHash, seedHashUpsertSql, SEED_HASH_KEYS } from "../lib/content-hash";

const esc = (s: string) => s.replace(/'/g, "''");

const stmts = Object.entries(SPORT_CONTENT).map(
  ([slug, c]) =>
    `INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('${esc(slug)}', 'DK', '${esc(c.title)}', '${esc(c.pillar)}', '${esc(c.metaDescription)}', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');`,
);

// Seed-hash-stempel: fortæller drift-tjekket at D1 nu matcher denne kode-version
stmts.push(seedHashUpsertSql(SEED_HASH_KEYS.sport, sportContentHash()));

writeFileSync("db/seed-sport.sql", stmts.join("\n\n") + "\n");
console.log(`Skrev ${stmts.length - 1} sport-upserts + seed-hash til db/seed-sport.sql`);
