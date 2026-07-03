/**
 * Discovers Google News RSS stories for known Danish college athletes.
 * Searches by the athlete's full name (quoted), then confirms identity with the
 * precise matchAthletes() scorer + an LLM verification step (verify-story.ts) to
 * filter name doppelgängers.
 *
 * Usage:
 *   npx tsx pipeline/discover/google-news.ts [--max-age-days N] [--limit N] [--dry-run]
 *
 * Env required: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID
 *   plus at least one LLM key (MISTRAL_API_KEY / GEMINI_API_KEY / GROQ_API_KEY) for verification.
 */

import { createHash } from "crypto";
import * as cheerio from "cheerio";
import { createD1Client } from "../lib/d1-client";
import { ProviderChain } from "../lib/llm/provider-chain";
import { matchAthletes, isBlockedDomain } from "./extract-story";
import { detectSensitive } from "./sensitive";
import { verifyStory } from "./verify-story";

// ── Constants ────────────────────────────────────────────────────────────────

const USER_AGENT =
  "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

/** Maks. antal LLM-verifikationer per kørsel (beskytter gratis daglige LLM-grænser). */
const VERIFY_CAP = 200;

// ── Argument parsing ─────────────────────────────────────────────────────────

interface CliArgs {
  maxAgeDays: number;
  limit: number;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let maxAgeDays = 14;
  let limit = 50;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-age-days" && args[i + 1]) {
      maxAgeDays = parseInt(args[i + 1], 10) || 14;
      i++;
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 50;
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { maxAgeDays, limit, dryRun };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface AthleteRow {
  id: number;
  name: string;
  sport: string | null;
  university: string;
  hometown: string | null;
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date | null;
  sourceUrl: string | null; // publisher-URL fra <source url="..."> (Google News-redirect skjuler domænet)
}

// ── Google News RSS helpers ──────────────────────────────────────────────────

/**
 * Build a Google News RSS URL for a single athlete — quoted full name ONLY.
 * Adding (university OR sport) makes those terms required in Google News and
 * destroys recall; identity is instead confirmed by matchAthletes() + verifyStory().
 */
function buildGoogleNewsUrl(athlete: AthleteRow): string {
  const q = encodeURIComponent(`"${athlete.name}"`);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

/** Parse a date string from RSS pubDate, returning null when unparseable. */
function parsePubDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** Fetch a Google News RSS feed and return parsed items. */
async function fetchRssItems(url: string): Promise<RssItem[]> {
  let xml: string;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.warn(`  RSS fetch failed (${response.status}): ${url}`);
      return [];
    }
    xml = await response.text();
  } catch (err) {
    console.warn(`  RSS fetch error: ${err}`);
    return [];
  }

  const $ = cheerio.load(xml, { xml: true });
  const items: RssItem[] = [];

  $("item").each((_, el) => {
    const title = $(el).find("title").text().trim();
    const link = $(el).find("link").text().trim();
    const description = $(el).find("description").text().trim();
    const pubDateStr = $(el).find("pubDate").text().trim();
    const pubDate = parsePubDate(pubDateStr);
    const sourceUrl = $(el).find("source").attr("url") ?? null;

    if (link) {
      items.push({ title, link, description, pubDate, sourceUrl });
    }
  });

  return items;
}

// ── Main pipeline ────────────────────────────────────────────────────────────

