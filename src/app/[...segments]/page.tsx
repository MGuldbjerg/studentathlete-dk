import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getAllAthletes,
  getAlumniAthletes,
  getAthleteInitialCounts,
  getAthletesByLetter,
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
import { sportLabel, t, sportKeyFromSlugAnyLanguage, routeSlug } from "@/lib/i18n";
import { AthleteProfilePage } from "@/components/profiles/AthleteProfilePage";
import { AthleteLetterPage } from "@/components/athletes/AthleteLetterPage";
import {
  alphabetFor,
  athletesAllPath,
  countByLetter,
  foldInitialCounts,
  getAthleteLetterUrl,
  letterCases,
  letterFromSlug,
} from "@/lib/athlete-letters";
import { AthleteFullList, parseSort } from "@/components/athletes/AthleteFullList";
import { subRouteSlug, routePath } from "@/lib/i18n";
import { SchoolProfilePage } from "@/components/profiles/SchoolProfilePage";
import { SportLandingPage } from "@/components/SportLandingPage";
import { NewsTemplate } from "@/components/templates/NewsTemplate";
import { FeatureTemplate } from "@/components/templates/FeatureTemplate";
import { RecruitingTemplate } from "@/components/templates/RecruitingTemplate";
import { SeasonUpdateTemplate } from "@/components/templates/SeasonUpdateTemplate";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { AdminEditButton } from "@/components/AdminEditButton";

