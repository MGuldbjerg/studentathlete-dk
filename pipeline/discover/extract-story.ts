/**
 * Udtrækker historier fra en webside eller RSS-feed.
 * Filtrerer for omtaler af en specifik atlet (efternavn-match).
 */

import * as cheerio from "cheerio";

export interface ExtractedStory {
  url: string;
  headline: string;
  summary: string | null;
  content: string | null;
}

const USER_AGENT =
  "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

/**
 * Domæner der udelukkende indeholder stats/profiler — ingen artikel-indhold.
 * Stories fra disse domæner filtreres fra inden de gemmes i databasen.
 */
const BLOCKED_DOMAINS = [
  "espn.com",
  "transfermarkt.",
  "fiba.basketball",
  "nfl.com",
  "pro-football-reference.com",
  "sports-reference.com",
  "baseball-reference.com",
  "basketball-reference.com",
  "hockey-reference.com",
  "profootballhof.com",
  "profootballreference.com",
  "statmuse.com",
  "sofascore.com",
  "soccerway.com",
  "whoscored.com",
  "fbref.com",
  "lineups.com",
  "legacy.com",        // nekrologer
  "findagrave.com",    // gravsteder
  "ancestry.com",
];

export function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Udtræk historier fra en HTML-side ved at lede efter links der nævner atleten.
 */
