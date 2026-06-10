/**
 * Indlæs statiske sider fra content/pages/*.md i D1 (pages-tabellen).
 *
 * Filformat: frontmatter (slug, title, meta_description) + markdown-brødtekst.
 * Siderne serveres på /<slug> via [...segments] og kan redigeres videre i
 * admin → Sider (denne seed OVERSKRIVER en eksisterende side med samme slug).
 *
 * Kør:  npx tsx pipeline/seed/seed-pages.ts            (springer filer med [REDIGER over)
 *       npx tsx pipeline/seed/seed-pages.ts --dry-run
 *       npx tsx pipeline/seed/seed-pages.ts --allow-placeholders
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
  const allowPlaceholders = args.includes("--allow-placeholders");

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
    if (!allowPlaceholders && /\[REDIGER/.test(page.content)) {
      console.log(`⏭ ${file}: indeholder [REDIGER-pladsholdere — redigér først (eller --allow-placeholders)`);
      continue;
    }
    if (dryRun) {
      console.log(`(dry-run) ville indlæse /${page.slug} — "${page.title}" (${page.content.length} tegn)`);
      continue;
    }
    await db!.execute(
      `INSERT OR REPLACE INTO pages (slug, title, content, meta_description, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [page.slug, page.title, page.content, page.meta_description],
    );
    console.log(`✓ /${page.slug} — "${page.title}" indlæst`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
