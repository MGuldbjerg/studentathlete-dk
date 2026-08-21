import type { Article, Athlete, School } from "./types";
import { dbSportToUrlSlug } from "./types";
import { countryProfile } from "./countries";
import type { CountryProfile } from "./countries/types";
import { siteBaseUrl } from "./site";
import { sportLabel, t, languagePack, routePath } from "./i18n";

/**
 * Standardsitets base-URL. Værten står ét sted — landeprofilen — så et nyt site
 * er en profilfil, ikke en jagt efter hardkodede domæner.
 *
 * Til absolutte URL'er i en request-kontekst med flere sites: brug
 * `siteBaseUrl(siteFromHost(host))`, som giver det site læseren faktisk er på.
 */
export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? siteBaseUrl(countryProfile());

export function getReadingTime(content: string): number {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(wordCount / 200));
}

/**
 * Datoer er læservendte — og derfor sprogbestemte.
 *
 * Her stod `"da-DK"` hårdkodet, så det britiske site skrev «19. august 2026».
 * Locale'en ligger i sprogpakken (`da-DK` / `en-GB`), præcis som navne og
 * slugs gør. `lang` er påkrævet: en glemt parameter må ikke kunne blive til
 * dansk på et engelsk site (se `LÆSERVENDT.md`).
 */
export function formatDate(
  dateStr: string | null,
  lang: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  }
): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(languagePack(lang).locale, options);
}

export function formatDateShort(dateStr: string | null, lang: string): string {
  return formatDate(dateStr, lang, { day: "numeric", month: "short", year: "numeric" });
}

export function formatRelativeTime(dateStr: string | null, lang: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("time.now", lang);
  if (diffMin < 60) return t("time.minutes_ago", lang, { n: diffMin });
  if (diffHours < 24) return t("time.hours_ago", lang, { n: diffHours });
  if (diffDays < 7) return t("time.days_ago", lang, { n: diffDays });
  return formatDate(dateStr, lang, { day: "numeric", month: "short" });
}

// ─── URL-hjælpere ────────────────────────────────────────────────────────────

/**
 * Synligt cover for en artikel: rigtigt foto hvis sat, ellers genereret
 * kampkort (skolefarve + piktogram + score fra faktaarket). Gamle meta-OG-URLs
 * i cover_image_url ignoreres (de er ikke kampkort).
 */
// Bump ved design-ændringer i kampkortet — buster edge-cachen (s-maxage 7 dage)
// OG matcher pre-render-nøglen i card_blobs (migration-029): pipeline-rendrede
// 1200×630-kort gemmes som `card-{id}-v{CARD_VERSION}` og serveres af /api/og
// før on-the-fly-fallbacket (600×315 — fuldsize on-the-fly (v6) sprængte
// free-plan CPU). R2 var førstevalget men kræver dashboard-aktivering af
// R2 på kontoen (fejl 10042) → D1-blobs, samme resultat på $0.
export const CARD_VERSION = 8;

/** Nøgle i card_blobs for et pre-rendret kampkort (delt mellem Worker og pipeline). */
export function cardBlobKey(articleId: number): string {
  return `card-${articleId}-v${CARD_VERSION}`;
}

/**
 * Cover til lister/karrusel/thumbnails er ALTID det genererede 16:9 kampkort:
 * ensartede dimensioner + skarpt på store skærme. Rigtige profilfotos (typisk
 * portræt-headshots i lav opløsning) vises KUN på atletprofilen og inde i
 * artiklen — som listevisnings-cover ødelagde de kort-formatet, så
 * cover_image_url bruges bevidst ikke her.
 */
export function getArticleCoverUrl(article: Pick<Article, "id">): string {
  return `/api/og?type=card&article=${article.id}&v=${CARD_VERSION}`;
}

/**
 * Artiklens adresse på SITETS sprog: `/football/…` på .co.uk, `/fodbold/…` på .dk.
 *
 * `lang` er ikke valgfri i praksis — udelades den, får man standardsitets slug,
 * og så stod britiske artikler på danske adresser (rettet 2026-08-21). Kalderen
 * kender altid sproget: server-komponenter via `currentLanguage()`, klient- og
 * skabelonkomponenter får det ind som prop (samme regel som for oversatte
 * strenge), og pipelinen via landeprofilen.
 */
export function getArticleUrl(article: Pick<Article, "slug" | "sport">, lang: string): string {
  const sport = dbSportToUrlSlug(article.sport ?? "sport", lang);
  return `/${sport}/${article.slug}`;
}

export function getAthleteUrl(slug: string, lang: string): string {
  return `${routePath("athletes", lang)}/${slug}`;
}

export function getSchoolUrl(slug: string, lang: string): string {
  return `${routePath("schools", lang)}/${slug}`;
}

/** Guide-siden (viden/guides) på sitets sprog. */
export function getGuideUrl(slug: string, lang: string): string {
  return `${routePath("guides", lang)}/${slug}`;
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
//
// JSON-LD er det Google LÆSER — og indtil 2026-08-21 var hver eneste linje her
// dansk uanset site: absolutte URL'er på .dk (`BASE_URL`), `inLanguage: "da"`,
// `nationality: Denmark` på britiske atleter og "StudentAthlete.dk" i navnet.
// Derfor tager de nu sitet ind som argument. `site` er IKKE valgfri.

export function articleStructuredData(
  article: Article,
  athlete: Athlete | null | undefined,
  site: CountryProfile,
): object {
  const base = siteBaseUrl(site);
  const lang = site.language;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary ?? undefined,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    url: `${base}${getArticleUrl(article, lang)}`,
    image: article.cover_image_url
      ? [{ "@type": "ImageObject", url: article.cover_image_url }]
      : undefined,
    publisher: {
      "@type": "Organization",
      name: site.brand,
      url: base,
    },
    author: article.author
      ? { "@type": "Person", name: article.author }
      : { "@type": "Organization", name: site.brand },
    about: athlete
      ? {
          "@type": "Person",
          name: athlete.name,
          url: `${base}${getAthleteUrl(athlete.slug, lang)}`,
          sport: sportLabel(athlete.sport, lang),
          affiliation: { "@type": "CollegeOrUniversity", name: athlete.university },
        }
      : undefined,
    keywords: [article.sport, article.article_type, "student athlete", site.code.toLowerCase()]
      .filter(Boolean)
      .join(", "),
    inLanguage: lang,
  };
}

export function athleteStructuredData(
  athlete: Athlete,
  articles: Article[],
  site: CountryProfile,
): object {
  const base = siteBaseUrl(site);
  const lang = site.language;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${athlete.name} – ${site.brand}`,
    url: `${base}${getAthleteUrl(athlete.slug, lang)}`,
    mainEntity: {
      "@type": "Person",
      name: athlete.name,
      sport: sportLabel(athlete.sport, lang),
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
      nationality: { "@type": "Country", name: site.nationalityName },
    },
    about: articles.map((a) => ({
      "@type": "NewsArticle",
      headline: a.title,
      url: `${base}${getArticleUrl(a, lang)}`,
    })),
    inLanguage: lang,
  };
}

export function schoolStructuredData(school: School, site: CountryProfile): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: school.name,
    url: school.website ?? `${siteBaseUrl(site)}${getSchoolUrl(school.slug, site.language)}`,
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
