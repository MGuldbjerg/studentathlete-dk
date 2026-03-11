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

export const SPORTS = [
  { label: "Alle", slug: "" },
  { label: "Football", slug: "football" },
  { label: "Basketball", slug: "basketball" },
  { label: "Baseball", slug: "baseball" },
  { label: "Atletik", slug: "atletik" },
  { label: "Svømning", slug: "svømning" },
  { label: "Fodbold", slug: "fodbold" },
  { label: "Andet", slug: "andet" },
] as const;

export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  profile: "Spillerprofil",
  news: "Nyhed",
  feature: "Feature",
  season_update: "Sæsonopdatering",
  recruiting: "Rekruttering",
};
