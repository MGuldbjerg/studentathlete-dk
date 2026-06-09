/**
 * Atlet-identitet til dedup på tværs af navne-varianter og skoleskift (transfers).
 *
 * Slug'en (generateSlug) er afledt af det FULDE navn, så "Marqus Mitrovic Marion"
 * og "Marqus Marion" får forskellige slugs → INSERT OR IGNORE kan ikke dedupe dem.
 * normalizeIdentity() reducerer til fornavn+efternavn (uden mellemnavne/initialer/
 * suffikser) så de to varianter matcher som samme person.
 */
import { generateSlug } from "./slug";

/** Navnesuffikser der ikke er en del af identiteten. */
const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/** Slug-normaliserede navne-tokens uden suffikser. */
function nameTokens(name: string): string[] {
  return generateSlug(name)
    .split("-")
    .filter((t) => t.length > 0 && !NAME_SUFFIXES.has(t));
}

/**
 * Reducér et navn til en stabil identitetsnøgle "fornavn|efternavn" (slug-normaliseret,
 * mellemnavne + suffikser fjernet). To rosters der staver navnet forskelligt
 * (mellemnavn med/uden, "Jr." osv.) giver samme nøgle.
 */
export function normalizeIdentity(name: string): string {
  const tokens = nameTokens(name);
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0];
  return `${tokens[0]}|${tokens[tokens.length - 1]}`;
}

/** Mellemnavne (alt mellem fornavn og efternavn). */
function middleTokens(name: string): Set<string> {
  return new Set(nameTokens(name).slice(1, -1));
}

/**
 * Er mellemnavnene forenelige? Hvis mindst én mangler mellemnavn → ja (fx
 * "Marqus Marion" vs "Marqus Mitrovic Marion"). Hvis BEGGE har mellemnavne skal
 * det ene sæt være delmængde af det andet — ellers er det to forskellige personer
 * (fx "Oliver Møller-Jensen" vs "Oliver Juul Jensen": moller ≠ juul).
 */
function middlesCompatible(a: string, b: string): boolean {
  const ma = middleTokens(a);
  const mb = middleTokens(b);
  if (ma.size === 0 || mb.size === 0) return true;
  const [small, big] = ma.size <= mb.size ? [ma, mb] : [mb, ma];
  for (const t of small) if (!big.has(t)) return false;
  return true;
}

/**
 * Er to atlet-rækker sandsynligvis samme person? Kræver samme identitetsnøgle OG
 * samme sport. Hometowns bruges som vagt: hvis BEGGE er udfyldt og er forskellige
 * byer, betragtes de som to forskellige personer (undgår fejlmerge af to ægte
 * danskere med samme navn). Tom hometown på en af dem → antaget samme (typisk en
 * seed-/recruiting-række uden hometown vs. en scrapet række med).
 */
export function samePerson(
  a: { name: string; sport: string; hometown: string | null },
  b: { name: string; sport: string; hometown: string | null },
): boolean {
  if (a.sport !== b.sport) return false;
  const idA = normalizeIdentity(a.name);
  const idB = normalizeIdentity(b.name);
  if (!idA || idA !== idB) return false;

  // Modstridende mellemnavne → forskellige personer (selv med samme for-/efternavn).
  if (!middlesCompatible(a.name, b.name)) return false;

  if (a.hometown && b.hometown) {
    return normalizeIdentity(a.hometown) === normalizeIdentity(b.hometown)
      // by-del kan afvige (kun komma-prefiks) — sammenlign første segment
      || hometownCity(a.hometown) === hometownCity(b.hometown);
  }
  return true; // mindst én mangler hometown → antaget samme person
}

/** Første (by-)segment af en hometown, slug-normaliseret. */
function hometownCity(hometown: string): string {
  return generateSlug(hometown.split(/[,/]/)[0] ?? "");
}
