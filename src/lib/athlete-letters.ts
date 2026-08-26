/**
 * Atlet-oversigten opdelt på forbogstav.
 *
 * Hvorfor: /atleter listede ALLE atleter på én side — 2.343 links på .co.uk.
 * Det er både en tung side for læseren og et svagt knudepunkt for Google, som
 * er den eneste vej ind til profilerne. Bogstavsiderne giver hver profil en
 * kort, tematisk vej ind (/athletes/a → 241 links i stedet for 2.343).
 *
 * Bogstavet er FØRSTE tegn i det viste navn — det læseren selv ser i listen,
 * og samme akse som sorteringen "efter navn" i forvejen bruger.
 *
 * Rene funktioner, ingen D1: den fulde liste er allerede hentet af siden, og
 * sortering/opdeling i JS håndterer Æ/Ø/Å rigtigt. SQLite's `upper()` er
 * ASCII-only og ville lægge "Østergaard" i en rest-bunke.
 */
import { languagePack, routePath } from "./i18n";
import { generateSlug } from "./slug";
import type { Athlete } from "./types";

/** Forbogstavet i et navn, med sprogets egne versaler. Tom streng hvis tomt. */
export function letterOf(name: string | null | undefined, lang: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  return trimmed.slice(0, 1).toLocaleUpperCase(languagePack(lang).locale);
}

/**
 * Bogstavets URL-slug. Genbruger `generateSlug`, så dansk Ø bliver "oe" —
 * samme translitteration som atleternes egne slugs, og ingen procent-kodede
 * adresser i sitemappet.
 */
export function letterSlug(letter: string, lang: string): string {
  return generateSlug(letter, 4, lang);
}

/** Sitets alfabet — sprogpakkens, ikke et gæt. */
export function alphabetFor(lang: string): string[] {
  return languagePack(lang).alphabet;
}

/**
 * Slug → bogstav. Kun bogstaver der FINDES i sprogets alfabet accepteres, så
 * /athletes/<vilkårlig-streng> ikke bliver til en tom bogstavside der findes
 * på hver eneste adresse.
 */
export function letterFromSlug(slug: string, lang: string): string | null {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  for (const letter of alphabetFor(lang)) {
    if (letterSlug(letter, lang) === s) return letter;
  }
  return null;
}

/**
 * Antal atleter pr. forbogstav. Bogstaver uden atleter mangler i kortet.
 *
 * Tager kun `name`, ikke en hel `Athlete`: sitemappet tæller på en let
 * projektion (slug + navn + aktiv) og skal ikke hente hele rækken for at
 * kunne spørge om et forbogstav.
 */
export function countByLetter(
  athletes: { name: string | null }[],
  lang: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of athletes) {
    const l = letterOf(a.name, lang);
    if (!l) continue;
    counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  return counts;
}

/**
 * Atleterne under ét bogstav, sorteret på navn med sprogets egen kollation.
 *
 * Bemærk: et navn hvis forbogstav ikke står i alfabetet (fx et ikke-latinsk
 * tegn) hører ikke til nogen bogstavside. Det er med vilje ufarligt — den
 * fulde /atleter-liste viser stadig alle, så ingen profil bliver uden vej ind.
 */
export function athletesForLetter(
  athletes: Athlete[],
  letter: string,
  lang: string,
): Athlete[] {
  const locale = languagePack(lang).locale;
  return athletes
    .filter((a) => letterOf(a.name, lang) === letter)
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/**
 * Bogstavsidens adresse på sitets sprog: `/athletes/a` · `/atleter/a`.
 *
 * Samme sektionssti som profilerne, og det er med vilje: et bogstav kan ikke
 * kollidere med en atlet-slug, fordi en slug altid er `fornavn-efternavn`.
 * Kollisionen er alligevel udelukket i ruten, hvor bogstavet slås op FØR
 * profilen — se `src/app/[...segments]/page.tsx`.
 */
export function getAthleteLetterUrl(letter: string, lang: string): string {
  return `${routePath("athletes", lang)}/${letterSlug(letter, lang)}`;
}
