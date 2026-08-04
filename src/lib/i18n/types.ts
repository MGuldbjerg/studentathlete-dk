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
  /**
   * Læservendte UI-strenge. Nøglerne er sprogfri id'er; teksten står her.
   *
   * Bevidst FLAD og eksplicit frem for indlejrede objekter: `_ui-test.ts`
   * fejler hvis et sprog mangler en nøgle, og en flad liste gør det trivielt
   * at se hvad der endnu ikke er oversat.
   */
  ui: Record<UiKey, string>;
}

/**
 * Alle læservendte strenge motoren kan vise. Tilføjer du en nøgle her, tvinger
 * typechecken dig til at oversætte den i BEGGE sprogpakker — det er hele
 * pointen med at have listen som en type og ikke bare `string`.
 */
export type UiKey =
  // Navigation og bund
  | "nav.athletes"
  | "nav.search_placeholder"
  | "footer.sports"
  | "footer.about"
  | "footer.all_articles"
  | "footer.all_athletes"
  | "footer.universities"
  | "footer.knowledge"
  | "footer.about_site"
  | "footer.contact"
  | "footer.ai_use"
  | "footer.press_ethics"
  | "footer.cookies"
  | "footer.cookie_settings"
  // Forsidens bånd
  | "home.latest"
  | "home.see_all"
  | "home.see_all_articles"
  | "home.no_articles"
  | "home.no_matches"
  | "home.search_results_for"
  | "home.clear_filter"
  | "band.stats_label"
  | "band.athletes_tracked"
  | "band.universities"
  | "band.sports"
  | "band.this_week"
  | "band.new"
  | "band.by_sport"
  | "band.all_athletes"
  | "band.athletes_count"
  // Arkiv
  | "archive.title"
  | "archive.meta_title_sport"
  | "archive.meta_page"
  | "archive.meta_description"
  | "archive.showing"
  | "archive.page_missing"
  | "archive.none_yet"
  | "archive.none_on_page"
  | "archive.back_to_first"
  | "archive.filter_by_sport"
  | "archive.all"
  | "archive.pages"
  | "archive.page_x_of_y"
  | "archive.newer"
  | "archive.older"
  // Kort og karrusel
  | "card.read_time"
  | "card.read_time_short"
  | "carousel.previous"
  | "carousel.next"
  | "carousel.go_to"
  | "carousel.empty_kicker"
  | "carousel.empty_title"
  | "carousel.empty_body";

/**
 * Grammatikken til basis-profilteksten ligger BEVIDST ikke i denne grænseflade,
 * men i `profile-builders.ts`. Den er kode (bøjning, verbevalg), og en sprogpakke
 * der importerede den ville lukke en import-cirkel: pakken → profil-grammatik →
 * positions → pakken. Data her, kode der.
 */
