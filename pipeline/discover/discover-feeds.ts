/**
 * Opdager nyhedsfeeds for skoler der har aktive atleter.
 * Prøver URL-mønstre baseret på skolens platform_type.
 * Kør med: npx tsx pipeline/discover/discover-feeds.ts [--limit N]
 */

import { createD1Client } from "../lib/d1-client";
import type { School } from "../lib/types";
import { pipelineUserAgent } from "../../src/lib/site";

const USER_AGENT =
  pipelineUserAgent();

interface SchoolWithCount extends School {
  athlete_count: number;
}

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);
  let limit = 50;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 50;
    }
  }

  return { limit };
}

/** Normalisér website-URL: fjern /index.aspx, /index.html og trailing slashes */
function normalizeWebsite(url: string): string {
  return url.replace(/\/index\.(aspx|html?|php)$/i, "").replace(/\/+$/, "");
}

/** Generér kandidat-URL'er baseret på platform_type */
function getCandidateUrls(
  website: string,
  platformType: string | null,
): Array<{ url: string; type: "rss" | "html" }> {
  const base = normalizeWebsite(website);

  // Platform-specifikke prioriteringer
  if (platformType === "sidearm") {
    return [
      { url: `${base}/rss.aspx`, type: "rss" },
      { url: `${base}/rss`, type: "rss" },
      { url: `${base}/rss/index`, type: "rss" },
      { url: `${base}/archives`, type: "html" },
      { url: `${base}/news`, type: "html" },
    ];
  }

  if (platformType === "wordpress") {
    return [
      { url: `${base}/feed`, type: "rss" },
      { url: `${base}/rss`, type: "rss" },
      { url: `${base}/sports/all/news`, type: "html" },
      { url: `${base}/news`, type: "html" },
    ];
  }

  if (platformType === "prestosports") {
    return [
      { url: `${base}/news`, type: "html" },
      { url: `${base}/rss.aspx`, type: "rss" },
      { url: `${base}/feed`, type: "rss" },
    ];
  }

  // Generisk/unknown — prøv Sidearm-mønstre først (mest udbredt), derefter resten
  return [
    { url: `${base}/rss.aspx`, type: "rss" },
    { url: `${base}/rss`, type: "rss" },
    { url: `${base}/feed`, type: "rss" },
    { url: `${base}/rss/index`, type: "rss" },
    { url: `${base}/archives`, type: "html" },
    { url: `${base}/sports/all/news`, type: "html" },
    { url: `${base}/news`, type: "html" },
  ];
}

/** Validér om et svar er en ægte RSS/Atom-feed */
function isValidRss(body: string): boolean {
  return body.includes("<item>") || body.includes("<entry>");
}

/** Validér om et svar er en brugbar HTML-nyhedsside */
function isValidHtml(body: string): boolean {
  return body.length > 1024;
}

async function probeUrl(
  url: string,
  expectedType: "rss" | "html",
): Promise<{ ok: boolean; detectedType: "rss" | "html" }> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!response.ok) return { ok: false, detectedType: expectedType };

    const body = await response.text();

    // Et "html"-forsøg kan vise sig at være RSS
    if (isValidRss(body)) return { ok: true, detectedType: "rss" };
    if (expectedType === "rss") return { ok: false, detectedType: "rss" };
    if (isValidHtml(body)) return { ok: true, detectedType: "html" };

    return { ok: false, detectedType: expectedType };
  } catch {
    return { ok: false, detectedType: expectedType };
  }
}

async function main(): Promise<void> {
  const { limit } = parseArgs();
  const db = createD1Client();

  // Alle skoler med website men uden news_feed_url
  // Prioritér skoler med aktive atleter, derefter resten
  const result = await db.query<SchoolWithCount>(
    `SELECT s.*,
            (SELECT COUNT(*) FROM athletes a WHERE a.university = s.name AND a.active = 1) as athlete_count
     FROM schools s
     WHERE s.news_feed_url IS NULL
       AND s.website IS NOT NULL
     ORDER BY athlete_count DESC, s.name ASC
     LIMIT ?`,
    [limit],
  );

  const schools = result.results;

  if (schools.length === 0) {
    console.log("Alle skoler med aktive atleter har allerede en feed-URL.");
    return;
  }

  console.log(
    `Prøver at finde nyhedsfeeds for ${schools.length} skole(r)...\n`,
  );

  let found = 0;
  let notFound = 0;

  for (const school of schools) {
    if (!school.website) continue;

    const candidates = getCandidateUrls(school.website, school.platform_type ?? null);
    let feedFound = false;

    for (const candidate of candidates) {
      const { ok, detectedType } = await probeUrl(candidate.url, candidate.type);

      // Log probe-forsøg
      try {
        await db.execute(
          `INSERT OR REPLACE INTO url_probes (school_id, url, purpose, http_status, result, response_size)
           VALUES (?, ?, 'feed_discovery', ?, ?, 0)`,
          [school.id, candidate.url, ok ? 200 : 0, ok ? "ok" : "not_found"],
        );
      } catch {
        // url_probes-logging er ikke kritisk
      }

      if (ok) {
        await db.execute(
          `UPDATE schools SET news_feed_url = ?, news_feed_type = ? WHERE id = ?`,
          [candidate.url, detectedType, school.id],
        );
        console.log(
          `  ${school.name}: ${detectedType.toUpperCase()} → ${candidate.url}`,
        );
        found++;
        feedFound = true;
        break;
      }

      // Rate limiting mellem probes
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!feedFound) {
      console.log(`  ${school.name}: Ingen feed fundet`);
      notFound++;
    }

    // Rate limiting mellem skoler
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(
    `\nFærdig. Fandt feeds for ${found} skoler, ${notFound} uden feed.`,
  );
}

main().catch((err) => {
  console.error("Feed-opdagelse fejlede:", err);
  process.exit(1);
});
