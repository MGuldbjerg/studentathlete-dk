/**
 * Kontrakten en sprogpakke skal opfylde. Tilføjes et sprog, er det denne
 * grænseflade der siger præcis hvad der skal oversættes — intet andet i
 * motoren må indeholde sprog.
 */
import type { SportKey } from "../sports";

/** Sektioner med egen sti. Nøglen er sprogfri; sluggen står i sprogpakken. */
export type RouteKey = "athletes" | "schools" | "guides" | "archive";

/** Læservendte query-parametre. */
export type ParamKey = "page" | "source";

export interface LanguagePack {
  /** ISO 639-1, fx "da". */
  code: string;
  /** BCP 47 til datoformatering, fx "da-DK". */
  locale: string;
  /** Sportsnavn som vist for læseren. */
  sportLabel: Record<SportKey, string>;
  /** Sportens URL-slug på dette sprog (del af sitets offentlige flade). */
  sportSlug: Record<SportKey, string>;
  /**
   * Sektionsstierne. Mapperne i `src/app/` hedder stadig det danske —
   * middlewaren skriver sitets egen sti om til dem — men det læseren og Google
   * ser, står her. Uden dette lå britiske sider på /atleter og /viden.
   */
  routes: Record<RouteKey, string>;
  /**
   * Query-parametre der er læservendte, fordi de står i delte links:
   * `?side=2` / `?page=2` og `?kilde=ig` / `?source=ig`.
   */
  params: Record<ParamKey, string>;
  /**
   * Artikeltype som vist for læseren. Lå før som én dansk tabel i
   * `src/lib/types.ts` og sivede derfor uoversat ud på kort og i skabeloner.
   * Admin bruger stadig den danske tabel — den har én bruger.
   */
  articleTypeLabel: Record<string, string>;
  /** Position-begreb → formulering. Manglende begreb = brug id'et som det er. */
  positionPhrase: Record<string, string>;
  /** Tegn der skal skrives om i slugs (æ→ae, ü→ue, …). */
  transliterate: Record<string, string>;
  /**
   * Sprogets alfabet, i sprogets egen rækkefølge. Driver bogstavsiderne
   * (/athletes/a). Dansk slutter på Æ Ø Å; engelsk stopper ved Z. Et bogstav
   * der ikke står her, får ingen side — derfor er listen sprogpakkens ansvar
   * og ikke en A-Z-løkke i en komponent.
   */
  alphabet: string[];
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
  | "correction.prefix"
  | "feed.description"
  | "ads.disclosure"
  | "ads.customs"
  | "time.now"
  | "time.minutes_ago"
  | "time.hours_ago"
  | "time.days_ago"
  | "card.read_time"
  | "card.read_time_short"
  | "carousel.previous"
  | "carousel.next"
  | "carousel.go_to"
  | "carousel.empty_kicker"
  | "carousel.empty_title"
  | "carousel.empty_body"
  // Brødkrummer og skabeloner
  | "crumb.home"
  | "crumb.aria"
  // Fælles
  | "nav.search_submit"
  | "common.loading"
  | "notfound.title"
  | "notfound.body"
  | "notfound.cta"
  // Atletoversigten
  | "athletes.meta_title"
  | "athletes.meta_description"
  | "athletes.h1"
  | "athletes.active_count"
  | "athletes.alumni_count"
  | "athletes.none"
  | "athletes.sort_label"
  | "athletes.sort_sport"
  | "athletes.sort_name"
  | "athletes.sort_school"
  | "athletes.grad_help_before"
  | "athletes.grad_help_strong"
  | "athletes.grad_help_after"
  | "athletes.active_heading"
  | "athletes.none_active"
  | "athletes.alumni_heading"
  | "athletes.show"
  | "athletes.hide"
  | "athletes.unknown_school"
  | "athletes.graduated_title"
  | "athletes.intro"
  | "athletes.letter_nav_label"
  | "athletes.letter_all"
  | "athletes.letter_h1"
  | "athletes.letter_meta_title"
  | "athletes.letter_meta_description"
  | "athletes.letter_intro"
  | "athletes.letter_count"
  | "athletes.letter_none"
  | "athletes.letter_back"
  // Universitetsoversigten
  | "schools.meta_title"
  | "schools.meta_description"
  | "schools.crumb"
  | "schools.intro_before"
  | "schools.intro_link"
  | "schools.counts"
  | "schools.none"
  | "schools.athlete_count_title"
  // Viden-hubben
  | "guides.meta_title"
  | "guides.meta_description"
  | "guides.crumb"
  | "guides.intro"
  | "guides.read_more"
  | "guides.lookup_heading"
  | "guides.schools_card_title"
  | "guides.schools_card_body"
  | "guides.athletes_card_title"
  | "guides.athletes_card_body"
  | "guides.sports_heading"
  /** Guidens egen slug er sprogstyret — se `viden-content-en.ts`. */
  | "guides.divisions_slug"
  // Sport-landingssiden
  | "sport.empty_note"
  | "sport.active_athletes_label"
  | "sport.articles_label"
  | "sport.athletes_heading"
  | "sport.see_all_athletes"
  | "sport.no_content"
  | "tpl.news_plural"
  | "tpl.features"
  | "tpl.season_updates"
  | "tpl.recruiting"
  | "tpl.read_also"
  | "tpl.related"
  | "tpl.more_recruiting"
  | "tpl.previous_updates"
  | "tpl.student_athlete_tag"
  | "tpl.official"
  // Faktaetiketter (atlet- og skoleprofiler, skabelonernes fakta-bokse)
  | "fact.name"
  | "fact.sport"
  | "fact.university"
  | "fact.position"
  | "fact.division"
  | "fact.hometown"
  | "fact.home_country"
  | "fact.state"
  | "fact.conference"
  | "fact.class_year"
  | "fact.enrolled"
  | "fact.expected_graduation"
  | "fact.status"
  | "status.active"
  | "status.alumni"
  | "status.graduated"
  // Profilsider
  | "profile.no_articles"
  | "school.athletes"
  | "school.no_athletes"
  // Metadata-skabeloner ([...segments])
  | "meta.sport_title"
  | "meta.athlete_description"
  | "meta.school_description"
  | "meta.article_description";

/**
 * Grammatikken til basis-profilteksten ligger BEVIDST ikke i denne grænseflade,
 * men i `profile-builders.ts`. Den er kode (bøjning, verbevalg), og en sprogpakke
 * der importerede den ville lukke en import-cirkel: pakken → profil-grammatik →
 * positions → pakken. Data her, kode der.
 */
