/**
 * Gem en RETTET kladde tilbage i D1 — fra en fil, ikke fra en model.
 * ===========================================================================
 *
 * Gennemgangen (`draft-pack.ts` → `save-review.ts`) finder fejlene. Den her
 * lægger rettelsen ind igen. Uden den er den eneste vej fra "jeg ved hvad der
 * er galt" til "det står rigtigt i basen" enten `/admin` i browseren eller
 * håndskrevet SQL med citationstegn i brødteksten — og det sidste er hvordan
 * en kladde bliver ødelagt.
 *
 * Filformatet er det SAMME som generatorens output (`parse-output.ts`):
 *
 *   # Overskrift
 *   > Ingress
 *   Brødtekst i markdown …
 *
 * Tre spærrer, med vilje:
 *   1. **Publicerer ALDRIG.** `published` røres ikke — som `save_draft` i
 *      MCP-serveren. Publicering er stadig et menneskes beslutning (2026-07-02).
 *   2. **Nægter en publiceret artikel.** En rettelse af noget der ER ude skal
 *      gennem `/admin`, hvor rettelsesnoten (`correction_note`) hører til.
 *   3. **Slug følger titlen** — samme regel som `updateArticle` i `src/lib/admin.ts`,
 *      så en rettet titel ikke efterlader en slug der lyver. Er den nye slug
 *      optaget af en ANDEN artikel, afbrydes der (slug er UNIQUE).
 *
 * Kør:
 *   npx tsx pipeline/generate/save-draft.ts --article 113 --file rettet-113.md
 *   npx tsx pipeline/generate/save-draft.ts --article 113 --file rettet-113.md --dry-run
 */

import { readFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { parseArticleOutput } from "./parse-output";
import { generateSlug } from "../../src/lib/slug";

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  published: number;
  country: string | null;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const id = Number(arg("article"));
  const file = arg("file");
  const dryRun = process.argv.includes("--dry-run");

  if (!id || !file) {
    console.error(
      "Brug: npx tsx pipeline/generate/save-draft.ts --article <id> --file <fil.md> [--dry-run]",
    );
    process.exit(1);
  }

  const db = createD1Client();
  const found = await db.query<ArticleRow>(
    "SELECT id, title, slug, summary, content, published, country FROM articles WHERE id = ?",
    [id],
  );
  const row = found.results[0];
  if (!row) {
    console.error(`! artikel #${id} findes ikke`);
    process.exit(1);
  }
  if (row.published === 1) {
    console.error(
      `! artikel #${id} ER publiceret. Rettelser af publiceret indhold hører til i /admin, hvor rettelsesnoten følger med.`,
    );
    process.exit(1);
  }

  const parsed = parseArticleOutput(readFileSync(file, "utf-8"));
  if (!parsed.title || !parsed.content) {
    console.error("! filen mangler overskrift eller brødtekst — intet gemt");
    process.exit(1);
  }

  // Sproget bag sluggen er sitets, ikke filens: countrys sprogpakke bestemmer
  // translitterationen (æ/ø/å på dansk, intet at gøre på engelsk).
  //
  // Sluggen røres KUN hvis titlen ændres. Den eksisterende slug er tit kortet
  // ned i hånden eller af generatoren, og en ren rettelse i brødteksten skal
  // ikke flytte artiklens adresse.
  const lang = row.country === "DK" ? "da" : "en";
  const slug =
    parsed.title === row.title ? row.slug : generateSlug(parsed.title, 120, lang);

  if (slug !== row.slug) {
    const clash = await db.query<{ id: number }>(
      "SELECT id FROM articles WHERE slug = ? AND id != ?",
      [slug, id],
    );
    if (clash.results.length > 0) {
      console.error(
        `! sluggen "${slug}" er optaget af artikel #${clash.results[0].id} — vælg en anden overskrift`,
      );
      process.exit(1);
    }
  }

  console.log(`#${id} (${row.country ?? "?"})`);
  console.log(`  titel:   ${row.title}\n        → ${parsed.title}`);
  console.log(`  slug:    ${row.slug}\n        → ${slug}`);
  console.log(
    `  ingress: ${(row.summary ?? "").length} tegn → ${parsed.summary.length} tegn`,
  );
  console.log(
    `  tekst:   ${row.content.length} tegn → ${parsed.content.length} tegn`,
  );

  if (dryRun) {
    console.log("  [dry-run] intet gemt");
    return;
  }

  await db.query(
    `UPDATE articles
        SET title = ?, summary = ?, content = ?, slug = ?, updated_at = datetime('now')
      WHERE id = ? AND published = 0`,
    [parsed.title, parsed.summary, parsed.content, slug, id],
  );
  console.log("  gemt (stadig upubliceret)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
