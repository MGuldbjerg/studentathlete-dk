/**
 * Kontrakten en sprogpakke skal opfylde. Tilføjes et sprog, er det denne
 * grænseflade der siger præcis hvad der skal oversættes — intet andet i
 * motoren må indeholde sprog.
 */
import type { SportKey } from "../sports";

export interface LanguagePack {
  /** ISO 639-1, fx "da". */
  code: string;
  /** BCP 47 til datoformatering, fx "da-DK". */
  locale: string;
  /** Sportsnavn som vist for læseren. */
  sportLabel: Record<SportKey, string>;
  /** Sportens URL-slug på dette sprog (del af sitets offentlige flade). */
  sportSlug: Record<SportKey, string>;
  /** Position-begreb → formulering. Manglende begreb = brug id'et som det er. */
  positionPhrase: Record<string, string>;
  /** Tegn der skal skrives om i slugs (æ→ae, ü→ue, …). */
  transliterate: Record<string, string>;
}

/**
 * Grammatikken til basis-profilteksten ligger BEVIDST ikke i denne grænseflade,
 * men i `profile-builders.ts`. Den er kode (bøjning, verbevalg), og en sprogpakke
 * der importerede den ville lukke en import-cirkel: pakken → profil-grammatik →
 * positions → pakken. Data her, kode der.
 */
