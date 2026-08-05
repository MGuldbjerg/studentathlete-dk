import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getAthleteBySlug,
  getAthleteSlugByAlias,
  getArticlesByAthleteId,
  getAthleteEvents,
  getSchoolBySlug,
  getAthletesByUniversity,
  getArticlesByUniversity,
  getArticleBySlug,
  getAthletesBySport,
  getArticlesBySport,
  countAthletesBySport,
} from "@/lib/db";
import { getPublishedPageBySlug, getPublishedSportBySlug } from "@/lib/admin";
import { currentLanguage, currentSite, currentBaseUrl, siteRobots } from "@/lib/site-server";
import { getAthleteUrl, getSchoolUrl, getArticleUrl, getOgImageUrl, getArticleCoverUrl} from "@/lib/seo";
import { getSportContent, type SportContent } from "@/lib/sport-content";
import { urlSlugToDbSport, dbSportToUrlSlug } from "@/lib/types";
import { sportLabel, t } from "@/lib/i18n";
import { AthleteProfilePage } from "@/components/profiles/AthleteProfilePage";
import { SchoolProfilePage } from "@/components/profiles/SchoolProfilePage";
import { SportLandingPage } from "@/components/SportLandingPage";
import { NewsTemplate } from "@/components/templates/NewsTemplate";
import { FeatureTemplate } from "@/components/templates/FeatureTemplate";
import { RecruitingTemplate } from "@/components/templates/RecruitingTemplate";
import { SeasonUpdateTemplate } from "@/components/templates/SeasonUpdateTemplate";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { AdminEditButton } from "@/components/AdminEditButton";

type Params = Promise<{ segments: string[] }>;

