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
  athlete_id: number | null;
  cover_image_url: string | null;
  // Joined fra athletes
  athlete_name?: string | null;
  sport?: string | null;
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
  profile: "Profil",
  news: "Nyhed",
  season_update: "Sæson",
};