async function extractFromHtml(
  url: string,
  athleteName: string,
): Promise<ExtractedStory[]> {
  const html = await fetchPage(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const stories: ExtractedStory[] = [];
  const nameParts = athleteName.toLowerCase().split(" ");
  const lastName = nameParts[nameParts.length - 1];

  // Find nyhedslinks der nævner atleten
  $("a[href]").each((_, el) => {
    const $el = $(el);
    const text = $el.text().toLowerCase();
    const href = $el.attr("href");
    if (!href) return;

    // Match på efternavn i linktekst eller omgivende tekst
    const parentText = $el.parent().text().toLowerCase();
    if (!text.includes(lastName) && !parentText.includes(lastName)) return;

    // Filtrer navigation-links og tomme links
    const linkText = $el.text().trim();
    if (linkText.length < 10) return;

    try {
      const absoluteUrl = new URL(href, url).toString();

      // Undgå duplikater
      if (stories.some((s) => s.url === absoluteUrl)) return;

      stories.push({
        url: absoluteUrl,
        headline: linkText,
        summary: null,
        content: null,
      });
    } catch {
      // Ugyldig URL — ignorer
    }
  });

  return stories;
}

/** Parser en dato-streng fra RSS pubDate eller Atom published/updated. */
function parsePubDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Udtræk historier fra en RSS/Atom-feed der nævner atleten.
 * @param maxAgeDays - Afvis artikler ældre end N dage (undefined = ingen grænse)
 */
async function extractFromRss(
  feedUrl: string,
  athleteName: string,
  maxAgeDays?: number,
): Promise<ExtractedStory[]> {
  const xml = await fetchPage(feedUrl);
  if (!xml) return [];

  const $ = cheerio.load(xml, { xml: true });
  const stories: ExtractedStory[] = [];
  const lastName = athleteName.split(" ").pop()?.toLowerCase() ?? "";
  const cutoff = maxAgeDays ? new Date(Date.now() - maxAgeDays * 86_400_000) : null;

  // RSS 2.0 items
  $("item").each((_, el) => {
    const title = $(el).find("title").text().trim();
    const link = $(el).find("link").text().trim();
    const description = $(el).find("description").text().trim();

    const searchText = `${title} ${description}`.toLowerCase();
    if (!searchText.includes(lastName)) return;

    if (cutoff) {
      const pubDate = parsePubDate($(el).find("pubDate").text().trim());
      if (pubDate && pubDate < cutoff) return; // For gammel
    }

    if (link && !isBlockedDomain(link)) {
      stories.push({
        url: link,
        headline: title,
        summary: description || null,
        content: null,
      });
    }
  });

  // Atom entries
  $("entry").each((_, el) => {
    const title = $(el).find("title").text().trim();
    const link = $(el).find('link[rel="alternate"]').attr("href") ||
      $(el).find("link").attr("href") || "";
    const summary = $(el).find("summary").text().trim();

    const searchText = `${title} ${summary}`.toLowerCase();
    if (!searchText.includes(lastName)) return;

    if (cutoff) {
      const dateStr = $(el).find("published").text().trim() || $(el).find("updated").text().trim();
      const pubDate = parsePubDate(dateStr);
      if (pubDate && pubDate < cutoff) return; // For gammel
    }

    if (link && !isBlockedDomain(link)) {
      stories.push({
        url: link,
        headline: title,
        summary: summary || null,
        content: null,
      });
    }
  });

  return stories;
}

/**
 * Udtræk det fulde indhold fra en artikelside.
 * Bruges til at berige en story med content_raw før artikelgenerering.
 */
export async function fetchStoryContent(url: string): Promise<string | null> {
  const html = await fetchPage(url);
  if (!html) return null;

  const $ = cheerio.load(html);

  // Fjern navigation, footer, scripts, styles
  $("nav, footer, script, style, iframe, .ad, .advertisement").remove();

  // Forsøg at finde artikelindholdet
  const selectors = [
    "article",
    '[role="main"]',
    ".article-body",
    ".story-body",
    ".entry-content",
    ".post-content",
    "main",
  ];

  for (const selector of selectors) {
    const content = $(selector).text().trim();
    if (content.length > 200) return content;
  }

  // Fallback: hele body
  const bodyText = $("body").text().trim();
  return bodyText.length > 200 ? bodyText : null;
}

/**
 * Hovedfunktion: udtræk historier fra en kilde (per-atlet).
 */
export async function extractStories(
  sourceUrl: string,
  athleteName: string,
  sourceType: string,
  maxAgeDays?: number,
): Promise<ExtractedStory[]> {
  if (sourceType === "rss") {
    return extractFromRss(sourceUrl, athleteName, maxAgeDays);
  }
  return extractFromHtml(sourceUrl, athleteName);
}

// ── Skole-baseret matching (ny) ──────────────────────────────────────

export interface SchoolStoryMatch extends ExtractedStory {
  athlete_id: number;
  relevance_score: number;
}

interface AthleteRef {
  id: number;
  name: string;
}

/** Udtræk efternavn (sidste ord) fra et atletnavn */
function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

/** Match en tekst mod en liste af atleter. Returnér matches med relevance_score. */
function matchAthletes(
  text: string,
  athletes: AthleteRef[],
): Array<{ athlete: AthleteRef; relevance_score: number }> {
  const lowerText = text.toLowerCase();
  const matches: Array<{ athlete: AthleteRef; relevance_score: number }> = [];

  for (const athlete of athletes) {
    const lastName = getLastName(athlete.name);
    if (lastName.length < 2) continue;

    if (!lowerText.includes(lastName)) continue;

    // Fuldt navn giver højere score
    const fullName = athlete.name.toLowerCase();
    const relevance = lowerText.includes(fullName) ? 80 : 40;

    matches.push({ athlete, relevance_score: relevance });
  }

  return matches;
}

/** Udtræk alle nyhedsposter fra en RSS-feed (uden atlet-filtrering) */
function parseRssItems(xml: string): Array<{ title: string; link: string; description: string }> {
  const $ = cheerio.load(xml, { xml: true });
  const items: Array<{ title: string; link: string; description: string }> = [];

  // RSS 2.0
  $("item").each((_, el) => {
    const title = $(el).find("title").text().trim();
    const link = $(el).find("link").text().trim();
    const description = $(el).find("description").text().trim();
    if (link) items.push({ title, link, description });
  });

  // Atom
  $("entry").each((_, el) => {
    const title = $(el).find("title").text().trim();
    const link =
      $(el).find('link[rel="alternate"]').attr("href") ||
      $(el).find("link").attr("href") ||
      "";
    const summary = $(el).find("summary").text().trim();
    if (link) items.push({ title, link, description: summary });
  });

  return items;
}

/** Udtræk alle nyhedslinks fra en HTML-side (uden atlet-filtrering) */
function parseHtmlLinks(
  html: string,
  baseUrl: string,
): Array<{ title: string; link: string; description: string }> {
  const $ = cheerio.load(html);
  const links: Array<{ title: string; link: string; description: string }> = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (!href) return;

    const linkText = $el.text().trim();
    if (linkText.length < 10) return;

    try {
      const absoluteUrl = new URL(href, baseUrl).toString();
      if (seen.has(absoluteUrl)) return;
      seen.add(absoluteUrl);

      const parentText = $el.parent().text().trim();
      links.push({
        title: linkText,
        link: absoluteUrl,
        description: parentText !== linkText ? parentText : "",
      });
    } catch {
      // Ugyldig URL
    }
  });

  return links;
}

/**
 * Udtræk historier fra en skoles feed og match mod alle atleter på skolen.
 * Returnér matches med athlete_id påhæftet.
 */
export async function extractStoriesForSchool(
  feedUrl: string,
  feedType: "rss" | "html",
  athletes: AthleteRef[],
): Promise<SchoolStoryMatch[]> {
  const body = await fetchPage(feedUrl);
  if (!body) return [];

  const items =
    feedType === "rss"
      ? parseRssItems(body)
      : parseHtmlLinks(body, feedUrl);

  const results: SchoolStoryMatch[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const searchText = `${item.title} ${item.description} ${item.link}`;
    const matches = matchAthletes(searchText, athletes);

    for (const { athlete, relevance_score } of matches) {
      // Dedupliker: samme URL + same atlet
      const key = `${item.link}::${athlete.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      results.push({
        url: item.link,
        headline: item.title,
        summary: item.description || null,
        content: null,
        athlete_id: athlete.id,
        relevance_score,
      });
    }
  }

  return results;
}
