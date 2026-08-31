/**
 * SPORT-INVENTAR: hvilke hold har skolen egentlig?
 * ================================================
 *
 * Problemet dette løser. Scraperen gættede roster-URL'er ud fra en fast liste på
 * tolv sportsgrene × tre navnevarianter. Det gav tre fejl på én gang:
 *
 *  1. **Spøgelses-sporten.** Santa Clara har ikke fodbold, Loyola ikke baseball,
 *     High Point droppede tennis. Et korrekt "det hold findes ikke" blev skrevet
 *     i basen som `error`. Stikprøve på 14 skoler: 65% af alle fejl var af denne
 *     type. Vi brugte altså størstedelen af kørslens requests på hold der ikke
 *     findes — og kunne ikke se forskel på "vi fejlede" og "der er intet".
 *
 *  2. **Det usynlige kvindehold.** `roster_checks` havde UNIQUE(school_id, sport),
 *     så en skole kunne kun have ÉN tennis-række. Gætte-løkken brød ved første
 *     URL der svarede — typisk herreholdet. Resultatet stod sort på hvidt i
 *     basen: 32 mandlige basketballspillere og NUL kvindelige, 165 mandlige
 *     fodboldspillere mod 22 kvindelige. Kvindeholdene blev aldrig hentet.
 *
 *  3. **De sportsgrene vi aldrig spurgte om.** Lacrosse, water polo, softball,
 *     beach volleyball, cross country som selvstændigt hold — de stod ikke på
 *     listen, så en dansker der ror eller løber cross country var usynlig
 *     uanset hvor godt parseren virkede.
 *
 * Løsningen er at spørge skolen selv. Sidearm-sites udgiver deres eget sitemap
 * (ofte `/sitemap/sitemap_roster_1.xml`), og der står den præcise liste af
 * `/sports/<hold>/roster` — med de rigtige kønsprefixer og de sportsgrene vi
 * ikke kendte. Ét request pr. skole erstatter 36 gæt.
 *
 * Modulet her er RENT: ingen fetch, ingen D1. Det gør sitemap-XML til hold, og
 * hold til kanoniske sportsnøgler. `sport-inventory.ts` står for I/O.
 */

import { SPORT_KEYS, sportKeyFromSource, type SportKey } from "../../src/lib/sports";

export interface DiscoveredTeam {
  /** Skolens egen slug: "womens-rowing". Nøglen på inventar-rækken. */
  teamSlug: string;
  /** Kanonisk sportsnøgle (kan være "other" for lacrosse, water polo m.fl.). */
  sport: SportKey;
  /** "m" | "f" | null når holdets navn ikke siger det (fx "football"). */
  gender: "m" | "f" | null;
  rosterUrl: string;
  /**
   * Nyeste sæson vi har set for holdet, når kilden siger det.
   *
   * Roster-sitemappet lister én URL PR. SÆSON (`/roster/2013` … `/roster/2026`),
   * og det er guld: står den nyeste sæson år tilbage, er programmet henlagt, og
   * holdet skal ikke tjekkes hver uge. null = kilden sagde ingenting om sæson.
   */
  latestSeason: number | null;
}

/**
 * Slugs der matcher roster-mønsteret men ikke er et hold med atleter.
 * "general" er Sidearms egen container for sitets fælles sider.
 */
const NOT_A_TEAM = new Set([
  "general",
  "staff",
  "coaches",
  "administration",
  "athletic-training",
  "sports-medicine",
  "strength-and-conditioning",
  "composite",
  "all-access",
  "sports",
  // Tilføjet 2026-08-19: rosterlister der ikke er hold. SAAC er skolens
  // studenterudvalg — dets medlemmer ER typisk atleter, men rækken siger ikke
  // hvilken sport, og en atlet uden sport hører ikke til i registret (Mikkel).
  // Tre sådanne "atleter" lå i registret, indtil de blev slettet samme dag.
  "saac",
  "student-athlete-advisory-committee",
  "student-athlete-advisory-council",
  "strength-conditioning",
  "hall-of-fame",
  "band",
  "pep-band",
  "spirit-band",
  "facilities",
  "ticketing",
  "marketing",
  "compliance",
  "sports-information",
  "media-relations",
  "development",
  "trainers",
]);

