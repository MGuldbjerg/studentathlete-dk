/**
 * Tjekker skolers nyhedsfeeds for nye historier om danske atleter.
 * Kør med: npx tsx pipeline/discover/check-sources.ts [--limit N]
 *
 * Strategi: overvåg hver skoles generelle nyhedsfeed ÉN gang
 * og match mod ALLE danske atleter på den skole.
 */

import { createD1Client } from "../lib/d1-client";
import {
  extractStoriesForSchool,
  matchAthletes,
  type SchoolStoryMatch,
  fetchStoryContent,
  fetchArticle,
  listFeedItems,
  matchArticle,
  storyMeta,
} from "./extract-story";
import { normalizeSourceUrl, storyHash } from "../lib/story-url";
import { siteCountryCodes } from "../../src/lib/countries";
import { createHash } from "node:crypto";

/**
 * The article-body pass (2026-10-26, Mikkel: «Fix»). The title pass below
 * found 2 of 32 stories on 7 measured schools. Each new feed item is opened
 * ONCE (feed_items_seen) and read for the school's player tags and full names
 * in the story text (extract-story.ts extractArticle/matchArticle).
 * Budgets: a run opens at most BODY_FETCHES pages (the first runs work through
 * every feed's backlog). Site countries' stories are not capped beyond that;
 * a COLLECTING country's are, at COLLECTING_STORIES a run — the backtest of
 * 2026-10-26 put them at ~320 a day against ~120 UK and ~16 DK, and one shared
 * cap would have gone to them.
 *
 * A collecting country's story is stored as a LINK (headline, match, source
 * URL — no content_raw; Mikkel 2026-10-27: «just store links … for the
 * countries not launched yet»). Nothing reads their text before launch, and
 * at launch it is fetched again from the link. ~135 MB a month saved.
 */
const BODY_FETCHES = Number(process.env.BODY_FETCHES ?? 600);
const COLLECTING_STORIES = Number(process.env.COLLECTING_STORIES ?? 60);
const SITES = new Set(siteCountryCodes());
/** The story text, kept only for a country with a site. */
const keepText = (country: string | null | undefined, text: string | null) => (country && SITES.has(country) ? text : null);
/** Older items are not opened: a story from last month is not news for the draft queue. */
const BODY_MAX_AGE_DAYS = 21;
const itemHash = (url: string) => createHash("sha256").update(normalizeSourceUrl(url)).digest("hex").slice(0, 32);

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
  home_country?: string | null;
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
  let bodyFetches = 0;
  let bodyStories = 0;
  let collectingStories = 0;

  for (const school of schools) {
    try {
      // Hent alle aktive atleter på denne skole
      const athleteResult = await db.query<AthleteRef>(
        `SELECT id, name, sport, home_country FROM athletes WHERE university = ? AND active = 1`,
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
      const titleMatched = new Set(stories.map((s) => normalizeSourceUrl(s.url)));

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
          // Adressen normaliseres FØR hashen: http/https og www betyder intet
          // for hvilken side man er havnet på. Se pipeline/lib/story-url.ts —
          // Nathan Hopley stod to gange i køen 18. september af netop den grund.
          const urlHash = storyHash(story.athlete_id, url);

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
                keepText(athletes.find((a) => a.id === story.athlete_id)?.home_country, contentRaw),
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

      // ── The body pass: new items the title pass did not catch ──────────────
      if (bodyFetches < BODY_FETCHES) {
        const cutoff = Date.now() - BODY_MAX_AGE_DAYS * 86_400_000;
        const items = (await listFeedItems(school.news_feed_url, school.news_feed_type))
          .filter((i) => !titleMatched.has(normalizeSourceUrl(i.link)) && (!i.pubDate || i.pubDate.getTime() >= cutoff));
        const hashes = items.map((i) => itemHash(i.link));
        const seen = new Set(hashes.length
          ? (await db.query<{ url_hash: string }>(
              `SELECT url_hash FROM feed_items_seen WHERE url_hash IN (${hashes.map(() => "?").join(",")})`, hashes)).results.map((r) => r.url_hash)
          : []);
        for (const [n, item] of items.entries()) {
          if (seen.has(hashes[n])) continue;
          if (bodyFetches >= BODY_FETCHES) break;
          bodyFetches++;
          const article = await fetchArticle(item.link);
          await new Promise((r) => setTimeout(r, 500));
          if (!article) continue;          // not reachable now: tried again next run
          let held = false;                // a collecting match over the cap: the item stays unseen for a later run
          for (const m of matchArticle(article, athletes)) {
            const country = (m.athlete as AthleteRef).home_country ?? null;
            const site = !!country && SITES.has(country);
            if (!site && collectingStories >= COLLECTING_STORIES) { held = true; continue; }
            const meta = storyMeta(item.title, item.description, m.relevance_score);
            const res = await db.execute(
              `INSERT OR IGNORE INTO stories
               (athlete_id, source_url, url_hash, headline, summary, content_raw, source_type, relevance_score, sensitive)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [m.athlete.id, item.link, storyHash(m.athlete.id, item.link), item.title, item.description || null,
                keepText(country, article.text), `school_feed_${school.news_feed_type}`, meta.relevance_score, meta.sensitive],
            );
            if (res.meta.changes > 0) { foundInSchool++; totalFound++; bodyStories++; if (!site) collectingStories++; }
          }
          if (held) continue;
          await db.execute(`INSERT OR IGNORE INTO feed_items_seen (url_hash, school_id, seen_at) VALUES (?, ?, datetime('now'))`,
            [hashes[n], school.id]);
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

  console.log(`Brødtekst: ${bodyFetches} artikler åbnet (loft ${BODY_FETCHES}), ${bodyStories} nye historier, heraf ${collectingStories} for indsamlingslande som link (loft ${COLLECTING_STORIES})`);
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
