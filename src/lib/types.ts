export interface Article {
  id: number;
  /** Words on the page by the floor rule (migration 073); NULL = not counted. */
  index_words?: number | null;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  article_type: string;
  published: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  athlete_id: number | null;
  cover_image_url: string | null;
  source_url: string | null;
  model_used: string | null;
  llm_provider: string | null;
  author: string | null;
  /** NULL = AI/redaktionen (Ai-disclaimer vises); 'human' = menneskelig bidragyder */
  author_role?: string | null;
  original_content: string | null;
  featured?: number;
  // Synlig rettelse (migration-026) — "Rettet <dato>: <note>" på artiklen
  correction_note?: string | null;
  corrected_at?: string | null;
  // Fase 3-verifikation (valgfri — kun sat når kladden er verificeret)
  fabrication_risk?: string | null;
  fact_flags?: string | null;
  story_id?: number | null;
  /** Presseetik-flag fra stories.sensitive (kun joinet i admin-kladdelisten) */
  sensitive?: string | null;
  // Joined fra athletes
  athlete_name: string | null;
  athlete_slug: string | null;
  sport: string | null;
}

/**
 * An article as a LIST shows it (cards, carousel, related, feed): no bodies.
 * `content`, `original_content` and `fact_flags` were selected for every list
 * and the carousel is a client component, so the home page shipped up to 60
 * full bodies through D1, the Worker and the RSC payload — to compute a
 * reading time. `word_count` is counted in SQL (`ARTICLE_LIST_SELECT`); the
 * type keeps a list consumer from reaching for a body it no longer gets.
 */
export type ArticleListItem = Omit<
  Article,
  "content" | "original_content" | "fact_flags" | "model_used" | "llm_provider" | "fabrication_risk"
> & { word_count: number };

export interface Athlete {
  id: number;
  name: string;
  slug: string;
  sport: string;
  position: string | null;
  hometown: string | null;
  /** Atletens land (migration-034). Styrer også bystavemåden i visningen. */
  home_country?: string | null;
  university: string;
  university_state: string | null;
  division: string;
  year_enrolled: number | null;
  active: number;
  photo_url: string | null;
  photo_credit: string | null;
  preferred_name: string | null;
  profile_summary: string | null;
  bio_url?: string | null;
  /** The athlete's Influxer store, verified by name and school (migration 078). */
  merch_url?: string | null;
  class_year: string | null;
  expected_graduation: number | null;
  /**
   * Skolens slug, slået op via `schools.name = athletes.university` — den
   * eneste kobling der findes mellem de to tabeller. Sættes af
   * `getAthleteBySlug()`, så profilen kan linke til skolesiden uden et ekstra
   * opslag. Kan være null: en skole kan mangle i `schools`.
   */
  school_slug?: string | null;
  /** 1 when the athlete has a published article (getAthleteBySlug only). */
  has_article?: number;
  /** Published articles about or naming the athlete (getAthleteBySlug, getAllAthleteSlugs). */
  article_count?: number;
  /** The college before this one, from the roster (when it says). */
  previous_school?: string | null;
  /** Words on the profile by the floor rule (pipeline/report/index-words.ts), migration 073. */
  index_words?: number | null;
  /** Labelled facts from the bio page (src/lib/bio-facts.ts), migration 072. */
  bio_facts?: string | null;
  /** 1 when this season's stats are on file (athlete_season_stats). */
  has_stats?: number;
  /** Skolens stavemåde af navnet (matchnøgle for scraperen, migration-032). */
  roster_name?: string | null;
  /** Skolens eget spiller-id, "vært#id" — sand identitet på tværs af navneskift. */
  roster_key?: string | null;
  /** 1 = `name` er rettet i hånden; scraperen overskriver det aldrig. */
  name_locked?: number | null;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: number;
  name: string;
  slug: string;
  state: string | null;
  division: string;
  conference: string | null;
  website: string | null;
  common_name?: string | null;
  nickname?: string | null;
  city?: string | null;
  platform_type?: string | null;
  platform_detected_at?: string | null;
  news_feed_url?: string | null;
  news_feed_type?: string | null;
  news_last_checked_at?: string | null;
}

// ── Sportsgrene ──────────────────────────────────────────────────────────────
// Selve vokabularet bor nu i src/lib/sports.ts (sprogfri nøgler, farver, ikoner)
// og navnene i sprogpakken (src/lib/i18n/). Her står kun gennemstik, så
// eksisterende importører ikke skal kende den indre opdeling.
//
// Uden sprog-argument bruges standardsitets sprog. Et site på et andet sprog
// sender sit eget sprog med — der er ingen dansk streng tilbage i denne fil.

export { SPORT_KEYS, SPORT_COLORS, type SportKey, isSportKey } from "./sports";
export { sportLabel, sportSlug, sportKeyFromSlug, sportNav } from "./i18n";

import { sportColor } from "./sports";
import { sportSlug as sportSlugFor, sportKeyFromSlug as keyFromSlug } from "./i18n";

/** Farve pr. sport (sprogfri). */
export function getSportColor(sport: string | null | undefined): string {
  return sportColor(sport);
}

/** URL-slug → den nøgle databasen gemmer. Erstatter urlSlugToDbSport(). */
export function urlSlugToDbSport(slug: string, lang: string): string {
  return keyFromSlug(slug, lang) ?? slug;
}

/** DB-nøgle → URL-slug på sitets sprog. Erstatter dbSportToUrlSlug(). */
export function dbSportToUrlSlug(sport: string, lang: string): string {
  return sportSlugFor(sport, lang);
}

export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  profile: "Spillerprofil",
  news: "Nyhed",
  feature: "Feature",
  season_update: "Sæsonopdatering",
  recruiting: "Rekruttering",
};
