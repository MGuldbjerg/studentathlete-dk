export interface Article {
  id: number;
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
  original_content: string | null;
  featured?: number;
  // Fase 3-verifikation (valgfri — kun sat når kladden er verificeret)
  fabrication_risk?: string | null;
  fact_flags?: string | null;
  story_id?: number | null;
  // Joined fra athletes
  athlete_name: string | null;
  athlete_slug: string | null;
  sport: string | null;
}

export interface Athlete {
  id: number;
  name: string;
  slug: string;
  sport: string;
  position: string | null;
  hometown: string | null;
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
  class_year: string | null;
  expected_graduation: number | null;
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

export const SPORT_COLORS: Record<string, string> = {
  football: "#4A6741",
  basketball: "#C2571A",
  baseball: "#8B2D2D",
  atletik: "#2E6B8A",
  svømning: "#1B7A8A",
  svoemning: "#1B7A8A",
  fodbold: "#2D5A27",
  golf: "#3D6B4F",
  tennis: "#8B6914",
  roning: "#1A5276",
  gymnastik: "#8B3A62",
  ishockey: "#2C3E6B",
  volleyball: "#A0522D",
  andet: "#6B6B6B",
};

export function getSportColor(sport: string | null | undefined): string {
  if (!sport) return "#6B6B6B";
  return SPORT_COLORS[sport.toLowerCase()] ?? "#6B6B6B";
}

export const SPORTS = [
  { label: "Alle", slug: "", icon: "all" },
  { label: "Football", slug: "football", icon: "football" },
  { label: "Basketball", slug: "basketball", icon: "basketball" },
  { label: "Baseball", slug: "baseball", icon: "baseball" },
  { label: "Fodbold", slug: "fodbold", icon: "fodbold" },
  { label: "Svømning", slug: "svoemning", icon: "svømning" },
  { label: "Atletik", slug: "atletik", icon: "atletik" },
  { label: "Golf", slug: "golf", icon: "golf" },
  { label: "Tennis", slug: "tennis", icon: "tennis" },
  { label: "Roning", slug: "roning", icon: "roning" },
  { label: "Gymnastik", slug: "gymnastik", icon: "gymnastik" },
  { label: "Ishockey", slug: "ishockey", icon: "ishockey" },
  { label: "Volleyball", slug: "volleyball", icon: "volleyball" },
  { label: "Andet", slug: "andet", icon: "andet" },
] as const;

/** Normalisér sport-streng fra scraper til intern nøgle */
export const SPORT_NORMALIZE: Record<string, string> = {
  "football": "football",
  "basketball": "basketball",
  "baseball": "baseball",
  "soccer": "fodbold",
  "track-and-field": "atletik",
  "swimming-and-diving": "svømning",
  "golf": "golf",
  "tennis": "tennis",
  "rowing": "roning",
  "gymnastics": "gymnastik",
  "ice-hockey": "ishockey",
  "volleyball": "volleyball",
};

/** Map URL-slug til DB-sportnavn (kun for slugs der afviger fra DB-værdi) */
const URL_TO_DB_SPORT: Record<string, string> = {
  svoemning: "svømning",
};

/** Map DB-sportnavn til URL-safe slug */
const DB_SPORT_TO_URL: Record<string, string> = {
  svømning: "svoemning",
};

/** Konvertér URL-slug til den sport-streng der bruges i databasen */
export function urlSlugToDbSport(slug: string): string {
  return URL_TO_DB_SPORT[slug] ?? slug;
}

/** Konvertér DB-sportnavn til URL-safe slug */
export function dbSportToUrlSlug(sport: string): string {
  return DB_SPORT_TO_URL[sport.toLowerCase()] ?? sport.toLowerCase().replace(/\s+/g, "-");
}

export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  profile: "Spillerprofil",
  news: "Nyhed",
  feature: "Feature",
  season_update: "Sæsonopdatering",
  recruiting: "Rekruttering",
};
