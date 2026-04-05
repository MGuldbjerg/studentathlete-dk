/**
 * Opretter automatisk Google News-overvågningskilder per atlet.
 * Skole-baserede feeds håndteres af discover-feeds.ts + check-sources.ts.
 */

import type { D1Client } from "./d1-client";

function buildGoogleNewsUrl(athleteName: string, university: string | null): string {
  // Søg på "Fornavn Efternavn" "Universitetsnavnet" — reducerer false positives markant
  const query = university
    ? `"${athleteName}" "${university}"`
    : `"${athleteName}"`;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

export async function createSourcesForAthlete(
  db: D1Client,
  athleteId: number,
): Promise<void> {
  const athleteResult = await db.query<{ name: string; university: string | null }>(
    "SELECT name, university FROM athletes WHERE id = ?",
    [athleteId],
  );
  const athlete = athleteResult.results[0];
  if (!athlete?.name) return;

  // Hent school_id for referencen
  const schoolResult = await db.query<{ id: number }>(
    `SELECT s.id FROM schools s
     JOIN athletes a ON a.university = s.name
     WHERE a.id = ?`,
    [athleteId],
  );
  const schoolId = schoolResult.results[0]?.id ?? null;

  const googleUrl = buildGoogleNewsUrl(athlete.name, athlete.university);

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
 * Opdater også eksisterende sources der mangler universitetsnavnet i URL'en.
 */
export async function backfillSources(db: D1Client): Promise<number> {
  // 1. Opret manglende sources
  const missing = await db.query<{ id: number }>(
    `SELECT a.id
     FROM athletes a
     LEFT JOIN sources s ON s.athlete_id = a.id AND s.source_type = 'google_news'
     WHERE a.active = 1 AND s.id IS NULL`,
  );
  for (const athlete of missing.results) {
    await createSourcesForAthlete(db, athlete.id);
  }

  // 2. Opdater eksisterende sources der bruger det gamle URL-format (kun navn, intet universitet)
  const outdated = await db.query<{ id: number; name: string; university: string | null }>(
    `SELECT s.id, a.name, a.university
     FROM sources s
     JOIN athletes a ON s.athlete_id = a.id
     WHERE s.source_type = 'google_news'
       AND a.university IS NOT NULL
       AND s.url NOT LIKE '%' || replace(a.university, ' ', '%') || '%'`,
  );
  for (const row of outdated.results) {
    const newUrl = buildGoogleNewsUrl(row.name, row.university);
    await db.execute(`UPDATE sources SET url = ? WHERE id = ?`, [newUrl, row.id]);
  }

  return missing.results.length + outdated.results.length;
}
