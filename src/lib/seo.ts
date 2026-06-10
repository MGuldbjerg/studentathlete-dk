import type { Article, Athlete, School } from "./types";
import { dbSportToUrlSlug } from "./types";

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://studentathlete.dk";

export function getReadingTime(content: string): number {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(wordCount / 200));
}

export function formatDate(
  dateStr: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  }
): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("da-DK", options);
}

export function formatDateShort(dateStr: string | null): string {
  return formatDate(dateStr, { day: "numeric", month: "short", year: "numeric" });
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Lige nu";
  if (diffMin < 60) return `${diffMin} min. siden`;
  if (diffHours < 24) return `${diffHours}t siden`;
  if (diffDays < 7) return `${diffDays}d siden`;
  return formatDate(dateStr, { day: "numeric", month: "short" });
}

// ─── URL-hjælpere ────────────────────────────────────────────────────────────

/**
 * Synligt cover for en artikel: rigtigt foto hvis sat, ellers genereret
 * kampkort (skolefarve + piktogram + score fra faktaarket). Gamle meta-OG-URLs
 * i cover_image_url ignoreres (de er ikke kampkort).
 */
// Bump ved design-ændringer i kampkortet — buster edge-cachen (s-maxage 7 dage)
const CARD_VERSION = 5;

export function getArticleCoverUrl(article: Pick<Article, "id" | "cover_image_url">): string {
  const cover = article.cover_image_url;
  if (cover && !cover.includes("/api/og")) return cover;
  return `/api/og?type=card&article=${article.id}&v=${CARD_VERSION}`;
}

export function getArticleUrl(article: Pick<Article, "slug" | "sport">): string {
  const sport = dbSportToUrlSlug(article.sport ?? "sport");
  return `/${sport}/${article.slug}`;
}

export function getAthleteUrl(slug: string): string {
  return `/atleter/${slug}`;
}

export function getSchoolUrl(slug: string): string {
  return `/skoler/${slug}`;
}

// ─── OG-billeder ─────────────────────────────────────────────────────────────

export function getOgImageUrl(params: {
  title: string;
  subtitle?: string;
  sport?: string | null;
  type?: "article" | "athlete" | "sport";
}): string {
  const url = new URL("/api/og", BASE_URL);
  url.searchParams.set("title", params.title);
  if (params.subtitle) url.searchParams.set("subtitle", params.subtitle);
  if (params.sport) url.searchParams.set("sport", params.sport);
  if (params.type) url.searchParams.set("type", params.type);
  return url.toString();
}

// ─── JSON-LD structured data ─────────────────────────────────────────────────

export function articleStructuredData(
  article: Article,
  athlete?: Athlete | null
): object {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary ?? undefined,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    url: `${BASE_URL}${getArticleUrl(article)}`,
    image: article.cover_image_url
      ? [{ "@type": "ImageObject", url: article.cover_image_url }]
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "StudentAthlete.dk",
      url: BASE_URL,
    },
    author: article.author
      ? { "@type": "Person", name: article.author }
      : { "@type": "Organization", name: "StudentAthlete.dk" },
    about: athlete
      ? {
          "@type": "Person",
          name: athlete.name,
          url: `${BASE_URL}${getAthleteUrl(athlete.slug)}`,
          sport: athlete.sport,
          affiliation: { "@type": "CollegeOrUniversity", name: athlete.university },
        }
      : undefined,
    keywords: [article.sport, article.article_type, "student athlete", "dansk"]
      .filter(Boolean)
      .join(", "),
    inLanguage: "da",
  };
}

export function athleteStructuredData(
  athlete: Athlete,
  articles: Article[]
): object {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${athlete.name} – StudentAthlete.dk`,
    url: `${BASE_URL}${getAthleteUrl(athlete.slug)}`,
    mainEntity: {
      "@type": "Person",
      name: athlete.name,
      sport: athlete.sport,
      image: athlete.photo_url ?? undefined,
      description: athlete.profile_summary ?? undefined,
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: athlete.university,
        address: { "@type": "PostalAddress", addressCountry: "US" },
      },
      homeLocation: athlete.hometown
        ? { "@type": "Place", name: athlete.hometown }
        : undefined,
      nationality: { "@type": "Country", name: "Denmark" },
    },
    about: articles.map((a) => ({
      "@type": "NewsArticle",
      headline: a.title,
      url: `${BASE_URL}${getArticleUrl(a)}`,
    })),
    inLanguage: "da",
  };
}

export function schoolStructuredData(school: School): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: school.name,
    url: school.website ?? `${BASE_URL}${getSchoolUrl(school.slug)}`,
    address: school.state
      ? { "@type": "PostalAddress", addressRegion: school.state, addressCountry: "US" }
      : undefined,
    description: `${school.division}${school.conference ? ` – ${school.conference}` : ""}`,
  };
}

export function breadcrumbStructuredData(
  crumbs: { name: string; url: string }[]
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
