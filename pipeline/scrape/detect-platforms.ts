/**
 * Detekterer hvilken platform hver skoles athletics-site kører på.
 * Bruges til at vælge den rette parser og URL-mønster i roster-scraping.
 *
 * Prøver flere URL-mønstre:
 *   1. /sports/football/roster (Sidearm standard)
 *   2. /sports/mens-basketball/roster (Sidearm med køns-prefix)
 *   3. /roster.aspx?path=mbball (PrestoSports)
 *
 * Kør med: npx tsx pipeline/scrape/detect-platforms.ts [--limit N]
 */

import { createD1Client } from "../lib/d1-client";
import type { School } from "../lib/types";

const USER_AGENT = "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

type PlatformType = "sidearm" | "wmt_digital" | "wordpress" | "prestosports" | "custom" | "unknown";

interface PlatformSignature {
  type: PlatformType;
  markers: string[];
}

const PLATFORM_SIGNATURES: PlatformSignature[] = [
  {
    type: "sidearm",
    markers: ["sidearm-roster", "sidearmsports.com", "sidearm_base_url", "sidearmstats"],
  },
  {
    type: "wmt_digital",
    markers: ["wmtdigital", "wmt-roster", "wmt_"],
  },
  {
    type: "prestosports",
    markers: ["prestosports.com", "prestosports", "roster.aspx"],
  },
  {
    type: "wordpress",
    markers: ["wp-content", "wp-includes", "wordpress"],
  },
];

/** URL-mønstre at prøve for at detektere platform, i prioriteret rækkefølge */
const PROBE_PATHS = [
  "/sports/football/roster",
  "/sports/mens-basketball/roster",
  "/roster.aspx?path=mbball",
  "/sports/basketball/roster",
  "/sports/mens-soccer/roster",
];

function detectPlatform(html: string): PlatformType {
  const lower = html.toLowerCase();

  // JS-renderede sider har typisk meget lille body
  if (html.length < 500 && (lower.includes("app") || lower.includes("root"))) {
    return "wmt_digital";
  }

  for (const sig of PLATFORM_SIGNATURES) {
    if (sig.markers.some((marker) => lower.includes(marker))) {
      return sig.type;
    }
  }

  return "custom";
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(4000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function parseArgs(): { limit: number; recheck: boolean } {
  const args = process.argv.slice(2);
  let limit = 200;
  let recheck = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 200;
    }
    if (args[i] === "--recheck-unknown") {
      recheck = true;
    }
  }

  return { limit, recheck };
}

async function main(): Promise<void> {
  const { limit, recheck } = parseArgs();
  const db = createD1Client();

  console.log(`Detekterer platforme (limit: ${limit}, recheck: ${recheck})...\n`);

  // Når --recheck-unknown: tjek skoler der stadig er 'unknown' med flere URL-mønstre
  const whereClause = recheck
    ? "platform_type = 'unknown'"
    : "(platform_type IS NULL OR platform_type = 'unknown') AND platform_detected_at IS NULL";

  const result = await db.query<School>(
    `SELECT * FROM schools
     WHERE website IS NOT NULL AND ${whereClause}
     ORDER BY id
     LIMIT ?`,
    [limit],
  );

  const schools = result.results;
  if (schools.length === 0) {
    console.log("Ingen skoler at tjekke.");
    return;
  }

  console.log(`Tjekker ${schools.length} skole(r)...\n`);

  const counts: Record<string, number> = {};
  let checked = 0;
  let failed = 0;

  for (const school of schools) {
    try {
      await Promise.race([
        (async () => {
          let platform: PlatformType = "unknown";

          // Prøv alle URL-mønstre indtil vi finder en der virker
          for (const path of PROBE_PATHS) {
            const testUrl = `${school.website}${path}`;
            const html = await fetchPage(testUrl);
            if (html) {
              platform = detectPlatform(html);
              break;
            }
          }

          if (platform === "unknown") {
            failed++;
          }

          await db.execute(
            `UPDATE schools SET platform_type = ?, platform_detected_at = datetime('now')
             WHERE id = ?`,
            [platform, school.id],
          );

          counts[platform] = (counts[platform] ?? 0) + 1;
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Iteration timeout")), 60000)),
      ]);
    } catch (err) {
      console.error(`  Timeout/fejl for ${school.name}: ${err}`);
      failed++;
    }

    checked++;

    if (checked % 50 === 0) {
      console.log(`  Tjekket ${checked}/${schools.length}...`);
    }

    // Rate limiting: 1 sekund mellem requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nResultat: ${checked} skoler tjekket, ${failed} stadig unknown`);
  console.log("\nPlatform-fordeling:");
  for (const [platform, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${platform}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Platform-detektion fejlede:", err);
  process.exit(1);
});
