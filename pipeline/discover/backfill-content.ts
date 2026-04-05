/**
 * Backfill content_raw for eksisterende stories der mangler indhold.
 *
 * Finder alle stories med status='new' og content_raw IS NULL,
 * forsøger at scrape indholdet fra source_url og opdaterer databasen.
 *
 * Kør med: npx tsx pipeline/discover/backfill-content.ts [--limit N] [--max-age-days N] [--dry-run]
 *
 * --max-age-days: Ignorer stories ældre end N dage (default: 14).
 *   Forhindrer at gamle nyheder pludselig dukker op som friske artikler.
 */

import { createD1Client } from "../lib/d1-client";
import { fetchStoryContent } from "./extract-story";

interface StoryToBackfill {
  id: number;
  source_url: string;
  headline: string;
  athlete_name: string;
  discovered_at: string;
}

function parseArgs(): { limit: number; maxAgeDays: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let limit = 50;
  let maxAgeDays = 14;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 50;
    }
    if (args[i] === "--max-age-days" && args[i + 1]) {
      maxAgeDays = parseInt(args[i + 1], 10) || 14;
    }
    if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { limit, maxAgeDays, dryRun };
}

async function main(): Promise<void> {
  const { limit, maxAgeDays, dryRun } = parseArgs();
  const db = createD1Client();

  if (dryRun) console.log("[DRY RUN] Ingen opdateringer gemmes.\n");
  console.log(`Datofilter: kun stories fundet inden for de seneste ${maxAgeDays} dage.\n`);

  // Tæl total (inden for datogrænsen)
  const countResult = await db.query<{ total: number; too_old: number }>(
    `SELECT
       COUNT(CASE WHEN datetime(discovered_at, '+' || ? || ' days') >= datetime('now') THEN 1 END) as total,
       COUNT(CASE WHEN datetime(discovered_at, '+' || ? || ' days') < datetime('now') THEN 1 END) as too_old
     FROM stories
     WHERE status = 'new' AND content_raw IS NULL`,
    [maxAgeDays, maxAgeDays],
  );
  const total = countResult.results[0]?.total ?? 0;
  const tooOld = countResult.results[0]?.too_old ?? 0;

  console.log(`Stories uden content_raw: ${total} inden for ${maxAgeDays} dage (${tooOld} ignoreret — for gamle)`);
  console.log(`Behandler op til ${limit}\n`);

  if (total === 0) {
    console.log("Intet at gøre.");
    return;
  }

  // Hent stories til backfill — kun inden for datogrænsen
  const result = await db.query<StoryToBackfill>(
    `SELECT s.id, s.source_url, s.headline, s.discovered_at, a.name as athlete_name
     FROM stories s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.status = 'new'
       AND s.content_raw IS NULL
       AND s.source_url IS NOT NULL
       AND datetime(s.discovered_at, '+' || ? || ' days') >= datetime('now')
     ORDER BY s.discovered_at DESC
     LIMIT ?`,
    [maxAgeDays, limit],
  );

  const stories = result.results;
  console.log(`Henter indhold for ${stories.length} story(ies)...\n`);

  let fetched = 0;
  let failed = 0;
  let skipped = 0;

  for (const story of stories) {
    try {
      const content = await fetchStoryContent(story.source_url);

      if (!content) {
        console.log(`  SKIP  [${story.id}] ${story.headline?.slice(0, 60) ?? story.source_url}`);
        skipped++;
      } else {
        console.log(`  OK    [${story.id}] ${story.headline?.slice(0, 60) ?? story.source_url} (${content.length} tegn)`);

        if (!dryRun) {
          await db.execute(
            `UPDATE stories SET content_raw = ? WHERE id = ?`,
            [content, story.id],
          );
        }
        fetched++;
      }
    } catch (err) {
      console.error(`  FEJL  [${story.id}] ${story.source_url}: ${err}`);
      failed++;
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\nFærdig. Hentet: ${fetched} | Ingen indhold: ${skipped} | Fejl: ${failed}`,
  );
  if (fetched > 0) {
    console.log(`Klar til artikelgenerering: ${fetched} nye stories med content_raw`);
  }
}

main().catch((err) => {
  console.error("Backfill fejlede:", err);
  process.exit(1);
});
