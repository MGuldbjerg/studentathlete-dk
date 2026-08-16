/**
 * Udtrækker historier fra en webside eller RSS-feed.
 * Filtrerer for omtaler af en specifik atlet (efternavn-match).
 */

import * as cheerio from "cheerio";
import { detectHonor, HONORS_BOOST } from "./honors";
import { detectSensitive } from "./sensitive";
import { pipelineUserAgent } from "../../src/lib/site";

export interface ExtractedStory {
  url: string;
  headline: string;
  summary: string | null;
  content: string | null;
}

const USER_AGENT =
  pipelineUserAgent();

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
  return extractMainText(html);
}

/**
 * Hent rå HTML (links bevaret — modsat fetchStoryContent/content_raw, der returnerer
 * ren tekst). Bruges af box-score-berigelsen til at scanne kildesiden for box-score-links.
 * NB: box scores er FAKTA-kilder, ikke artikel-kilder, så isBlockedDomain gælder bevidst
 * IKKE den efterfølgende box-score-hentning (sports-reference/statmuse m.fl. er ønskede her).
 */
export async function fetchHtml(url: string): Promise<string | null> {
  return fetchPage(url);
}

/**
 * Udtræk hovedindholdet (ren tekst) fra en HTML-streng. Genbruges af både plain
 * fetch og CF Browser Rendering (rendered HTML) i backfill.
 */
