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
  author: string | null;
  // Joined fra athletes
  athlete_name?: string | null;
  athlete_slug?: string | null;
  sport?: string | null;
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
  profile_summary: string | null;
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
}

export const SPORT_COLORS: Record<string, string> = {
  football: "#4A6741",
  basketball: "#C2571A",
  baseball: "#8B2D2D",
  atletik: "#2E6B8A",
  svømning: "#1B7A8A",
  fodbold: "#2D5A27",
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
  { label: "Atletik", slug: "atletik", icon: "atletik" },
  { label: "Svømning", slug: "svømning", icon: "svømning" },
  { label: "Fodbold", slug: "fodbold", icon: "fodbold" },
  { label: "Andet", slug: "andet", icon: "andet" },
] as const;

export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  profile: "Spillerprofil",
  news: "Nyhed",
  feature: "Feature",
  season_update: "Sæsonopdatering",
  recruiting: "Rekruttering",
};
