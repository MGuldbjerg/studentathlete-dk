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
import { fetchStoryContent, extractMainText, isBlockedDomain } from "./extract-story";
import {
  renderPage,
  isBrowserRenderAvailable,
  BrowserRenderError,
} from "../lib/browser-render";

interface StoryToBackfill {
  id: number;
  source_url: string;
  headline: string;
  athlete_name: string;
  discovered_at: string;
}

function parseArgs(): {
  limit: number;
  maxAgeDays: number;
  dryRun: boolean;
  render: boolean;
  renderBudget: number;
} {
  const args = process.argv.slice(2);
  let limit = 50;
  let maxAgeDays = 2;
  let dryRun = false;
  let render = true; // CF Browser Rendering fallback for JS-sider (slå fra med --no-render)
  let renderBudget = 40; // max render-kald per kørsel (beskytter gratis browser-tid)

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
    if (args[i] === "--no-render") {
      render = false;
    }
    if (args[i] === "--render-budget" && args[i + 1]) {
      renderBudget = parseInt(args[i + 1], 10) || 40;
    }
  }

  return { limit, maxAgeDays, dryRun, render, renderBudget };
}

async function main(): Promise<void> {
  const { limit, maxAgeDays, dryRun, render, renderBudget } = parseArgs();
  const db = createD1Client();

  const renderEnabled = render && isBrowserRenderAvailable();
  let rendersUsed = 0;
  let renderQuotaExhausted = false;
  let renderedOk = 0;

  if (dryRun) console.log("[DRY RUN] Ingen opdateringer gemmes.\n");
  if (renderEnabled) {
    console.log(`Browser Rendering-fallback aktiv (budget: ${renderBudget} sider/kørsel).`);
  }
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
     ORDER BY s.relevance_score DESC, s.discovered_at DESC
     LIMIT ?`,
    [maxAgeDays, limit],
  );

  const stories = result.results;
  console.log(`Henter indhold for ${stories.length} story(ies)...\n`);

  let fetched = 0;
  let failed = 0;
  let skipped = 0;

  for (const story of stories) {
    if (isBlockedDomain(story.source_url)) {
      console.log(`  BLOK  [${story.id}] ${story.headline?.slice(0, 60) ?? story.source_url}`);
      // Marker som rejected så den ikke kommer igen
      if (!dryRun) {
        await db.execute(`UPDATE stories SET status = 'rejected' WHERE id = ?`, [story.id]);
      }
      skipped++;
      continue;
    }

    try {
      let content = await fetchStoryContent(story.source_url);

      // Fallback: render JS-tunge sider via CF Browser Rendering (budget-begrænset).
      if (!content && renderEnabled && !renderQuotaExhausted && rendersUsed < renderBudget) {
        rendersUsed++;
        try {
          const rendered = await renderPage(story.source_url);
          if (rendered) {
            content = extractMainText(rendered);
            if (content) renderedOk++;
          }
        } catch (err) {
          if (err instanceof BrowserRenderError && err.quotaExhausted) {
            renderQuotaExhausted = true;
            console.warn(`  ⚠ Browser Rendering stoppet for resten af kørslen (${err.message})`);
          } else {
            console.warn(
              `  ⚠ Render fejlede [${story.id}]: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

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
    `\nFærdig. Hentet: ${fetched} | Ingen indhold: ${skipped} | Fejl: ${failed}` +
      (renderEnabled ? ` | Render: ${renderedOk} ok af ${rendersUsed}/${renderBudget}` : ""),
  );
  if (fetched > 0) {
    console.log(`Klar til artikelgenerering: ${fetched} nye stories med content_raw`);
  }
}

main().catch((err) => {
  console.error("Backfill fejlede:", err);
  process.exit(1);
});
