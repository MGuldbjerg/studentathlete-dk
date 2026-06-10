import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getAthleteBySlug,
  getArticlesByAthleteId,
  getSchoolBySlug,
  getAthletesByUniversity,
  getArticlesByUniversity,
  getArticleBySlug,
  getAthletesBySport,
  getArticlesBySport,
  countAthletesBySport,
} from "@/lib/db";
import { getPublishedPageBySlug } from "@/lib/admin";
import { BASE_URL, getAthleteUrl, getSchoolUrl, getArticleUrl, getOgImageUrl } from "@/lib/seo";
import { getSportContent } from "@/lib/sport-content";
import { urlSlugToDbSport, dbSportToUrlSlug } from "@/lib/types";
import { AthleteProfilePage } from "@/components/profiles/AthleteProfilePage";
import { SchoolProfilePage } from "@/components/profiles/SchoolProfilePage";
import { SportLandingPage } from "@/components/SportLandingPage";
import { NewsTemplate } from "@/components/templates/NewsTemplate";
import { FeatureTemplate } from "@/components/templates/FeatureTemplate";
import { RecruitingTemplate } from "@/components/templates/RecruitingTemplate";
import { SeasonUpdateTemplate } from "@/components/templates/SeasonUpdateTemplate";
import { ArticleBody } from "@/components/ui/ArticleBody";

type Params = Promise<{ segments: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { segments } = await params;

  // ── 1 segment: /{sport} → sport-landingsside ────────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];

    const sportContent = getSportContent(slug);
    if (sportContent) {
      const canonicalUrl = `${BASE_URL}/${slug}`;
      const ogImage = getOgImageUrl({
        title: sportContent.title,
        subtitle: sportContent.intro,
        sport: slug,
        type: "sport",
      });
      return {
        title: `${sportContent.title} – danske atleter i NCAA | StudentAthlete.dk`,
        description: sportContent.metaDescription,
        openGraph: {
          title: `${sportContent.title} | StudentAthlete.dk`,
          description: sportContent.metaDescription,
          images: [{ url: ogImage, width: 1200, height: 630, alt: sportContent.title }],
          type: "website",
          siteName: "StudentAthlete.dk",
          url: canonicalUrl,
        },
        twitter: {
          card: "summary_large_image",
          title: `${sportContent.title} | StudentAthlete.dk`,
          description: sportContent.metaDescription,
          images: [ogImage],
        },
        alternates: { canonical: canonicalUrl },
        robots: { index: true, follow: true },
      };
    }

    // Statisk side fra pages-tabellen
    const page = await getPublishedPageBySlug(slug);
    if (page) {
      return {
        title: `${page.title} | StudentAthlete.dk`,
        description: page.meta_description ?? undefined,
        alternates: { canonical: `${BASE_URL}/${slug}` },
        robots: { index: true, follow: true },
      };
    }

    // Legacy-redirects: gamle /{slug} → /atleter/{slug} eller /skoler/{slug}
    // generateMetadata kan ikke redirecte, men vi returnerer noindex for gamle URLs
    return { title: "Side ikke fundet" };
  }

  // ── 2 segmenter ─────────────────────────────────────────────────────────
  if (segments.length === 2) {
    const [prefix, slug] = segments;

    // /atleter/{slug} → atlet-profil
    if (prefix === "atleter") {
      const athlete = await getAthleteBySlug(slug);
      if (athlete) {
        const description =
          athlete.profile_summary ??
          `${athlete.name} spiller ${athlete.sport} for ${athlete.university}. Følg den danske student athlete på StudentAthlete.dk.`;
        const ogImage = athlete.photo_url
          ?? getOgImageUrl({
               title: athlete.name,
               subtitle: `${athlete.university} · ${athlete.sport}`,
               sport: athlete.sport,
               type: "athlete",
             });
        return {
          title: `${athlete.name} – ${athlete.sport} | StudentAthlete.dk`,
          description,
          openGraph: {
            title: `${athlete.name} | StudentAthlete.dk`,
            description,
            images: [{ url: ogImage, width: 1200, height: 630, alt: athlete.name }],
            type: "profile",
            siteName: "StudentAthlete.dk",
            url: `${BASE_URL}${getAthleteUrl(slug)}`,
          },
          twitter: {
            card: "summary_large_image",
            title: `${athlete.name} | StudentAthlete.dk`,
            description,
            images: [ogImage],
          },
          alternates: { canonical: `${BASE_URL}${getAthleteUrl(slug)}` },
          robots: { index: true, follow: true },
        };
      }
    }

    // /skoler/{slug} → skole-profil
    if (prefix === "skoler") {
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

    // /{sport}/{slug} → artikel
    const article = await getArticleBySlug(slug);
    const normalizedSport = dbSportToUrlSlug(article?.sport ?? "sport");
    if (article && normalizedSport === prefix) {
      const canonicalUrl = `${BASE_URL}${getArticleUrl(article)}`;
      const ogImage = article.cover_image_url
        ?? getOgImageUrl({
             title: article.title,
             subtitle: article.athlete_name
               ? `${article.athlete_name} · ${article.sport ?? ""}`
               : (article.sport ?? ""),
             sport: article.sport,
             type: "article",
           });

      return {
        title: `${article.title} | StudentAthlete.dk`,
        description: article.summary ?? `Læs om ${article.athlete_name ?? "studenter-atleten"} på StudentAthlete.dk`,
        openGraph: {
          title: article.title,
          description: article.summary ?? undefined,
          images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
          type: "article",
          publishedTime: article.published_at ?? undefined,
          modifiedTime: article.updated_at,
          tags: [article.sport, article.article_type, "student athlete", "dansk"]
            .filter(Boolean) as string[],
          siteName: "StudentAthlete.dk",
          url: canonicalUrl,
        },
        twitter: {
          card: "summary_large_image",
          title: article.title,
          description: article.summary ?? undefined,
          images: [ogImage],
        },
        alternates: { canonical: canonicalUrl },
        robots: { index: true, follow: true },
      };
    }
  }

  return { title: "Side ikke fundet" };
}

