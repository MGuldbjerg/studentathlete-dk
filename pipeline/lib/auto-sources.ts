/**
 * Opretter automatisk Google News-overvågningskilder per atlet.
 * Skole-baserede feeds håndteres af discover-feeds.ts + check-sources.ts.
 */

import type { D1Client } from "./d1-client";

export async function createSourcesForAthlete(
  db: D1Client,
  athleteId: number,
): Promise<void> {
  const athleteResult = await db.query<{ name: string }>(
    "SELECT name FROM athletes WHERE id = ?",
    [athleteId],
  );
  const athleteName = athleteResult.results[0]?.name;
  if (!athleteName) return;

  // Hent school_id for referencen
  const schoolResult = await db.query<{ id: number }>(
    `SELECT s.id FROM schools s
     JOIN athletes a ON a.university = s.name
     WHERE a.id = ?`,
    [athleteId],
  );
  const schoolId = schoolResult.results[0]?.id ?? null;

  const encodedName = encodeURIComponent(`"${athleteName}"`);
  const googleUrl = `https://news.google.com/rss/search?q=${encodedName}&hl=en-US&gl=US&ceid=US:en`;

  try {
    await db.execute(
      `INSERT OR IGNORE INTO sources (athlete_id, school_id, url, source_type, check_interval_hours)
       VALUES (?, ?, ?, 'google_news', 12)`,
      [athleteId, schoolId, googleUrl],
    );
  } catch {
    // Duplikat — forventet
  }
}

/**
 * Opret Google News-kilder for alle atleter der endnu ikke har nogen.
 */
export async function backfillSources(db: D1Client): Promise<number> {
  const athletes = await db.query<{ id: number }>(
    `SELECT a.id
     FROM athletes a
     LEFT JOIN sources s ON s.athlete_id = a.id AND s.source_type = 'google_news'
     WHERE a.active = 1 AND s.id IS NULL`,
  );

  for (const athlete of athletes.results) {
    await createSourcesForAthlete(db, athlete.id);
  }

  return athletes.results.length;
}
