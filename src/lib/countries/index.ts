/**
 * Landeregister. Motoren slår op her og kender aldrig et konkret land.
 * Nyt land = ny fil ved siden af `dk.ts` + én linje i `COUNTRIES`.
 */
import type { CountryProfile } from "./types";
import { dk } from "./dk";
import { uk } from "./uk";
import { COLLECTING } from "./collecting";
import type { HometownProfile } from "./types";

export type { CountryProfile, HometownProfile } from "./types";

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

/** Countries whose data is gathered before they have a site (collecting.ts). */
export function collectingCountries(): HometownProfile[] {
  return Object.values(COLLECTING);
}

/**
 * Every country a roster hometown may be classified as: the sites first (their
 * signals are the most specific), then the collecting countries. Used by the
 * roster scrapers and the false-positive cleanup — which would otherwise
 * "clean away" every collected athlete.
 */
export function classifierCountries(): HometownProfile[] {
  return [...activeCountries(), ...collectingCountries()];
}

/** Country codes that have a SITE. Reader-facing and LLM pipelines use only these. */
export function siteCountryCodes(): string[] {
  return Object.keys(COUNTRIES);
}

/** SQL fragment: `<col> IN ('DK','UK')` — for pipelines that must skip collecting countries. */
export function siteCountrySql(column = "a.home_country"): string {
  return `${column} IN (${siteCountryCodes().map((c) => `'${c}'`).join(",")})`;
}
