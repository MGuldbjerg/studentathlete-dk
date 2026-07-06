/**
 * Land → { sprog, region } for ekspansions-kataloget.
 *
 * To-niveau-model (jf. expansion-playbook.md):
 *   - `language` = den REDAKTIONELLE enhed. Én redaktør pr. sprog kan dække en hel
 *     region. Bemærk at "English" med vilje spænder MANGE regioner (UK, Oceania,
 *     Anglophone Africa/Caribbean, Sydasien) — dem kan Mikkel selv redigere.
 *   - `region` = den VEJLEDENDE pool-markedsenhed (default-poolen). Store lande
 *     graduerer til eget site via beslutningstræet VED LAUNCH ud fra faktiske tal;
 *     små same-language-naboer forbliver poolet. Ingen demotion — kun pool→eget-site.
 *
 * Land-navnene matcher outputtet fra `classifyHometown` (report/country-normalize.ts).
 * Mappet er et STARTPUNKT — juster region-grupperinger når katalog-tallene er inde.
 */

export interface MarketProfile {
  /** Redaktionel enhed (én redaktør pr. sprog). */
  language: string;
  /** Vejledende pool-markedsenhed. */
  region: string;
}

const M = (language: string, region: string): MarketProfile => ({ language, region });

const COUNTRY_MARKET: Record<string, MarketProfile> = {
  // ── Norden (samme kulturelle klynge; naboskandinavisk kan evt. deles) ──
  Denmark: M("Danish", "Nordics"),
  Sweden: M("Swedish", "Nordics"),
  Norway: M("Norwegian", "Nordics"),
  Finland: M("Finnish", "Nordics"),
  Iceland: M("Icelandic", "Nordics"),

  // ── Engelsk-sprogede (Mikkel redigerer selv — nul oversættelse) ──
  // Irland poolet ALDRIG under et britisk brand (historisk/politisk følsomhed).
  UK: M("English", "United Kingdom"),
  Ireland: M("English", "Ireland"),
  Australia: M("English", "Oceania"),
  "New Zealand": M("English", "Oceania"),
  "South Africa": M("English", "Anglophone Africa"),
  Nigeria: M("English", "Anglophone Africa"),
  Kenya: M("English", "Anglophone Africa"),
  Ghana: M("English", "Anglophone Africa"),
  Zimbabwe: M("English", "Anglophone Africa"),
  Tanzania: M("English", "Anglophone Africa"),
  Ethiopia: M("English", "Anglophone Africa"),
  Jamaica: M("English", "Anglophone Caribbean"),
  "Trinidad and Tobago": M("English", "Anglophone Caribbean"),
  Bahamas: M("English", "Anglophone Caribbean"),
  Barbados: M("English", "Anglophone Caribbean"),
  Bermuda: M("English", "Anglophone Caribbean"),
  India: M("English", "South & Southeast Asia"),
  Singapore: M("English", "South & Southeast Asia"),
  Philippines: M("English", "South & Southeast Asia"),

  // ── Tysk (DACH) ──
  Germany: M("German", "DACH"),
  Austria: M("German", "DACH"),
  Switzerland: M("German", "DACH"),

  // ── Spansk (Spanien standalone-kandidat; Latinamerika = pool m. gradueringer) ──
  Spain: M("Spanish", "Spain"),
  Mexico: M("Spanish", "Latin America"),
  Argentina: M("Spanish", "Latin America"),
  Colombia: M("Spanish", "Latin America"),
  Chile: M("Spanish", "Latin America"),
  Venezuela: M("Spanish", "Latin America"),
  Ecuador: M("Spanish", "Latin America"),
  Peru: M("Spanish", "Latin America"),
  Uruguay: M("Spanish", "Latin America"),
  Paraguay: M("Spanish", "Latin America"),
  Bolivia: M("Spanish", "Latin America"),
  Cuba: M("Spanish", "Latin America"),
  "Dominican Republic": M("Spanish", "Latin America"),
  "Puerto Rico": M("Spanish", "Latin America"),

  // ── Portugisisk (Brasilien og Portugal er kulturelt distinkte → ikke poolet) ──
  Brazil: M("Portuguese", "Brazil"),
  Portugal: M("Portuguese", "Portugal"),

  // ── Fransk (Frankrig standalone; frankofon Afrika/Caribien = pool) ──
  France: M("French", "France"),
  Senegal: M("French", "Francophone Africa"),
  Cameroon: M("French", "Francophone Africa"),
  Haiti: M("French", "Francophone Caribbean"),

  // ── Italiensk ──
  Italy: M("Italian", "Italy"),

  // ── Benelux ──
  Netherlands: M("Dutch", "Benelux"),
  Belgium: M("Dutch/French", "Benelux"),
  Luxembourg: M("French/German", "Benelux"),

  // ── Central- & Østeuropa / Balkan (mest små enkelt-sprogs-pools) ──
  Poland: M("Polish", "Central Europe"),
  "Czech Republic": M("Czech", "Central Europe"),
  Hungary: M("Hungarian", "Central Europe"),
  Slovakia: M("Slovak", "Central Europe"),
  // Balkan: IKKE poolet — nyere krige/etniske spændinger (Serbien/Kroatien/Bosnien/
  // Kosovo). Hvert land står alene (deler heller ikke redaktør trods BCMS-nærhed).
  Slovenia: M("Slovenian", "Slovenia"),
  Croatia: M("Croatian", "Croatia"),
  Serbia: M("Serbian", "Serbia"),
  Bosnia: M("Bosnian", "Bosnia"),
  "North Macedonia": M("Macedonian", "North Macedonia"),
  Montenegro: M("Montenegrin", "Montenegro"),
  Albania: M("Albanian", "Albania"),
  Kosovo: M("Albanian", "Kosovo"),
  Romania: M("Romanian", "Eastern Europe"),
  Bulgaria: M("Bulgarian", "Eastern Europe"),
  Greece: M("Greek", "Eastern Europe"),
  Ukraine: M("Ukrainian", "Eastern Europe"),
  Belarus: M("Russian", "Eastern Europe"),
  Moldova: M("Romanian", "Eastern Europe"),
  Russia: M("Russian", "Eastern Europe"),
  Latvia: M("Latvian", "Baltics"),
  Lithuania: M("Lithuanian", "Baltics"),
  Estonia: M("Estonian", "Baltics"),
  Turkey: M("Turkish", "Turkey"),
  Cyprus: M("Greek", "Eastern Europe"),
  Malta: M("English", "Malta"),

  // ── Nordafrika & Mellemøsten ──
  Egypt: M("Arabic", "MENA"),
  Morocco: M("Arabic/French", "MENA"),
  Israel: M("Hebrew", "Israel"),   // aldrig poolet med arabiske stater
  Iran: M("Persian", "Iran"),      // persisk, ikke arabisk — egen enhed
  Iraq: M("Arabic", "MENA"),
  "Saudi Arabia": M("Arabic", "MENA"),
  UAE: M("Arabic", "MENA"),
  Qatar: M("Arabic", "MENA"),
  Jordan: M("Arabic", "MENA"),
  Lebanon: M("Arabic", "MENA"),

  // ── Østasien ──
  Japan: M("Japanese", "East Asia"),
  "South Korea": M("Korean", "East Asia"),
  China: M("Chinese", "East Asia"),
  Taiwan: M("Chinese", "East Asia"),

  // ── Syd- & Sydøstasien (ikke-engelsk) ──
  Thailand: M("Thai", "South & Southeast Asia"),
  Malaysia: M("Malay", "South & Southeast Asia"),
  Indonesia: M("Indonesian", "South & Southeast Asia"),

  // ── Deprioriteret (hjemlige medier dækker allerede NCAA — jf. gap-testen) ──
  Canada: M("English", "Canada"),
};

const UNKNOWN: MarketProfile = { language: "Unknown", region: "Unknown" };

/** Slå sprog + region op for et normaliseret landnavn. */
export function marketFor(country: string): MarketProfile {
  return COUNTRY_MARKET[country] ?? UNKNOWN;
}

/** Normalisér et navn til dedup-nøgle: lowercase + samlet whitespace. */
export function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
