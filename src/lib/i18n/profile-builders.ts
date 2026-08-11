/**
 * Profil-grammatik pr. sprog.
 *
 * Ligger adskilt fra sprogpakkerne fordi det er KODE, ikke data: dansk siger
 * "svømmer", ikke "spiller svømning", og "kæmper i kuglestød", ikke "som
 * kuglestød". Den slags kan ikke oversættes i en strengtabel — et nyt sprog
 * skriver sin egen bygger og registrerer den her.
 *
 * (Adskillelsen bryder desuden import-cirklen sprogpakke → grammatik →
 * positions → sprogpakke.)
 */
import { baselineProfile, type BaselineAthlete } from "../profile-baseline";
import { baselineProfileEn } from "../profile-baseline-en";
import { DEFAULT_LANGUAGE } from "./index";

export type ProfileBuilder = (athlete: BaselineAthlete, now?: Date) => string;

export const PROFILE_BUILDERS: Record<string, ProfileBuilder> = {
  da: baselineProfile,
  en: baselineProfileEn,
};

export function profileBuilder(lang: string = DEFAULT_LANGUAGE): ProfileBuilder {
  return PROFILE_BUILDERS[lang] ?? PROFILE_BUILDERS[DEFAULT_LANGUAGE];
}

/**
 * Skifte-sætningen hører til her af samme grund som resten: den skrives af
 * maskinen (scrape-rosters.ts) og havner både på den offentlige tidslinje og
 * bagest i basis-udkastet — altså læservendt tekst der SKAL følge atletens
 * sprog. Alle andre athlete_events er skrevet af et menneske eller høstet fra
 * en artikel og har sproget med sig.
 */
export type TransferSentence = (from: string, to: string) => string;

export const TRANSFER_SENTENCES: Record<string, TransferSentence> = {
  da: (from, to) => `Skiftede fra ${from} til ${to}.`,
  en: (from, to) => `Transferred from ${from} to ${to}.`,
};

export function transferSentence(lang: string = DEFAULT_LANGUAGE): TransferSentence {
  return TRANSFER_SENTENCES[lang] ?? TRANSFER_SENTENCES[DEFAULT_LANGUAGE];
}
