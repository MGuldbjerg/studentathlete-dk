/**
 * Tjekker skolers nyhedsfeeds for nye historier om danske atleter.
 * Kør med: npx tsx pipeline/discover/check-sources.ts [--limit N]
 *
 * Ny strategi: overvåg hver skoles generelle nyhedsfeed ÉN gang
 * og match mod ALLE danske atleter på den skole.
 * Google News beholdes som supplerende per-atlet kilde.
 */

import { createHash } from "crypto";
import { createD1Client } from "../lib/d1-client";
import {
  extractStories,
  extractStoriesForSchool,
  fetchStoryContent,
} from "./extract-story";
import { backfillSources } from "../lib/auto-sources";
import type { Source } from "../lib/types";

interface SchoolWithFeed {
  id: number;
  name: string;
  news_feed_url: string;
  news_feed_type: "rss" | "html";
  athlete_count: number;
}

interface AthleteRef {
  id: number;
  name: string;
}

interface SourceWithAthlete extends Source {
  athlete_name: string;
}

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);
  let limit = 100;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 100;
    }
  }

  return { limit };
}

async function checkSchoolFeeds(
  db: ReturnType<typeof createD1Client>,
  limit: number,
): Promise<{ checked: number; found: number }> {
  // Hent skoler der er klar til tjek
  const result = await db.query<SchoolWithFeed>(
    `SELECT s.id, s.name, s.news_feed_url, s.news_feed_type,
            COUNT(a.id) as athlete_count
     FROM schools s
     JOIN athletes a ON a.university = s.name AND a.active = 1
     WHERE s.news_feed_url IS NOT NULL
       AND (s.news_last_checked_at IS NULL
            OR datetime(s.news_last_checked_at, '+6 hours') < datetime('now'))
     GROUP BY s.id
     ORDER BY s.news_last_checked_at ASC NULLS FIRST
     LIMIT ?`,
    [limit],
  );

  const schools = result.results;

  if (schools.length === 0) {
    console.log("Ingen skoler klar til feed-tjek.");
    return { checked: 0, found: 0 };
  }

  console.log(`Tjekker feeds for ${schools.length} skole(r)...\n`);

  let totalChecked = 0;
  let totalFound = 0;

  for (const school of schools) {
    try {
      // Hent alle aktive atleter på denne skole
      const athleteResult = await db.query<AthleteRef>(
        `SELECT id, name FROM athletes WHERE university = ? AND active = 1`,
        [school.name],
      );
      const athletes = athleteResult.results;

      if (athletes.length === 0) {
        await db.execute(
          `UPDATE schools SET news_last_checked_at = datetime('now') WHERE id = ?`,
          [school.id],
        );
        continue;
      }

      // Udtræk og match historier
      const stories = await extractStoriesForSchool(
        school.news_feed_url,
        school.news_feed_type,
        athletes,
      );

      let foundInSchool = 0;
      for (const story of stories) {
        const urlHash = createHash("sha256").update(story.url).digest("hex");

        // Berig med fuldt indhold
        let contentRaw = story.content;
        if (!contentRaw && story.url) {
          contentRaw = await fetchStoryContent(story.url);
          await new Promise((r) => setTimeout(r, 500));
        }

        try {
          await db.execute(
            `INSERT OR IGNORE INTO stories
             (athlete_id, source_url, url_hash, headline, summary, content_raw, source_type, relevance_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              story.athlete_id,
              story.url,
              urlHash,
              story.headline,
              story.summary,
              contentRaw,
              `school_feed_${school.news_feed_type}`,
              story.relevance_score,
            ],
          );
          foundInSchool++;
          totalFound++;
        } catch {
          // Duplikat URL (url_hash UNIQUE) — forventet
        }
      }

      // Opdatér news_last_checked_at
      await db.execute(
        `UPDATE schools SET news_last_checked_at = datetime('now') WHERE id = ?`,
        [school.id],
      );

      if (foundInSchool > 0) {
        console.log(
          `  ${school.name}: ${foundInSchool} ny(e) historie(r) fra ${school.news_feed_url}`,
        );
      } else {
        console.log(`  ${school.name}: Ingen nye matches`);
      }

      totalChecked++;
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Fejl ved ${school.name}: ${err}`);
    }
  }

  return { checked: totalChecked, found: totalFound };
}

async function checkGoogleNewsSources(
  db: ReturnType<typeof createD1Client>,
  limit: number,
): Promise<{ checked: number; found: number }> {
  // Hent aktive Google News-kilder der er klar til tjek
  const result = await db.query<SourceWithAthlete>(
    `SELECT s.*, a.name as athlete_name
     FROM sources s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.active = 1
       AND s.source_type = 'google_news'
       AND (s.last_checked_at IS NULL
            OR datetime(s.last_checked_at, '+' || s.check_interval_hours || ' hours') < datetime('now'))
     ORDER BY s.last_checked_at ASC NULLS FIRST
     LIMIT ?`,
    [limit],
  );

  const sources = result.results;

  if (sources.length === 0) return { checked: 0, found: 0 };

  console.log(`\nTjekker ${sources.length} Google News-kilde(r)...\n`);

  let totalChecked = 0;
  let totalFound = 0;

  for (const source of sources) {
    try {
      const stories = await extractStories(
        source.url,
        source.athlete_name,
        "rss",
      );

      let foundInSource = 0;
      for (const story of stories) {
        const urlHash = createHash("sha256").update(story.url).digest("hex");

        let contentRaw = story.content;
        if (!contentRaw && story.url) {
          contentRaw = await fetchStoryContent(story.url);
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
              "google_news",
            ],
          );
          foundInSource++;
          totalFound++;
        } catch {
          // Duplikat
        }
      }

      if (foundInSource > 0) {
        await db.execute(
          `UPDATE sources SET last_checked_at = datetime('now'), last_found_at = datetime('now') WHERE id = ?`,
          [source.id],
        );
      } else {
        await db.execute(
          `UPDATE sources SET last_checked_at = datetime('now') WHERE id = ?`,
          [source.id],
        );
      }

      if (stories.length > 0) {
        console.log(
          `  ${source.athlete_name}: ${stories.length} historie(r) via Google News`,
        );
      }

      totalChecked++;
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Fejl ved Google News kilde ${source.id}: ${err}`);
    }
  }

  return { checked: totalChecked, found: totalFound };
}

async function main(): Promise<void> {
  const { limit } = parseArgs();
  const db = createD1Client();

  // Sørg for at alle atleter har Google News-kilder
  const backfilled = await backfillSources(db);
  if (backfilled > 0) {
    console.log(
      `Oprettede Google News-kilder for ${backfilled} atlet(er).\n`,
    );
  }

  // 1. Skole-baserede feeds (primær kilde)
  const schoolResult = await checkSchoolFeeds(db, limit);

  // 2. Google News (supplerende per-atlet)
  const googleResult = await checkGoogleNewsSources(db, limit);

  const totalChecked = schoolResult.checked + googleResult.checked;
  const totalFound = schoolResult.found + googleResult.found;

  console.log(
    `\nFærdig. Tjekket ${schoolResult.checked} skole-feeds + ${googleResult.checked} Google News-kilder. Fundet ${totalFound} ny(e) historie(r).`,
  );
}

main().catch((err) => {
  console.error("Story discovery fejlede:", err);
  process.exit(1);
});