export default async function DynamicPage({ params }: { params: Params }) {
  const { segments } = await params;

  // ── 1 segment: /{sport} eller legacy-redirect ───────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];

    // Sport-landingsside
    const sportContent = getSportContent(slug);
    if (sportContent) {
      const dbSport = urlSlugToDbSport(slug);
      const [articles, athletes, counts] = await Promise.all([
        getArticlesBySport(dbSport, 7),
        getAthletesBySport(dbSport, 30),
        countAthletesBySport(dbSport),
      ]);
      return (
        <SportLandingPage
          sport={slug}
          content={sportContent}
          articles={articles}
          athletes={athletes}
          counts={counts}
        />
      );
    }

    // Statisk side fra pages-tabellen
    const page = await getPublishedPageBySlug(slug);
    if (page) {
      return (
        <main className="min-h-screen bg-surface">
          <article className="max-w-2xl mx-auto px-4 py-12">
            <h1
              className="text-3xl md:text-4xl font-bold text-ink mb-8"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {page.title}
            </h1>
            <ArticleBody content={page.content} />
          </article>
        </main>
      );
    }

    // Legacy: /{slug} → /atleter/{slug} (301 permanent redirect)
    const athlete = await getAthleteBySlug(slug);
    if (athlete) redirect(getAthleteUrl(athlete.slug));

    // Legacy: /{slug} → /skoler/{slug} (301 permanent redirect)
    const school = await getSchoolBySlug(slug);
    if (school) redirect(getSchoolUrl(school.slug));
  }

  // ── 2 segmenter ─────────────────────────────────────────────────────────
  if (segments.length === 2) {
    const [prefix, slug] = segments;

    // /atleter/{slug} → atlet-profil
    if (prefix === "atleter") {
      const athlete = await getAthleteBySlug(slug);
      if (athlete) {
        const articles = await getArticlesByAthleteId(athlete.id, 10);
        return <AthleteProfilePage athlete={athlete} articles={articles} />;
      }
    }

    // /skoler/{slug} → skole-profil
    if (prefix === "skoler") {
      const school = await getSchoolBySlug(slug);
      if (school) {
        const [athletes, articles] = await Promise.all([
          getAthletesByUniversity(school.name),
          getArticlesByUniversity(school.name, 6),
        ]);
        return <SchoolProfilePage school={school} athletes={athletes} articles={articles} />;
      }
    }

    // /{sport}/{slug} → artikel
    const article = await getArticleBySlug(slug);
    const normalizedSport = dbSportToUrlSlug(article?.sport ?? "sport");
    if (article && normalizedSport === prefix) {
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
  }

  notFound();
}