export function extractMainText(html: string): string | null {
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
 * Fjern HTML-markup, så tekst inde i ATTRIBUTTER ikke tæller som omtale.
 *
 * Baggrund (2026-08-16, kladde #107): RSS-feedets `description` starter med
 * `<img alt="Mackenzie Mackreth" ...>`. Atletens navn stod IKKE ét eneste sted
 * i selve nyheden — kun i billedets alt-tekst. Alligevel gav matcheren fuldt
 * navn = 90 point, og identitetsvagten fandt fornavnet og lod historien passere.
 * Resultatet var en artikel om en spiller kilden aldrig nævner: opfundet rolle,
 * opfundet cheftræner, en kamp beskrevet i datid 16 timer før den blev spillet.
 *
 * Et navn i en alt-tekst betyder "hun er på billedet", ikke "nyheden handler om
 * hende" — feltet fyldes af skolens CMS ud fra det vedhæftede foto. Markup skal
 * derfor væk FØR enhver navne-matchning.
 */
export function stripMarkup(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
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
  /** Presseetik-flag fra detectSensitive() — null for normale historier. */
  sensitive: string | null;
}

interface AthleteRef {
  id: number;
  name: string;
  sport?: string;
}

/** Mindste relevance_score for at en match gemmes (lavere = for usikker). */
export const MIN_RELEVANCE = 30;

/**
 * Tærsklen for at en historie må GENERERES — højere end tærsklen for at blive
 * fundet.
 *
 * 35 = kun efternavnet stod i teksten. Det er fint til overvågning, men det er
 * ikke identifikation: 2026-08-06 blev en Hall of Fame-artikel om Paul Grant
 * (1970'erne) skrevet som en nyhed om førsteårsstuderende Iolo Grant, og en
 * ansættelse af volleyballspilleren Bella Murray blev til en nyhed om
 * fodboldspilleren Josh Murray. Begge scorede 35.
 *
 * 60 kræver enten fornavn, fuldt navn eller efternavn + sportskontekst — altså
 * mindst ét holdepunkt ud over et efternavn to mennesker kan dele.
 */
export const MIN_RELEVANCE_GENERATE = 60;

/**
 * Meget almindelige danske efternavne. Et match på KUN efternavnet er her
 * for usikkert (kan være en anden person, træner el. lign.) — kræv fornavn/fuldt navn.
 */
const COMMON_SURNAMES = new Set([
  "hansen", "nielsen", "jensen", "pedersen", "andersen", "christensen",
  "larsen", "sørensen", "sorensen", "rasmussen", "jørgensen", "jorgensen",
  "petersen", "madsen", "kristensen", "olsen", "thomsen", "christiansen",
  "poulsen", "johansen", "møller", "moller", "mortensen", "knudsen",
  "jakobsen", "jacobsen", "mikkelsen", "schmidt",
]);

/** Sport (dansk label i db) → engelske nøgleord der bekræfter konteksten i et US-feed. */
/**
 * Sportsord i kildeteksten → bekræftelse af et efternavns-match.
 *
 * Nøglerne SKAL være de kanoniske NCAA-slugs (`athletes.sport`, se
 * src/lib/sports.ts). De var danske ("fodbold", "atletik") og matchede derfor
 * INGENTING efter motor-refaktoren 2026-08-03 — sport-tieren var død for
 * fodbold, atletik, svømning, roning, ishockey og gymnastik, altså over
 * halvdelen af atleterne.
 */
const SPORT_KEYWORDS: Record<string, string[]> = {
  soccer: ["soccer"],
  football: ["football", "gridiron"],
  basketball: ["basketball", "hoops"],
  "swimming-and-diving": ["swim", "diving", "natation"],
  tennis: ["tennis"],
  golf: ["golf"],
  rowing: ["rowing", "crew"],
  "track-and-field": ["track", "cross country", "athletics", "distance", "field"],
  "ice-hockey": ["hockey"],
  volleyball: ["volleyball"],
  baseball: ["baseball"],
  gymnastics: ["gymnastics"],
  other: [],
};

/** Sportsord slået op pr. sport — bruges også af identitetsvagten. */
export function sportKeywords(sport: string | null | undefined): string[] {
  return SPORT_KEYWORDS[(sport ?? "").toLowerCase()] ?? [];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Hele-ord-match (Unicode-bevidst). Forhindrer at "lund" matcher "Lundqvist"
 * eller "englund". \p{L} dækker også ø/å/æ, så danske navne brydes korrekt.
 */
function containsWord(haystackLower: string, needleLower: string): boolean {
  if (!needleLower) return false;
  const re = new RegExp(
    `(^|[^\\p{L}])${escapeRegex(needleLower)}([^\\p{L}]|$)`,
    "u",
  );
  return re.test(haystackLower);
}

/**
 * Match en tekst mod en liste af atleter med bekræftelse for at undgå navnedobbeltgængere.
 * Score: fuldt navn 90 · fornavn+efternavn 80 · efternavn+sport-kontekst 60 · kun efternavn 35.
 * Almindelige efternavne kræver fornavn/fuldt navn (ellers droppes de).
 *
 * Markup fjernes først: et navn i en alt-tekst er ikke en omtale (se stripMarkup).
 */
export function matchAthletes(
  text: string,
  athletes: AthleteRef[],
): Array<{ athlete: AthleteRef; relevance_score: number }> {
  const lowerText = stripMarkup(text).toLowerCase();
  const matches: Array<{ athlete: AthleteRef; relevance_score: number }> = [];

  for (const athlete of athletes) {
    const parts = athlete.name.trim().toLowerCase().split(/\s+/);
    const lastName = parts[parts.length - 1];
    const firstName = parts.length > 1 ? parts[0] : "";
    if (lastName.length < 3) continue; // for korte efternavne = for støjende

    // Krav: efternavnet skal optræde som helt ord
    if (!containsWord(lowerText, lastName)) continue;

    const fullNamePresent = lowerText.includes(athlete.name.toLowerCase());
    const firstNamePresent = firstName.length >= 2 && containsWord(lowerText, firstName);
    const sportKws = athlete.sport ? SPORT_KEYWORDS[athlete.sport] ?? [] : [];
    const sportPresent = sportKws.some((kw) => lowerText.includes(kw));
    const isCommon = COMMON_SURNAMES.has(lastName);

    let score: number;
    if (fullNamePresent) score = 90;
    else if (firstNamePresent) score = 80;
    else if (sportPresent && !isCommon) score = 60;
    else if (!isCommon) score = 35;
    else continue; // almindeligt efternavn uden fornavn/fuldt navn → for risikabelt

    if (score >= MIN_RELEVANCE) matches.push({ athlete, relevance_score: score });
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

    // Hædersbevisninger ("Player of the Week" m.fl.) er stærke artikel-triggere
    // → boost relevance så generate-articles prioriterer dem. Se honors.ts.
    const honor = detectHonor(`${item.title} ${item.description}`);
    // Presseetik-flag: anholdelse/disciplin/spilleberettigelse/dødsfald m.m.
    // kræver ekstra kritisk review + nøgtern generering. Se sensitive.ts.
    const sensitive = detectSensitive(`${item.title} ${item.description}`);

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
        relevance_score: honor
          ? Math.min(100, relevance_score + HONORS_BOOST)
          : relevance_score,
        sensitive: sensitive?.type ?? null,
      });
    }
  }

  return results;
}