type Params = Promise<{ segments: string[] }>;
type Search = Promise<{ sort?: string }>;

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
    const lang = await currentLanguage();

    // Middlewaren skriver sitets egen sti om til app-routerens (danske) navn,
    // så `prefix` er normalt "atleter"/"skoler" her. Sitets eget navn
    // accepteres OGSÅ direkte, så en manglende rewrite giver den rigtige side
    // frem for en 404.
    const isRoute = (key: "athletes" | "schools" | "guides" | "archive", physical: string) =>
      prefix === physical || prefix === routeSlug(key, lang);

    // /atleter|/athletes/{all|alle} → hele listen. Slås op FØRST: sluggen er
    // sprogets eget ord, og den må aldrig kunne skygges af en atlet.
    if (isRoute("athletes", "atleter") && slug === subRouteSlug("athletesAll", lang)) {
      const url = `${base}${athletesAllPath(lang)}`;
      const description = t("athletes.all_meta_description", lang);
      return {
        title: `${t("athletes.all_meta_title", lang)} | ${brand}`,
        description,
        openGraph: {
          title: `${t("athletes.all_meta_title", lang)} | ${brand}`,
          description,
          type: "website",
          siteName: brand,
          url,
        },
        alternates: { canonical: url },
        robots: await siteRobots(),
      };
    }

    // /atleter|/athletes/{bogstav} → bogstavside.
    // Slås op FØR profilen: en atlet-slug er altid "fornavn-efternavn", så et
    // enkelt bogstav kan ikke være en profil — og `letterFromSlug` accepterer
    // kun bogstaver der står i sprogets eget alfabet.
    if (isRoute("athletes", "atleter")) {
      const letter = letterFromSlug(slug, lang);
      // Samme lille optælling som selve siden — ikke hele tabellen igen.
      const letterCounts = letter ? foldInitialCounts(await getAthleteInitialCounts(), lang) : null;
      if (letter && letterCounts?.get(letter)) {
        const url = `${base}${getAthleteLetterUrl(letter, lang)}`;
        const description = t("athletes.letter_meta_description", lang, { letter });
        return {
          title: `${t("athletes.letter_meta_title", lang, { letter })} | ${brand}`,
          description,
          openGraph: {
            title: `${t("athletes.letter_meta_title", lang, { letter })} | ${brand}`,
            description,
            type: "website",
            siteName: brand,
            url,
          },
          alternates: { canonical: url },
          robots: await siteRobots(),
        };
      }
    }

    // /atleter|/athletes/{slug} → atlet-profil
    if (isRoute("athletes", "atleter")) {
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
            url: `${base}${getAthleteUrl(slug, lang)}`,
          },
          twitter: {
            card: "summary_large_image",
            title: `${athlete.name} | ${brand}`,
            description,
            images: [ogImage],
          },
          alternates: { canonical: `${base}${getAthleteUrl(slug, lang)}` },
          robots: await siteRobots(),
        };
      }
    }

    // /skoler|/schools/{slug} → skole-profil
    if (isRoute("schools", "skoler")) {
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
            url: `${base}${getSchoolUrl(slug, lang)}`,
          },
          alternates: { canonical: `${base}${getSchoolUrl(slug, lang)}` },
          robots: await siteRobots(),
        };
      }
    }

    // /{sport}/{slug} → artikel
    const article = await getArticleBySlug(slug);
    const normalizedSport = dbSportToUrlSlug(article?.sport ?? "sport", lang);
    if (article && normalizedSport === prefix) {
      const canonicalUrl = `${base}${getArticleUrl(article, lang)}`;
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
          // Her stod "dansk" hårdkodet — også på britiske artikler. Landet
          // kommer fra artiklen/sitet, ikke fra standardsitet.
          tags: [article.sport ? sportLabel(article.sport, lang) : null, article.article_type, "student athlete", site.code.toLowerCase()]
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

export default async function DynamicPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { segments } = await params;

  // ── 1 segment: /{sport} eller legacy-redirect ───────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];
    const lang = await currentLanguage();

    // Sport-landingsside
    const sportContent = await resolveSportContent(slug);
    if (sportContent) {
      // SPROGET SKAL MED. Uden det slås sluggen op i standardsitets tabel, og
      // «football» betyder ikke det samme i de to: på .co.uk er det soccer, på
      // .dk er det amerikansk fodbold. Resultatet var en engelsk side med
      // overskriften "Football" (soccer) fyldt med amerikansk fodbold-atleter.
      const dbSport = urlSlugToDbSport(slug, lang);
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

    // Sport-slug fra det ANDET sprog (fx /fodbold på .co.uk): ikke vores
    // adresse, men genkendelig — send videre frem for at ende i 404.
    // `permanentRedirect` (308) og ikke `redirect` (307): adressen er flyttet
    // for altid, og kun en permanent kode flytter en indeksering med.
    const crossLangSport = sportKeyFromSlugAnyLanguage(slug, lang);
    if (crossLangSport) {
      const own = dbSportToUrlSlug(crossLangSport, lang);
      if (own !== slug) permanentRedirect(`/${own}`);
    }

    // Legacy: /{slug} → /atleter/{slug} (301 permanent redirect)
    const athlete = await getAthleteBySlug(slug);
    if (athlete) permanentRedirect(getAthleteUrl(athlete.slug, lang));

    // Nedlagt atlet-slug (navneskift/fletning) → atletens nuværende URL
    const aliasTarget = await getAthleteSlugByAlias(slug);
    if (aliasTarget) permanentRedirect(getAthleteUrl(aliasTarget, lang));

    // Legacy: /{slug} → /skoler/{slug} (301 permanent redirect)
    const school = await getSchoolBySlug(slug);
    if (school) permanentRedirect(getSchoolUrl(school.slug, lang));
  }

  // ── 2 segmenter ─────────────────────────────────────────────────────────
  if (segments.length === 2) {
    const [prefix, slug] = segments;
    const lang = await currentLanguage();

    // Middlewaren skriver sitets egen sti om til app-routerens (danske) navn,
    // så `prefix` er normalt "atleter"/"skoler" her. Sitets eget navn
    // accepteres OGSÅ direkte, så en manglende rewrite giver den rigtige side
    // frem for en 404.
    const isRoute = (key: "athletes" | "schools", physical: string) =>
      prefix === physical || prefix === routeSlug(key, lang);

    // /atleter|/athletes/{all|alle} → hele listen (før bogstav og profil)
    if (isRoute("athletes", "atleter") && slug === subRouteSlug("athletesAll", lang)) {
      const [active, alumni, sp] = await Promise.all([
        getAllAthletes(),
        getAlumniAthletes(),
        searchParams,
      ]);
      return (
        <main className="max-w-5xl mx-auto px-4 md:px-8 py-10">
          <p className="mb-4 text-sm">
            <Link href={routePath("athletes", lang)} className="text-muted hover:text-ink hover:underline">
              ← {t("athletes.letter_back", lang)}
            </Link>
          </p>
          <h1 className="text-3xl font-bold text-ink mb-2" style={{ fontFamily: "var(--font-serif)" }}>
            {t("athletes.all_h1", lang)}
          </h1>
          <p className="text-muted text-sm mb-4">
            {t("athletes.active_count", lang, { n: String(active.length) })}
            {alumni.length > 0 ? ` · ${t("athletes.alumni_count", lang, { n: String(alumni.length) })}` : ""}
          </p>
          <p className="text-ink text-sm mb-8 max-w-2xl">{t("athletes.all_intro", lang)}</p>
          <AthleteFullList
            active={active}
            alumni={alumni}
            sort={parseSort(sp.sort)}
            lang={lang}
          />
        </main>
      );
    }

    // /atleter|/athletes/{bogstav} → bogstavside (før profilen, se ovenfor)
    if (isRoute("athletes", "atleter")) {
      const letter = letterFromSlug(slug, lang);
      if (letter) {
        // Den fulde liste er ét indekseret opslag og hentes alligevel af
        // oversigten. Opdelingen sker i JS, fordi SQLite's `upper()` er
        // ASCII-only og ville lægge "Østergaard" uden for alfabetet.
        // To målrettede forespørgsler i stedet for hele tabellen: bogstavets
        // egne rækker, og en lille optælling til alfabet-navigationen.
        const { upper, lower } = letterCases(letter, lang);
        const [forLetter, initialRows] = await Promise.all([
          getAthletesByLetter(upper, lower, undefined),
          getAthleteInitialCounts(),
        ]);
        // Et bogstav uden atleter er en tom side der svarer 200 — en soft-404.
        // Sitemappet udelader dem og alfabetet linker ikke til dem, men
        // adressen kan stadig gættes, og så skal svaret være ærligt.
        if (forLetter.length === 0) notFound();
        return (
          <AthleteLetterPage
            letter={letter}
            athletes={forLetter}
            counts={foldInitialCounts(initialRows, lang)}
            alphabet={alphabetFor(lang)}
            lang={lang}
          />
        );
      }
    }

    // /atleter|/athletes/{slug} → atlet-profil
    if (isRoute("athletes", "atleter")) {
      const athlete = await getAthleteBySlug(slug);
      if (!athlete) {
        // Gammel slug efter navneskift eller fletning → 301 til den nuværende
        const aliasTarget = await getAthleteSlugByAlias(slug);
        if (aliasTarget) permanentRedirect(getAthleteUrl(aliasTarget, lang));
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

    // /skoler|/schools/{slug} → skole-profil
    if (isRoute("schools", "skoler")) {
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
    const normalizedSport = dbSportToUrlSlug(article?.sport ?? "sport", lang);

    // Adressen tilhører sitets sprog. Kommer læseren (eller Google) med det
    // ANDET sprogs slug — fx `/fodbold/…` på .co.uk, som var det vi selv
    // linkede til indtil 21. august 2026 — så send videre i stedet for at give
    // 404. Kun når sluggen betyder PRÆCIS samme sportsgren: dansk "football"
    // (amerikansk fodbold) må aldrig kunne sende en soccer-artikel videre.
    if (article && normalizedSport !== prefix) {
      const asKey = sportKeyFromSlugAnyLanguage(prefix, lang);
      if (asKey && asKey === (article.sport ?? "").toLowerCase()) {
        permanentRedirect(getArticleUrl(article, lang));
      }
    }

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
