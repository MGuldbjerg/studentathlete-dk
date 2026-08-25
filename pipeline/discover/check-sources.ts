/**
 * Tjekker skolers nyhedsfeeds for nye historier om danske atleter.
 * Kør med: npx tsx pipeline/discover/check-sources.ts [--limit N]
 *
 * Strategi: overvåg hver skoles generelle nyhedsfeed ÉN gang
 * og match mod ALLE danske atleter på den skole.
 */

import { createHash } from "crypto";
import { createD1Client } from "../lib/d1-client";
import {
  extractStoriesForSchool,
  matchAthletes,
  type SchoolStoryMatch,
  fetchStoryContent,
} from "./extract-story";

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
  sport?: string;
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
        `SELECT id, name, sport FROM athletes WHERE university = ? AND active = 1`,
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

      // Gruppér per URL. Matcheren udsender ÉN post pr. (artikel, atlet), så en
      // artikel der nævner to holdkammerater gav før to gennemløb — og dermed to
      // hentninger af præcis samme side. Nu hentes hver artikel én gang.
      const byUrl = new Map<string, SchoolStoryMatch[]>();
      for (const story of stories) {
        const list = byUrl.get(story.url);
        if (list) list.push(story);
        else byUrl.set(story.url, [story]);
      }

      let foundInSchool = 0;
      for (const [url, group] of byUrl) {
        const first = group[0];

        // Berig med fuldt indhold — én gang pr. artikel, ikke én gang pr. atlet.
        let contentRaw = first.content;
        if (!contentRaw && url) {
          contentRaw = await fetchStoryContent(url);
          await new Promise((r) => setTimeout(r, 500));
        }

        // Feedet matchede kun på titel og resumé. Et kampreferat nævner typisk
        // flere af skolens atleter længere nede i brødteksten: Daniel Helle lagde
        // op til Macfarlanes mål uden at stå i resuméet og fik derfor aldrig sin
        // egen vinkel. Teksten er hentet alligevel, så gen-matchningen er gratis.
        //
        // KRAV: kun FULDE navne (score 90). Et efternavn alene står i hver eneste
        // målprotokol og holdopstilling — det er ikke en historie om personen.
        const perAthlete = new Map<number, SchoolStoryMatch>();
        for (const s of group) perAthlete.set(s.athlete_id, s);
        if (contentRaw) {
          for (const m of matchAthletes(contentRaw, athletes)) {
            if (m.relevance_score < 90) continue;
            if (perAthlete.has(m.athlete.id)) continue;
            perAthlete.set(m.athlete.id, {
              ...first,
              athlete_id: m.athlete.id,
              relevance_score: m.relevance_score,
            });
          }
        }

        for (const story of perAthlete.values()) {
          // Hashen er pr. ATLET. Var den global pr. URL — som før — kunne en
          // artikel kun tilhøre ÉN atlet: den anden blev tavst droppet af
          // INSERT OR IGNORE (0 rækker, ingen fejl, intet i loggen).
          const urlHash = createHash("sha256")
            .update(`${story.athlete_id}:${url}`)
            .digest("hex");

          try {
            const res = await db.execute(
              `INSERT OR IGNORE INTO stories
               (athlete_id, source_url, url_hash, headline, summary, content_raw, source_type, relevance_score, sensitive)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                story.athlete_id,
                url,
                urlHash,
                story.headline,
                story.summary,
                contentRaw,
                `school_feed_${school.news_feed_type}`,
                story.relevance_score,
                story.sensitive,
              ],
            );
            if (res.meta.changes > 0) {
              foundInSchool++;
              totalFound++;
            }
          } catch (err) {
            console.error(
              `  Insert fejlede [${url}]: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
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


async function main(): Promise<void> {
  const { limit } = parseArgs();
  const db = createD1Client();

  const { checked, found } = await checkSchoolFeeds(db, limit);

  console.log(
    `\nFærdig. Tjekket ${checked} skole-feed(s). Fundet ${found} ny(e) historie(r).`,
  );
}

main().catch((err) => {
  console.error("Story discovery fejlede:", err);
  process.exit(1);
});
