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

/**
 * Udtræk historier fra en RSS/Atom-feed der nævner atleten.
 */
async function extractFromRss(
  feedUrl: string,
  athleteName: string,
): Promise<ExtractedStory[]> {
  const xml = await fetchPage(feedUrl);
  if (!xml) return [];

  const $ = cheerio.load(xml, { xml: true });
  const stories: ExtractedStory[] = [];
  const lastName = athleteName.split(" ").pop()?.toLowerCase() ?? "";

  // RSS 2.0 items
  $("item").each((_, el) => {
    const title = $(el).find("title").text().trim();
    const link = $(el).find("link").text().trim();
    const description = $(el).find("description").text().trim();

    const searchText = `${title} ${description}`.toLowerCase();
    if (!searchText.includes(lastName)) return;

    if (link) {
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

    if (link) {
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
 * Hovedfunktion: udtræk historier fra en kilde.
 */
export async function extractStories(
  sourceUrl: string,
  athleteName: string,
  sourceType: string,
): Promise<ExtractedStory[]> {
  if (sourceType === "rss") {
    return extractFromRss(sourceUrl, athleteName);
  }
  return extractFromHtml(sourceUrl, athleteName);
}