export async function main(): Promise<void> {
  const { maxAgeDays, limit, dryRun } = parseArgs();
  const db = createD1Client();
  const chain = new ProviderChain(db); // til LLM-verifikation af kandidater
  const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000);

  console.log(
    `Google News RSS discovery — max-age-days=${maxAgeDays}, limit=${limit}${dryRun ? ", DRY-RUN" : ""}`,
  );
  console.log(`Cutoff date: ${cutoff.toISOString()}\n`);

  // 1. Fetch athletes from D1
  const athleteResult = await db.query<AthleteRow>(
    `SELECT id, name, sport, university, hometown
     FROM athletes
     WHERE active = 1
     ORDER BY updated_at DESC
     LIMIT ?`,
    [limit],
  );
  const athletes = athleteResult.results;
  console.log(`Loaded ${athletes.length} athlete(s) from DB.\n`);

  // 2. Per-athlete search
  let totalProcessed = 0;
  let totalCandidates = 0;
  let totalStored = 0;
  let totalRejected = 0;
  let verifications = 0;

  for (const athlete of athletes) {
    const rssUrl = buildGoogleNewsUrl(athlete);
    const items = await fetchRssItems(rssUrl);

    for (const item of items) {
      // Date filter
      if (item.pubDate && item.pubDate < cutoff) continue;

      // Skip stats/obituary/non-news publishers (the school-feed path blocks the same
      // domains). Google News redirects hide the domain, so check the <source> URL.
      if (item.sourceUrl && isBlockedDomain(item.sourceUrl)) continue;
      if (/\b(obituary|obituaries|memorial|funeral|in memoriam)\b/i.test(item.title)) continue;

      // Relevance check via precise matcher (also confirms the name actually appears).
      // matchAthletes() enforces MIN_RELEVANCE internally.
      const searchText = `${item.title} ${item.description}`;
      const matches = matchAthletes(searchText, [
        { id: athlete.id, name: athlete.name, sport: athlete.sport ?? undefined },
      ]);
      if (matches.length === 0) continue;
      const { relevance_score } = matches[0];

      if (dryRun) {
        totalCandidates++;
        console.log(
          `  [DRY-RUN] ${athlete.name} | score=${relevance_score} | ${item.title.slice(0, 80)}`,
        );
        continue;
      }

      // Dedup: spring URLs over vi allerede har gemt (undgå at re-verificere dagligt)
      const urlHash = createHash("sha256").update(item.link).digest("hex");
      const existing = await db.query<{ n: number }>(
        "SELECT 1 as n FROM stories WHERE url_hash = ? LIMIT 1",
        [urlHash],
      );
      if (existing.results.length > 0) continue;

      totalCandidates++;

      // Navnematch i uddraget ≠ identitetsmatch — Google News er åbent web og fuldt af
      // navnedobbeltgængere (politikere, nekrologer, andre atleter). Verificér ALLE nye
      // kandidater via LLM (sport/skole/hjemby). Fail-open: kun et sikkert "nej" (≥0.6) afviser.
      if (verifications < VERIFY_CAP) {
        verifications++;
        const verdict = await verifyStory(
          { headline: item.title, summary: item.description },
          {
            name: athlete.name,
            sport: athlete.sport ?? undefined,
            university: athlete.university,
            hometown: athlete.hometown ?? undefined,
          },
          chain,
        );
        if (!verdict.isAboutAthlete && verdict.confidence >= 0.6) {
          totalRejected++;
          console.log(
            `  [SKIP] ${athlete.name} | LLM afviste (${verdict.confidence.toFixed(2)}): ${verdict.reason}`,
          );
          continue;
        }
      }

      try {
        // Presseetik-flag — Google News er netop kilden der kan surface negative
        // historier (anholdelse, disciplin, dødsfald). Se sensitive.ts.
        const sensitive = detectSensitive(`${item.title} ${item.description}`);
        await db.execute(
          `INSERT OR IGNORE INTO stories
             (athlete_id, source_url, url_hash, headline, summary, content_raw, source_type, relevance_score, sensitive)
           VALUES (?, ?, ?, ?, ?, ?, 'google_news_rss', ?, ?)`,
          [
            athlete.id,
            item.link,
            urlHash,
            item.title,
            item.description || null,
            null, // content_raw — Google News links redirect; leave empty
            relevance_score,
            sensitive?.type ?? null,
          ],
        );
        totalStored++;
        console.log(
          `  [NEW] ${athlete.name} | score=${relevance_score} | ${item.title.slice(0, 80)}`,
        );
      } catch {
        // Duplicate url_hash (UNIQUE constraint) — expected via INSERT OR IGNORE
      }
    }

    totalProcessed++;

    // Polite delay between athletes
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 3. Summary
  console.log("\n── Summary ──────────────────────────────────────────────");
  console.log(`Athletes processed : ${totalProcessed}`);
  console.log(`New candidates     : ${totalCandidates}`);
  if (dryRun) {
    console.log(`Stored (dry-run)   : 0 (dry-run mode — no writes)`);
  } else {
    console.log(`LLM verifications  : ${verifications}`);
    console.log(`Rejected by LLM    : ${totalRejected}`);
    console.log(`Stories stored     : ${totalStored}`);
  }
}

main().catch((err) => {
  console.error("Google News discovery failed:", err);
  process.exit(1);
});
