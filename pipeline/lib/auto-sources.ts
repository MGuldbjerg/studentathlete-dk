/**
 * Opretter automatisk overvågningskilder for en atlet baseret på deres skole.
 * Bruges efter seed/scrape for at sætte story discovery op.
 */

import type { D1Client } from "./d1-client";
import type { School } from "./types";

export async function createSourcesForAthlete(
  db: D1Client,
  athleteId: number,
  university: string,
  sport: string,
): Promise<void> {
  const result = await db.query<School>(
    "SELECT * FROM schools WHERE name = ?",
    [university],
  );

  if (result.results.length === 0) return;

  const school = result.results[0];
  if (!school.website) return;

  const sportSlug = sport.toLowerCase().replace(/\s+/g, "-");

  // Google News RSS — token-fri kilde der overvåger nyheder om atleten
  const athleteResult = await db.query<{ name: string }>(
    "SELECT name FROM athletes WHERE id = ?",
    [athleteId],
  );
  const athleteName = athleteResult.results[0]?.name;

  const sourceUrls: Array<{ url: string; type: "athletics_page" | "rss" | "google_news" }> = [
    { url: `${school.website}/sports/${sportSlug}/news`, type: "athletics_page" },
    { url: `${school.website}/sports/${sportSlug}/news?feed=rss`, type: "rss" },
  ];

  if (athleteName) {
    const encodedName = encodeURIComponent(`"${athleteName}"`);
    sourceUrls.push({
      url: `https://news.google.com/rss/search?q=${encodedName}&hl=en-US&gl=US&ceid=US:en`,
      type: "google_news",
    });
  }

  for (const source of sourceUrls) {
    try {
      const interval = source.type === "google_news" ? 12 : 6;
      await db.execute(
        `INSERT OR IGNORE INTO sources (athlete_id, school_id, url, source_type, check_interval_hours)
         VALUES (?, ?, ?, ?, ?)`,
        [athleteId, school.id, source.url, source.type, interval],
      );
    } catch {
      // IGNORE — duplikat URL
    }
  }
}

/**
 * Opret kilder for alle atleter der endnu ikke har nogen.
 */
export async function backfillSources(db: D1Client): Promise<number> {
  const athletes = await db.query<{
    id: number;
    university: string;
    sport: string;
  }>(
    `SELECT a.id, a.university, a.sport
     FROM athletes a
     LEFT JOIN sources s ON s.athlete_id = a.id
     WHERE a.active = 1 AND s.id IS NULL`,
  );

  for (const athlete of athletes.results) {
    await createSourcesForAthlete(
      db,
      athlete.id,
      athlete.university,
      athlete.sport,
    );
  }

  return athletes.results.length;
}
