/**
 * Indlæs statiske sider fra content/pages/*.md i D1 (pages-tabellen) som
 * UPUBLICEREDE kladder (published=0, migration-014) — redigér + publicér i
 * admin → Sider. INSERT OR IGNORE: en eksisterende side med samme slug røres
 * ALDRIG (admin-redigeringer vinder altid over seed-filerne).
 *
 * Filformat: frontmatter (slug, title, meta_description) + markdown-brødtekst.
 *
 * Kør:  npx tsx pipeline/seed/seed-pages.ts
 *       npx tsx pipeline/seed/seed-pages.ts --dry-run
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { createD1Client } from "../lib/d1-client";

const PAGES_DIR = join(__dirname, "..", "..", "content", "pages");

interface PageFile {
  slug: string;
  title: string;
  meta_description: string | null;
  content: string;
}

function parsePageFile(path: string): PageFile | null {
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  if (!fm.slug || !fm.title) return null;
  return {
    slug: fm.slug,
    title: fm.title,
    meta_description: fm.meta_description ?? null,
    content: m[2].trim(),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.log(`Ingen .md-filer i ${PAGES_DIR}`);
    return;
  }

  const db = dryRun ? null : createD1Client();

  for (const file of files) {
    const page = parsePageFile(join(PAGES_DIR, file));
    if (!page) {
      console.log(`⚠ ${file}: mangler frontmatter (slug/title) — sprunget over`);
      continue;
    }
    const hasPlaceholders = /\[REDIGER/.test(page.content);
    if (dryRun) {
      console.log(
        `(dry-run) ville indlæse /${page.slug} — "${page.title}" (${page.content.length} tegn)` +
          (hasPlaceholders ? " [indeholder REDIGER-pladsholdere]" : ""),
      );
      continue;
    }
    const result = await db!.execute(
      `INSERT OR IGNORE INTO pages (slug, title, content, meta_description, published, updated_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))`,
      [page.slug, page.title, page.content, page.meta_description],
    );
    if ((result.meta?.changes ?? 0) > 0) {
      console.log(
        `✓ /${page.slug} — "${page.title}" indlæst som kladde` +
          (hasPlaceholders ? " (husk at udfylde [REDIGER:-felterne før publicering)" : ""),
      );
    } else {
      console.log(`⏭ /${page.slug} findes allerede — ikke rørt`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
