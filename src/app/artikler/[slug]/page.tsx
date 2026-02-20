import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug, getAthleteBySlug, getArticlesByAthleteId } from "@/lib/db";
import { BASE_URL } from "@/lib/seo";
import { NewsTemplate } from "@/components/templates/NewsTemplate";
import { FeatureTemplate } from "@/components/templates/FeatureTemplate";
import { RecruitingTemplate } from "@/components/templates/RecruitingTemplate";
import { SeasonUpdateTemplate } from "@/components/templates/SeasonUpdateTemplate";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Artikel ikke fundet" };

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
      url: `${BASE_URL}/artikler/${slug}`,
    },
    twitter: {
      card: article.cover_image_url ? "summary_large_image" : "summary",
      title: article.title,
      description: article.summary ?? undefined,
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
    },
    alternates: { canonical: `${BASE_URL}/artikler/${slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function ArtikelPage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const [athlete, relatedArticles] = await Promise.all([
    article.athlete_id ? getAthleteBySlug(
      // Hent atlet via id ved at slå op i atleters artikler
      await getArticlesByAthleteId(article.athlete_id, 1)
        .then((arts) => arts[0]?.athlete_name ?? "")
        .then(() => String(article.athlete_id))
    ) : null,
    article.athlete_id ? getArticlesByAthleteId(article.athlete_id, 4)
      .then((arts) => arts.filter((a) => a.slug !== slug)) : [],
  ]);

  const props = { article, athlete, relatedArticles };

  switch (article.article_type) {
    case "feature":       return <FeatureTemplate {...props} />;
    case "recruiting":    return <RecruitingTemplate {...props} />;
    case "season_update": return <SeasonUpdateTemplate {...props} />;
    default:              return <NewsTemplate {...props} />;
  }
}
