/**
 * Kontrakten for et land. Alt der adskiller ét nationalt site fra et andet skal
 * kunne udtrykkes her — kan noget ikke det, hører det til i motoren.
 */
export interface CountryProfile {
  /** ISO 3166-1 alpha-2, fx "DK". Samme værdi som athletes.home_country. */
  code: string;
  /** Hvilken sprogpakke sitet bruger (src/lib/i18n/). Flere lande kan dele én. */
  language: string;
  /** Kanonisk vært. Bestemmer også 301-redirects og absolutte URL'er. */
  host: string;
  /** Sitets navn i UI, feeds og user-agents. */
  brand: string;
  /**
   * Landets navn på ENGELSK, til schema.org (`nationality`). Her stod
   * «Denmark» hårdkodet i JSON-LD, så britiske atleter blev udgivet som
   * danskere til Google.
   */
  nationalityName: string;
  /**
   * Tillægsordet på SITETS eget sprog ("danske" / "British"). Landenavnet duer
   * til schema.org, men ikke til en sætning: «student athletes from United
   * Kingdom» mangler en artikel, og «fra Denmark» er ikke dansk.
   */
  demonym: string;
  contactEmail: string;
  /** Byer der udpeger en atlet som hjemmehørende (hele ord, med lokale tegn). */
  cities: string[];
  /**
   * Skolens stavemåde → byens rigtige navn på landets eget sprog.
   *
   * Amerikanske rosters skriver enten det engelske eksonym ("Copenhagen") eller
   * en ASCII-foldning af de lokale tegn ("Vaerloese", "Helsingor"). Rå
   * roster-tekst er sand som DATA — den bliver stående i `athletes.hometown` —
   * men den må ikke stå i en dansk sætning på sitet. Nøglen matches uden
   * hensyn til store/små bogstaver.
   *
   * Tabellen er bevidst EKSPLICIT frem for regelbaseret: en generisk
   * "oe→ø, aa→å"-regel ville skrive Aalborg om til Ålborg og Aarhus til Århus,
   * som begge er de FORKERTE former (byerne hedder officielt Aalborg og
   * Aarhus). Dukker en ny foldet stavemåde op i data, tilføjes den her.
   */
  cityAliases?: Record<string, string>;
  /** Eksplicitte landenavne i roster-data, fx "Denmark"/"Danmark". */
  countryMarkers: string[];
  /** Kendte US-steder der ligner landet og skal afvises. */
  falsePositivePatterns: RegExp[];
  /**
   * Dark launch: domænet peger på sitet, men søgemaskiner holdes ude.
   *
   * Et nyt land er live længe før det har sit eget indhold. Bliver det crawlet
   * i mellemtiden, lærer Google det at kende som tyndt — eller som en dublet af
   * standardsitet, hvis motoren endnu ikke filtrerer indholdet på land.
   * Slå fra når sitet har sit eget indhold; det er ét ord og et deploy.
   */
  darkLaunch?: boolean;
  /**
   * Whether the site has published its privacy page (`pages` row with the
   * storage slug `privatliv`). Required, not defaulted: the footer links to it
   * only where this is true, and a new country must decide, not inherit.
   */
  hasPrivacyPage: boolean;
  /**
   * Whether the weekly email digest is open on this site: the sign-up box shows
   * and /api/digest accepts sign-ups. Sent from `contactEmail` through Brevo, so
   * the site's domain must be authenticated there, the Worker needs
   * BREVO_API_KEY_WEB, and the privacy page must describe the digest before
   * this is turned on. Required, not defaulted: a new country must decide.
   */
  emailDigest: boolean;
  /**
   * How many published articles an athlete needs before the profile is PUBLIC,
   * and before it is INDEXED. 0 / 0 = every profile public and indexed.
   *
   * Below `profilePublicMinArticles` a profile answers 404 and is listed
   * nowhere — not on /athletes, school rosters or sport pages — though counts
   * still include it. A school page follows: public only with a public athlete.
   * Between the two numbers a profile is reachable but `noindex, follow`.
   *
   * Required, not defaulted: a profile is a name, a school and roster data, and
   * thousands of them make a site read as thin. UK (Mikkel, 2026-10-12, after
   * AdSense rejected .co.uk for low value content on 2026-10-09): public from
   * 1, indexed from 2. A new country must decide, not inherit.
   */
  profilePublicMinArticles: number;
  profileIndexMinArticles: number;
  /**
   * A draft under this many words is not published as a page: publishing it
   * puts one dated line on the athlete's timeline instead (timeline-entry.ts).
   * 0 = no floor. UK 100 (Mikkel, 2026-10-12; 130 from 2026-10-13): weekly awards and one-line
   * results were a sixth of the site's articles. DK 130 (2026-10-13).
   */
  standaloneMinWords: number;
  /**
   * An indexable page has at least this many words by site-check's floor rule
   * (PLAN-content-floor-uk.md, step 6): profiles, school pages and articles
   * below it are noindex and left out of the sitemap and listings. 0 = no
   * floor. UK 200 (Mikkel, 2026-10-26); DK 0.
   */
  indexMinWords: number;
  /**
   * The rule-based profile text (src/lib/i18n/profile-builders.ts) is approved
   * as a TEMPLATE: pipeline/profiles/apply-template-profiles.ts publishes its
   * output without a per-profile approval in /admin/profiler. It never
   * overwrites a text a person approved or edited (athletes.profile_by_template
   * marks the template's own texts), and it holds a profile whose school
   * changed without a recorded transfer. UK true (Mikkel, 2026-11-04, after
   * the template audit); DK false — the .dk site promises a person reads it.
   */
  profileTemplateApproved: boolean;
  /**
   * Sports with an end-of-season honours page (/statistics/awards/<sport>-<year>,
   * src/lib/season-honours.ts), computed daily by build-stats. UK ["soccer"]
   * (Mikkel, 2026-11-09); DK [] — nine athletes is not a page, and the .dk site
   * promises a person reads what it publishes.
   */
  seasonHonourSports: string[];
}

/**
 * What hometown classification needs — a site profile has it, and so does a
 * COLLECTING country (countries/collecting.ts), which has no domain yet.
 */
export type HometownProfile = Pick<CountryProfile, "code" | "cities" | "countryMarkers" | "falsePositivePatterns">;
