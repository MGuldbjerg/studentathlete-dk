import type { Article, Athlete, School } from "./types";

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://studentathlete-dk.m-guldbjerg.workers.dev";

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

// JSON-LD structured data builders
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
    url: `${BASE_URL}/artikler/${article.slug}`,
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
          url: `${BASE_URL}/atleter/${athlete.slug}`,
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
    url: `${BASE_URL}/atleter/${athlete.slug}`,
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
      url: `${BASE_URL}/artikler/${a.slug}`,
    })),
    inLanguage: "da",
  };
}

export function schoolStructuredData(school: School): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: school.name,
    url: school.website ?? undefined,
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