// Sport-landingsindhold: D1-override (redigerbar i admin) over kode-default.
async function resolveSportContent(slug: string): Promise<SportContent | null> {
  // Kode-default på sitets SPROG, D1-override på sitets LAND — samme mønster
  // som resten af motoren (jf. ARKITEKTUR-motor.md).
  const base = getSportContent(slug, await currentLanguage());
  if (!base) return null;
  const db = await getPublishedSportBySlug(slug);
  if (!db) return base;
  return {
    ...base,
    title: db.title || base.title,
    metaDescription: db.meta_description ?? base.metaDescription,
    pillar: db.content || base.pillar,
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const base = await currentBaseUrl();
  const { segments } = await params;
  // Brand og sprog følger værten — titler er læservendte og må ikke være
  // hardkodet til .dk-sitet.
  const site = await currentSite();
  const brand = site.brand;
  const lang = site.language;

  // ── 1 segment: /{sport} → sport-landingsside ────────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];

    const sportContent = await resolveSportContent(slug);
    if (sportContent) {
      const canonicalUrl = `${base}/${slug}`;
      const ogImage = getOgImageUrl({
        title: sportContent.title,
        subtitle: sportContent.intro,
        sport: slug,
        type: "sport",
      });
      return {
        title: `${t("meta.sport_title", lang, { sport: sportContent.title })} | ${brand}`,
        description: sportContent.metaDescription,
        openGraph: {
          title: `${sportContent.title} | ${brand}`,
          description: sportContent.metaDescription,
          images: [{ url: ogImage, width: 1200, height: 630, alt: sportContent.title }],
          type: "website",
          siteName: brand,
          url: canonicalUrl,
        },
        twitter: {
          card: "summary_large_image",
          title: `${sportContent.title} | ${brand}`,
          description: sportContent.metaDescription,
          images: [ogImage],
        },
        alternates: { canonical: canonicalUrl },
        robots: await siteRobots(),
      };
    }

    // Statisk side fra pages-tabellen
    const page = await getPublishedPageBySlug(slug);
    if (page) {
      return {
        title: `${page.title} | ${brand}`,
        description: page.meta_description ?? undefined,
        alternates: { canonical: `${base}/${slug}` },
        robots: await siteRobots(),
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
          t("meta.athlete_description", lang, { name: athlete.name, sport: sportLabel(athlete.sport, lang).toLowerCase(), university: athlete.university, brand });
        const ogImage = athlete.photo_url
          ?? getOgImageUrl({
               title: athlete.name,
               subtitle: `${athlete.university} · ${sportLabel(athlete.sport, lang)}`,
               sport: athlete.sport,
               type: "athlete",
             });
        return {
          title: `${athlete.name} – ${sportLabel(athlete.sport, lang)} | ${brand}`,
          description,
          openGraph: {
            title: `${athlete.name} | ${brand}`,
            description,
            images: [{ url: ogImage, width: 1200, height: 630, alt: athlete.name }],
            type: "profile",
            siteName: brand,
            url: `${base}${getAthleteUrl(slug)}`,
          },
          twitter: {
            card: "summary_large_image",
            title: `${athlete.name} | ${brand}`,
            description,
            images: [ogImage],
          },
          alternates: { canonical: `${base}${getAthleteUrl(slug)}` },
          robots: await siteRobots(),
        };
      }
    }

    // /skoler/{slug} → skole-profil
    if (prefix === "skoler") {
      const school = await getSchoolBySlug(slug);
      if (school) {
        const where = `${school.name}${school.state ? `, ${school.state}` : ""}`;
        const description = `${t("meta.school_description", lang, { school: where })} ${school.division}${school.conference ? `, ${school.conference}` : ""}.`;
        return {
          title: `${school.name} | ${brand}`,
          description,
          openGraph: {
            title: `${school.name} | ${brand}`,
            description,
            type: "website",
            siteName: brand,
            url: `${base}${getSchoolUrl(slug)}`,
          },
          alternates: { canonical: `${base}${getSchoolUrl(slug)}` },
          robots: await siteRobots(),
        };
      }
    }

    // /{sport}/{slug} → artikel
    const article = await getArticleBySlug(slug);
    const normalizedSport = dbSportToUrlSlug(article?.sport ?? "sport");
    if (article && normalizedSport === prefix) {
      const canonicalUrl = `${base}${getArticleUrl(article)}`;
      // Brug det genererede 16:9 kampkort som og:image (skarpt + ensartet),
      // ikke et evt. stamplet portræt-headshot fra cover_image_url.
      const ogImage = `${base}${getArticleCoverUrl(article)}`;

      return {
        title: `${article.title} | ${brand}`,
        description:
          article.summary ??
          t("meta.article_description", lang, { who: article.athlete_name ?? "", brand }),
        openGraph: {
          title: article.title,
          description: article.summary ?? undefined,
          images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
          type: "article",
          publishedTime: article.published_at ?? undefined,
          modifiedTime: article.updated_at,
          tags: [article.sport ? sportLabel(article.sport, lang) : null, article.article_type, "student athlete", "dansk"]
            .filter(Boolean) as string[],
          siteName: brand,
          url: canonicalUrl,
        },
        twitter: {
          card: "summary_large_image",
          title: article.title,
          description: article.summary ?? undefined,
          images: [ogImage],
        },
        alternates: { canonical: canonicalUrl },
        robots: await siteRobots(),
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
    const sportContent = await resolveSportContent(slug);
    if (sportContent) {
      const dbSport = urlSlugToDbSport(slug);
      const [articles, athletes, counts] = await Promise.all([
        getArticlesBySport(dbSport, 7),
        getAthletesBySport(dbSport, 30),
        countAthletesBySport(dbSport),
      ]);
      return (
        <>
          <SportLandingPage
            sport={slug}
            content={sportContent}
            articles={articles}
            athletes={athletes}
            counts={counts}
          />
          <AdminEditButton href={`/admin/sider/${slug}`} label="Rediger sportsside" />
        </>
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
          <AdminEditButton href={`/admin/sider/${slug}`} label="Rediger side" />
        </main>
      );
    }

    // Legacy: /{slug} → /atleter/{slug} (301 permanent redirect)
    const athlete = await getAthleteBySlug(slug);
    if (athlete) redirect(getAthleteUrl(athlete.slug));

    // Nedlagt atlet-slug (navneskift/fletning) → atletens nuværende URL
    const aliasTarget = await getAthleteSlugByAlias(slug);
    if (aliasTarget) redirect(getAthleteUrl(aliasTarget));

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
      if (!athlete) {
        // Gammel slug efter navneskift eller fletning → 301 til den nuværende
        const aliasTarget = await getAthleteSlugByAlias(slug);
        if (aliasTarget) redirect(getAthleteUrl(aliasTarget));
      }
      if (athlete) {
        const [articles, events] = await Promise.all([
          getArticlesByAthleteId(athlete.id, 10),
          getAthleteEvents(athlete.id),
        ]);
        return (
          <>
            <AthleteProfilePage athlete={athlete} articles={articles} events={events} />
            <AdminEditButton href={`/admin/atleter/${athlete.id}`} label="Rediger atlet" />
          </>
        );
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
        // Skolerne er fælles for alle sites, atleterne er ikke. Har sitet ingen
        // atleter dér, er siden tom — og en tom side skal 404'e, ikke findes på
        // hvert domæne.
        if (athletes.length === 0 && articles.length === 0) notFound();
        return (
          <>
            <SchoolProfilePage school={school} athletes={athletes} articles={articles} />
            <AdminEditButton href="/admin/skoler" label="Rediger skoler" />
          </>
        );
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

      let template;
      switch (article.article_type) {
        case "feature":       template = <FeatureTemplate {...props} />; break;
        case "recruiting":    template = <RecruitingTemplate {...props} />; break;
        case "season_update": template = <SeasonUpdateTemplate {...props} />; break;
        default:              template = <NewsTemplate {...props} />;
      }
      return (
        <>
          {template}
          <AdminEditButton href={`/admin/rediger/${article.id}`} label="Rediger artikel" />
        </>
      );
    }
  }

  notFound();
}
