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
import { DEFAULT_LANGUAGE } from "./index";

export type ProfileBuilder = (athlete: BaselineAthlete, now?: Date) => string;

export const PROFILE_BUILDERS: Record<string, ProfileBuilder> = {
  da: baselineProfile,
};

export function profileBuilder(lang: string = DEFAULT_LANGUAGE): ProfileBuilder {
  return PROFILE_BUILDERS[lang] ?? PROFILE_BUILDERS[DEFAULT_LANGUAGE];
}
