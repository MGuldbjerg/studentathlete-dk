/**
 * Tjekker overvågningskilder for nye historier om danske atleter.
 * Kør med: npx tsx pipeline/discover/check-sources.ts
 *
 * For hver aktiv kilde:
 * 1. Hent side/feed
 * 2. Søg efter atletens navn
 * 3. Gem nye historier i stories-tabellen (deduplikeret via url_hash)
 */

import { createHash } from "crypto";
import { createD1Client } from "../lib/d1-client";
import { extractStories, fetchStoryContent } from "./extract-story";
import { backfillSources } from "../lib/auto-sources";
import type { Source } from "../lib/types";

interface SourceWithAthlete extends Source {
  athlete_name: string;
}

async function main(): Promise<void> {
  const db = createD1Client();

  // Sørg for at alle atleter har kilder
  const backfilled = await backfillSources(db);
  if (backfilled > 0) {
    console.log(`Oprettede kilder for ${backfilled} atlet(er) uden kilder.\n`);
  }

  // Hent aktive kilder der er klar til tjek
  const result = await db.query<SourceWithAthlete>(
    `SELECT s.*, a.name as athlete_name
     FROM sources s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.active = 1
     AND (s.last_checked_at IS NULL
          OR datetime(s.last_checked_at, '+' || s.check_interval_hours || ' hours') < datetime('now'))
     ORDER BY s.last_checked_at ASC NULLS FIRST
     LIMIT 50`,
  );

  const sources = result.results;

  if (sources.length === 0) {
    console.log("Ingen kilder klar til tjek.");
    return;
  }

  console.log(`Tjekker ${sources.length} kilde(r)...\n`);

  let totalFound = 0;
  let totalChecked = 0;

  for (const source of sources) {
    try {
      const stories = await extractStories(
        source.url,
        source.athlete_name,
        source.source_type,
      );

      for (const story of stories) {
        const urlHash = createHash("sha256").update(story.url).digest("hex");

        // Berig med fuldt indhold (for bedre artikelgenerering)
        let contentRaw = story.content;
        if (!contentRaw && story.url) {
          contentRaw = await fetchStoryContent(story.url);
          // Rate limiting mellem content-fetches
          await new Promise((r) => setTimeout(r, 500));
        }

        try {
          await db.execute(
            `INSERT OR IGNORE INTO stories
             (athlete_id, source_id, source_url, url_hash, headline, summary, content_raw, source_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              source.athlete_id,
              source.id,
              story.url,
              urlHash,
              story.headline,
              story.summary,
              contentRaw,
              source.source_type,
            ],
          );
          totalFound++;
        } catch {
          // Duplikat URL (url_hash UNIQUE constraint) — forventet
        }
      }

      // Opdater last_checked_at
      await db.execute(
        'UPDATE sources SET last_checked_at = datetime("now") WHERE id = ?',
        [source.id],
      );

      if (stories.length > 0) {
        console.log(
          `  ${source.athlete_name}: Fandt ${stories.length} historie(r) fra ${source.url}`,
        );
      }

      totalChecked++;

      // Rate limiting: 1 sekund mellem kilder
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Fejl ved kilde ${source.id} (${source.url}): ${err}`);
    }
  }

  console.log(
    `\nFærdig. Tjekket ${totalChecked} kilder, fundet ${totalFound} nye historie(r).`,
  );
}

main().catch((err) => {
  console.error("Story discovery fejlede:", err);
  process.exit(1);
});
