import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAthleteBySlug,
  getArticlesByAthleteId,
  getSchoolBySlug,
  getAthletesByUniversity,
  getArticlesByUniversity,
  getArticleBySlug,
} from "@/lib/db";
import { BASE_URL, getAthleteUrl, getSchoolUrl, getArticleUrl } from "@/lib/seo";
import { AthleteProfilePage } from "@/components/profiles/AthleteProfilePage";
import { SchoolProfilePage } from "@/components/profiles/SchoolProfilePage";
import { NewsTemplate } from "@/components/templates/NewsTemplate";
import { FeatureTemplate } from "@/components/templates/FeatureTemplate";
import { RecruitingTemplate } from "@/components/templates/RecruitingTemplate";
import { SeasonUpdateTemplate } from "@/components/templates/SeasonUpdateTemplate";

type Params = Promise<{ segments: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { segments } = await params;

  // ── 2 segmenter: /sport/slug → artikel ──────────────────────────────────
  if (segments.length === 2) {
    const [sport, slug] = segments;
    const article = await getArticleBySlug(slug);
    const normalizedSport = (article?.sport ?? "sport").toLowerCase().replace(/\s+/g, "-");
    if (!article || normalizedSport !== sport) return { title: "Artikel ikke fundet" };

    const canonicalUrl = `${BASE_URL}${getArticleUrl(article)}`;
    const images = article.cover_image_url
      ? [{ url: article.cover_image_url, width: 1200, height: 630, alt: article.title }]
      : [];

    return {
      title: `${article.title} | StudentAthlete.dk`,
      description: article.summary ?? `Læs om ${article.athlete_name ?? "studenter-atleten"} på StudentAthlete.dk`,
      openGraph: {
        title: article.title,
        description: article.summary ?? undefined,
        images,
        type: "article",
        publishedTime: article.published_at ?? undefined,
        modifiedTime: article.updated_at,
        tags: [article.sport, article.article_type, "student athlete", "dansk"]
          .filter(Boolean) as string[],
        siteName: "StudentAthlete.dk",
        url: canonicalUrl,
      },
      twitter: {
        card: article.cover_image_url ? "summary_large_image" : "summary",
        title: article.title,
        description: article.summary ?? undefined,
        images: article.cover_image_url ? [article.cover_image_url] : undefined,
      },
      alternates: { canonical: canonicalUrl },
      robots: { index: true, follow: true },
    };
  }

  // ── 1 segment: /slug → atlet eller skole ────────────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];

    const athlete = await getAthleteBySlug(slug);
    if (athlete) {
      const description =
        athlete.profile_summary ??
        `${athlete.name} spiller ${athlete.sport} for ${athlete.university}. Følg den danske student athlete på StudentAthlete.dk.`;
      return {
        title: `${athlete.name} – ${athlete.sport} | StudentAthlete.dk`,
        description,
        openGraph: {
          title: `${athlete.name} | StudentAthlete.dk`,
          description,
          images: athlete.photo_url ? [{ url: athlete.photo_url, alt: athlete.name }] : [],
          type: "profile",
          siteName: "StudentAthlete.dk",
          url: `${BASE_URL}${getAthleteUrl(slug)}`,
        },
        twitter: {
          card: athlete.photo_url ? "summary_large_image" : "summary",
          title: `${athlete.name} | StudentAthlete.dk`,
          description,
          images: athlete.photo_url ? [athlete.photo_url] : undefined,
        },
        alternates: { canonical: `${BASE_URL}${getAthleteUrl(slug)}` },
        robots: { index: true, follow: true },
      };
    }

    const school = await getSchoolBySlug(slug);
    if (school) {
      const description = `Oversigt over danske student athletes ved ${school.name}${school.state ? `, ${school.state}` : ""} – ${school.division}${school.conference ? `, ${school.conference}` : ""}.`;
      return {
        title: `${school.name} | StudentAthlete.dk`,
        description,
        openGraph: {
          title: `${school.name} | StudentAthlete.dk`,
          description,
          type: "website",
          siteName: "StudentAthlete.dk",
          url: `${BASE_URL}${getSchoolUrl(slug)}`,
        },
        alternates: { canonical: `${BASE_URL}${getSchoolUrl(slug)}` },
        robots: { index: true, follow: true },
      };
    }
  }

  return { title: "Side ikke fundet" };
}

export default async function DynamicPage({ params }: { params: Params }) {
  const { segments } = await params;

  // ── 2 segmenter: /sport/slug → artikel ──────────────────────────────────
  if (segments.length === 2) {
    const [sport, slug] = segments;
    const article = await getArticleBySlug(slug);

    const normalizedSport = (article?.sport ?? "sport").toLowerCase().replace(/\s+/g, "-");
    if (!article || normalizedSport !== sport) notFound();

    const [athlete, relatedArticles] = await Promise.all([
      article.athlete_slug ? getAthleteBySlug(article.athlete_slug) : null,
      article.athlete_id
        ? getArticlesByAthleteId(article.athlete_id, 4).then((arts) =>
            arts.filter((a) => a.slug !== slug)
          )
        : [],
    ]);

    const props = { article, athlete, relatedArticles };

    switch (article.article_type) {
      case "feature":       return <FeatureTemplate {...props} />;
      case "recruiting":    return <RecruitingTemplate {...props} />;
      case "season_update": return <SeasonUpdateTemplate {...props} />;
      default:              return <NewsTemplate {...props} />;
    }
  }

  // ── 1 segment: /slug → atlet eller skole ────────────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];

    const athlete = await getAthleteBySlug(slug);
    if (athlete) {
      const articles = await getArticlesByAthleteId(athlete.id, 10);
      return <AthleteProfilePage athlete={athlete} articles={articles} />;
    }

    const school = await getSchoolBySlug(slug);
    if (school) {
      const [athletes, articles] = await Promise.all([
        getAthletesByUniversity(school.name),
        getArticlesByUniversity(school.name, 6),
      ]);
      return <SchoolProfilePage school={school} athletes={athletes} articles={articles} />;
    }
  }

  notFound();
}
