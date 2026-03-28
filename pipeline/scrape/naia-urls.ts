/**
 * Finder athletics-URL'er for NAIA-skoler uden website.
 * Crawler naia.org/member-schools for at matche skoler i databasen.
 *
 * Kør med: npx tsx pipeline/scrape/naia-urls.ts
 * Lav prioritet — kør manuelt efter behov.
 */

import * as cheerio from "cheerio";
import { createD1Client } from "../lib/d1-client";

const USER_AGENT = "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

interface NaiaSchool {
  name: string;
  url: string;
}

async function fetchNaiaDirectory(): Promise<NaiaSchool[]> {
  const url = "https://www.naia.org/member-schools";
  console.log(`Henter NAIA-katalog: ${url}`);

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`NAIA fetch fejlede (${response.status})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const schools: NaiaSchool[] = [];

  // NAIA lister skoler som links — prøv flere selektorer
  $("a[href*='athletics'], a[href*='sports'], a[href*='.edu']").each((_, el) => {
    const href = $(el).attr("href");
    const name = $(el).text().trim();
    if (href && name && name.length > 2) {
      schools.push({ name, url: href });
    }
  });

  // Fallback: alle links i school-list områder
  if (schools.length < 50) {
    $(".member-schools a, .school-list a, table a").each((_, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 2 && href.startsWith("http")) {
        schools.push({ name, url: href });
      }
    });
  }

  return schools;
}

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/university|college|of|the/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function main(): Promise<void> {
  const db = createD1Client();

  // Hent NAIA-skoler uden website
  const result = await db.query<{ id: number; name: string; common_name: string | null }>(
    `SELECT id, name, common_name FROM schools
     WHERE division = 'NAIA' AND website IS NULL`,
  );

  const dbSchools = result.results;
  if (dbSchools.length === 0) {
    console.log("Alle NAIA-skoler har allerede en website.");
    return;
  }

  console.log(`${dbSchools.length} NAIA-skoler mangler website.\n`);

  let naiaDirectory: NaiaSchool[];
  try {
    naiaDirectory = await fetchNaiaDirectory();
    console.log(`Fandt ${naiaDirectory.length} skoler i NAIA-kataloget.\n`);
  } catch (err) {
    console.error(`Kunne ikke hente NAIA-katalog: ${err}`);
    console.log("Prøv at køre igen senere.");
    return;
  }

  // Match database-skoler mod NAIA-kataloget
  let matched = 0;

  for (const dbSchool of dbSchools) {
    const dbNorm = normalizeForMatch(dbSchool.common_name ?? dbSchool.name);

    const match = naiaDirectory.find((ns) => {
      const naiaNorm = normalizeForMatch(ns.name);
      return naiaNorm.includes(dbNorm) || dbNorm.includes(naiaNorm);
    });

    if (match) {
      await db.execute(
        "UPDATE schools SET website = ? WHERE id = ?",
        [match.url, dbSchool.id],
      );
      console.log(`  ${dbSchool.name} → ${match.url}`);
      matched++;
    }
  }

  console.log(`\nMatchede ${matched} af ${dbSchools.length} NAIA-skoler.`);
  console.log(`${dbSchools.length - matched} skoler mangler stadig URL.`);
}

main().catch((err) => {
  console.error("NAIA URL-scraping fejlede:", err);
  process.exit(1);
});
