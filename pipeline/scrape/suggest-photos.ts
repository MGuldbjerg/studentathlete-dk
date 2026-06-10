/**
 * Foto-forslag (IDEA-billeder.md niveau 2): hent headshot-URL fra atletens
 * OFFICIELLE bio-side (athletes.bio_url) → læg i photo_suggestions-køen til
 * godkendelse i admin → Fotos. Identiteten er sikker by construction: fotoet
 * sidder på atletens egen bio-side. Regelbaseret, ingen LLM, fail-soft pr. atlet.
 *
 * Kredit forudfyldes "Foto: <University> Athletics" (korrekt for roster-fotos;
 * Mikkel kan rette i admin før godkendelse).
 *
 * Kør:  npx tsx pipeline/scrape/suggest-photos.ts
 *       npx tsx pipeline/scrape/suggest-photos.ts --dry-run --limit 10
 */
import * as cheerio from "cheerio";
import { createD1Client } from "../lib/d1-client";

interface AthleteRow {
  id: number;
  name: string;
  university: string;
  bio_url: string;
}

function parseArgs(): { limit: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let limit = 25;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) limit = parseInt(args[i + 1], 10) || 25;
  }
  return { limit, dryRun: args.includes("--dry-run") };
}

/** Afvis logoer/pladsholdere/vektorer — vi vil have et rigtigt headshot eller intet. */
export function isLikelyHeadshot(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return false;
  if (/(logo|placeholder|default|missing|silhouette|icon|favicon|og-default)/.test(lower)) return false;
  return true;
}

/**
 * Find headshot-URL i bio-sidens HTML, prioriteret:
 *   1. Sidearm-spillerbillede (.sidearm-roster-player-image img m.fl.)
 *   2. og:image (de fleste Sidearm/CMS-bio-sider sætter den til spillerfotoet)
 */
export function extractHeadshotUrl(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);
  const candidates: string[] = [];

  for (const sel of [
    ".sidearm-roster-player-image img",
    ".sidearm-roster-player-fields img",
    "img.sidearm-roster-player-headshot",
    ".roster-player-image img",
    ".player-headshot img",
  ]) {
    const src = $(sel).first().attr("data-src") ?? $(sel).first().attr("src");
    if (src) candidates.push(src);
  }

  const og = $('meta[property="og:image"]').attr("content");
  if (og) candidates.push(og);

  for (const c of candidates) {
    try {
      const abs = new URL(c, pageUrl).toString();
      if (isLikelyHeadshot(abs)) return abs;
    } catch {
      /* ugyldig URL — næste kandidat */
    }
  }
  return null;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudentAthleteBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { limit, dryRun } = parseArgs();
  const db = createD1Client();

  // Aktive atleter uden foto, med bio-side, uden åbent/godkendt forslag
  const athletes = await db.query<AthleteRow>(
    `SELECT a.id, a.name, a.university, a.bio_url
     FROM athletes a
     WHERE a.active = 1
       AND a.bio_url IS NOT NULL
       AND (a.photo_url IS NULL OR a.photo_url = '')
       AND NOT EXISTS (
         SELECT 1 FROM photo_suggestions ps
         WHERE ps.athlete_id = a.id AND ps.status IN ('pending', 'approved')
       )
     ORDER BY a.name LIMIT ?`,
    [limit],
  );

  console.log(`${athletes.results.length} atlet(er) uden foto med bio-side`);
  let suggested = 0;

  for (const athlete of athletes.results) {
    const html = await fetchPage(athlete.bio_url);
    const imageUrl = html ? extractHeadshotUrl(html, athlete.bio_url) : null;
    if (!imageUrl) {
      console.log(`– ${athlete.name}: intet headshot fundet på bio-siden`);
      continue;
    }
    const credit = `Foto: ${athlete.university} Athletics`;
    if (dryRun) {
      console.log(`(dry-run) ${athlete.name}: ${imageUrl} [${credit}]`);
      suggested++;
      continue;
    }
    const result = await db.execute(
      `INSERT OR IGNORE INTO photo_suggestions (athlete_id, image_url, credit, source_url)
       VALUES (?, ?, ?, ?)`,
      [athlete.id, imageUrl, credit, athlete.bio_url],
    );
    if ((result.meta?.changes ?? 0) > 0) {
      suggested++;
      console.log(`✓ ${athlete.name}: forslag oprettet`);
    } else {
      console.log(`⏭ ${athlete.name}: forslag fandtes allerede (afvist tidligere?)`);
    }
  }

  console.log(`\nFærdig: ${suggested} foto-forslag klar til godkendelse i admin → Fotos.`);
}

if (process.argv[1] && process.argv[1].endsWith("suggest-photos.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