/**
 * Køn ud fra holdets navn. **Kvinde-mønstre testes FØRST**: "womens" indeholder
 * "mens", så den omvendte rækkefølge gør hvert kvindehold til et herrehold
 * (samme fælde som `genderFromTeamUrl` i src/lib/gender.ts).
 */
export function genderFromTeamSlug(slug: string): "m" | "f" | null {
  const s = slug.toLowerCase();
  if (/(^|-)(womens?|w)(-|$)/.test(s) || s.startsWith("womens")) return "f";
  if (/(^|-)(mens?|m)(-|$)/.test(s) || s.startsWith("mens")) return "m";
  // Sportsgrene der kun findes for ét køn i NCAA — køn er data, ikke gæt, men
  // her ER navnet oplysningen.
  if (s === "softball" || s === "field-hockey") return "f";
  return null;
}

/** Fjern kønsprefiks, så "womens-swimming-and-diving" slår op som svømning. */
export function stripGenderPrefix(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/^(womens?|mens?)-/, "")
    .replace(/^(w|m)-/, "");
}

/** Kanonisk sportsnøgle for et holdnavn. Ukendt hold → "other" (aldrig et gæt). */
export function sportFromTeamSlug(slug: string): SportKey {
  return sportKeyFromSource(stripGenderPrefix(slug));
}

/** Er dette et rigtigt hold? */
export function isTeamSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  if (!s || NOT_A_TEAM.has(s)) return false;
  return !NOT_A_TEAM.has(stripGenderPrefix(s));
}

/**
 * `/sports/<hold>/roster` og ALT hvad der ligger under den.
 *
 * Vigtig rettelse (2026-08-17): en tidligere version krævede at stien SLUTTEDE
 * ved `/roster`. Det gav nul hold på skoler som Loyola, hvis roster-sitemap kun
 * indeholder sæson-URL'er (`/roster/2013` … `/roster/2026`) og aldrig den bare
 * form. Spiller-bio'er (`/roster/john-doe/1234`) udpeger også et hold, og de
 * ligger i skolens `sitemap_player_1.xml` — så præfiks-match er både rigtigere
 * og bredere. Den URL vi GEMMER er altid den kanoniske forside uden sæson.
 */
// PrestoSports lægger SÆSONEN mellem hold og roster: `/sports/msoc/2026-27/roster`.
// Sidearm har den efter: `/sports/mens-soccer/roster/2026`. Junior colleges
// kører overvejende Presto, og uden det midterste led fandt vi nul hold på dem
// — sitet så tomt ud, selvom holdmenuen stod lige der (calhounathletics.com,
// 31/8: 15 hold, 0 genkendt).
const ROSTER_PATH =
  /\/sports\/([a-z0-9][a-z0-9-]*)\/(?:(?:19|20)\d{2}(?:-\d{2,4})?\/)?roster(?:\/|\?|#|$)/i;
/** Sæsonen når den står FØR `/roster` (Presto). */
const ROSTER_SEASON_BEFORE = /\/sports\/[a-z0-9][a-z0-9-]*\/((?:19|20)\d{2})(?:-\d{2,4})?\/roster/i;
/** Sæson i en roster-URL: `/roster/2026` eller `/roster/2026-27`. */
const ROSTER_SEASON = /\/roster\/((?:19|20)\d{2})(?:-\d{2,4})?(?:\/|\?|#|$)/i;

/** Hold ud fra en roster-URL. null hvis URL'en ikke peger på en roster. */
export function teamFromRosterUrl(url: string): DiscoveredTeam | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const path = u.pathname + (u.search || "");
  const m = ROSTER_PATH.exec(path);
  if (!m) return null;
  const teamSlug = m[1].toLowerCase();
  if (!isTeamSlug(teamSlug)) return null;
  const before = ROSTER_SEASON_BEFORE.exec(path);
  const season = before ?? ROSTER_SEASON.exec(path);
  return {
    teamSlug,
    sport: sportFromTeamSlug(teamSlug),
    gender: genderFromTeamSlug(teamSlug),
    // Sidearm normaliseres til formen uden sæson. Presto må IKKE: dér er
    // sæsonen en del af adressen, og `/sports/msoc/roster` svarer 404
    // (verificeret på calhounathletics.com). Vi beholder derfor sæsonleddet
    // præcis som skolen skrev det — inventaret opdaterer URL'en igen næste
    // gang det kører, så den følger med sæsonskiftet.
    rosterUrl: before
      ? `${u.origin}/sports/${teamSlug}/${before[0].split("/")[3]}/roster`
      : `${u.origin}/sports/${teamSlug}/roster`,
    latestSeason: season ? parseInt(season[1], 10) : null,
  };
}

/** Alle <loc>-værdier i et sitemap eller sitemapindex, som absolutte URL'er. */
export function locsFromXml(xml: string, base: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    try {
      out.push(new URL(m[1].replace(/&amp;/g, "&"), base).toString());
    } catch {
      // Ugyldig URL i skolens sitemap — spring over.
    }
  }
  return out;
}

