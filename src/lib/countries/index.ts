/**
 * Landeregister. Motoren slår op her og kender aldrig et konkret land.
 * Nyt land = ny fil ved siden af `dk.ts` + én linje i `COUNTRIES`.
 */
import type { CountryProfile } from "./types";
import { dk } from "./dk";
import { uk } from "./uk";

export type { CountryProfile } from "./types";

/**
 * Rækkefølgen betyder noget: `classifyHometown` tager FØRSTE match. DK står
 * først, fordi de danske signaler er de mest specifikke (bynavne med æ/ø/å);
 * UK genkendes primært på eksplicitte nationsmarkører ("X, England").
 */
export const COUNTRIES: Record<string, CountryProfile> = { DK: dk, UK: uk };

/** Landet der driver sitet når værten ikke peger på noget andet. */
export const DEFAULT_COUNTRY = "DK";

export function countryProfile(code: string = DEFAULT_COUNTRY): CountryProfile {
  return COUNTRIES[code.toUpperCase()] ?? COUNTRIES[DEFAULT_COUNTRY];
}

/** Alle lande vi indsamler for — pipelinens arbejdsliste. */
export function activeCountries(): CountryProfile[] {
  return Object.values(COUNTRIES);
}
