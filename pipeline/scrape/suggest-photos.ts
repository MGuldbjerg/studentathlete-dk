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

import { pipelineUserAgent } from "../../src/lib/site";
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
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!Number.isNaN(n)) limit = n;
    }
  }
  return { limit, dryRun: args.includes("--dry-run") };
}

/** Afvis logoer/pladsholdere/vektorer — vi vil have et rigtigt headshot eller intet. */
export function isLikelyHeadshot(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return false;
  if (/(logos?|placeholder|default|missing|silhouette|icon|favicon|og-default|site\.|_edu)/.test(lower))
    return false;
  return true;
}

/** Normalisér navn/tekst til løs token-sammenligning (små bogstaver, fjern diakritik/tegn). */
function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Identitets-vagt for og:image: et og:image kan vise en HOLDKAMMERAT eller et logo
 * (set i praksis: UNCG's Hector Nissen-bio gav "Lars.png"/"Lars Frafjord"). Accepter
 * kun hvis atletens efternavn optræder i billed-URL'en (afkodet) eller og:image:alt.
 */
function nameMatches(imageUrl: string, ogAlt: string, athleteName: string): boolean {
  const tokens = normName(athleteName).split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return true; // intet brugbart navn at matche på → lad være med at blokere
  const lastName = tokens[tokens.length - 1];
  let decoded = imageUrl;
  try {
    decoded = decodeURIComponent(imageUrl);
  } catch {
    /* behold rå */
  }
  const haystack = normName(`${decoded} ${ogAlt}`);
  return haystack.includes(lastName);
}

/**
 * Find headshot-URL i bio-sidens HTML, prioriteret:
 *   1. Sidearm-spillerbillede-selektorer (positionsbaseret på atletens egen side → stoles på)
 *   2. og:image — KUN hvis navne-matchet (kan ellers være holdkammerat/logo)
 */
export function extractHeadshotUrl(html: string, pageUrl: string, athleteName = ""): string | null {
  const $ = cheerio.load(html);

  // 1) Spillerbillede-selektorer (på en korrekt renderet bio-side er dette netop
  //    sidens atlet). Plain fetch udfylder dem sjældent på JS-sider, men når de
  //    findes, er de mere pålidelige end og:image.
  for (const sel of [
    ".sidearm-roster-player-image img",
    ".sidearm-roster-player-fields img",
    "img.sidearm-roster-player-headshot",
    ".roster-player-image img",
    ".player-headshot img",
  ]) {
    const src = $(sel).first().attr("data-src") ?? $(sel).first().attr("src");
    if (src) {
      try {
        const abs = new URL(src, pageUrl).toString();
        if (isLikelyHeadshot(abs)) return abs;
      } catch {
        /* ugyldig URL */
      }
    }
  }

  // 2) og:image-fallback — navne-gated mod forkert-person/logo
  const og =
    $('meta[property="og:image"]').attr("content") ?? $('meta[name="og:image"]').attr("content");
  const ogAlt =
    $('meta[property="og:image:alt"]').attr("content") ??
    $('meta[name="og:image:alt"]').attr("content") ??
    "";
  if (og) {
    try {
      const abs = new URL(og, pageUrl).toString();
      if (isLikelyHeadshot(abs) && nameMatches(abs, ogAlt, athleteName)) return abs;
    } catch {
      /* ugyldig URL */
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
      headers: { "User-Agent": pipelineUserAgent() },
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
    const imageUrl = html ? extractHeadshotUrl(html, athlete.bio_url, athlete.name) : null;
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