/** Er dette et sitemap-INDEX (peger på andre sitemaps) frem for et sitemap? */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * Hvilke under-sitemaps er værd at hente? Sidearm navngiver dem efter indhold
 * (`sitemap_roster_1.xml`, `sitemap_player_1.xml`, `sitemap_story_1.xml`), så vi
 * henter roster/player/sport og lader nyhedsarkivet ligge — ellers ville et
 * enkelt sitemapindex koste 20 requests for at finde de samme hold.
 */
export function rosterSitemaps(xml: string, base: string): string[] {
  const all = locsFromXml(xml, base).filter((u) => /\.xml($|\?)/i.test(u));
  const wanted = all.filter((u) => /roster|player|sport|team/i.test(u));
  return wanted.length > 0 ? wanted : all.slice(0, 4);
}

/** Saml hold og behold den NYESTE sæson vi har set for hvert af dem. */
function collect(urls: string[]): DiscoveredTeam[] {
  const byslug = new Map<string, DiscoveredTeam>();
  for (const url of urls) {
    const team = teamFromRosterUrl(url);
    if (!team) continue;
    const prev = byslug.get(team.teamSlug);
    if (!prev) {
      byslug.set(team.teamSlug, team);
    } else if ((team.latestSeason ?? 0) > (prev.latestSeason ?? 0)) {
      prev.latestSeason = team.latestSeason;
    }
  }
  return [...byslug.values()];
}

/** Hold fra et sitemap-dokument, deduplikeret på holdnavn. */
export function teamsFromXml(xml: string, base: string): DiscoveredTeam[] {
  return collect(locsFromXml(xml, base));
}

/**
 * Hold fra en HTML-side — skolens egen sport-navigation.
 *
 * Den bredeste kilde vi har: Sidearm renderer hele holdmenuen server-side på
 * hver side, også på skoler hvor `/sitemap.xml` slet ikke findes (Santa Claras
 * sitemap-URL svarer med en 404-HTML-side, og der stod holdene alligevel — i
 * menuen). Ét request til forsiden giver derfor holdlisten, uanset platform.
 */
export function teamsFromHtml(html: string, base: string): DiscoveredTeam[] {
  const urls: string[] = [];
  const re =
    /(?:href|content)\s*=\s*["']([^"']*\/sports\/[a-z0-9][a-z0-9-]*\/(?:(?:19|20)\d{2}(?:-\d{2,4})?\/)?roster[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      urls.push(new URL(m[1].replace(/&amp;/g, "&"), base).toString());
    } catch {
      // Ugyldigt href — spring over.
    }
  }
  return collect(urls);
}

/**
 * Sportsgrene skolen IKKE har — det negative register.
 *
 * Kun kanoniske nøgler kan stå på listen: vi kan sige "Loyola har ikke
 * gymnastik", men ikke "Loyola har ikke lacrosse", for lacrosse har ingen egen
 * nøgle (det ville stå som "other", og "other" kan ikke være fraværende).
 * "other" udelades derfor bevidst.
 */
export function unsponsoredSports(found: DiscoveredTeam[]): SportKey[] {
  const have = new Set(found.map((t) => t.sport));
  return SPORT_KEYS.filter((k) => k !== "other" && !have.has(k));
}
