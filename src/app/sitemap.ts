import type { MetadataRoute } from "next";
import { getAllArticleSlugs, getAllAthleteSlugs, getAllSchoolSlugs } from "@/lib/db";
import { getSportSlugs } from "@/lib/sport-content";
import { getArticleUrl, getAthleteUrl, getSchoolUrl } from "@/lib/seo";
import { getGuideSlugs } from "@/lib/viden-content";
import { getPublishedGuides } from "@/lib/admin";
import { archivePath } from "@/lib/routes";
import { routePath } from "@/lib/i18n";
import { alphabetFor, athletesAllPath, countByLetter, getAthleteLetterUrl, letterOf } from "@/lib/athlete-letters";
import { currentLanguage, currentBaseUrl } from "@/lib/site-server";

/**
 * Aldrig prærenderet. To grunde, og den anden er den vigtigste:
 *
 * 1. Ved BYGGETID returnerer `getDB()` ikke null — den giver en binding til
 *    den TOMME lokale miniflare-base. Slug-opslagene kaster nu ved fejl
 *    (se «heller ikke et kortere sitemap» i db.ts), og `no such table:
 *    articles` væltede derfor byggeriet. Før sluges fejlen, og byggeriet
 *    lavede glad et sitemap ud af en tom database.
 *
 * 2. Et prærenderet sitemap er FROSSET på deploy-tidspunktet. Der er ingen
 *    incremental cache konfigureret (se wrangler.toml), så en artikel udgivet
 *    i morgen ville aldrig nå ind i det. Sitemappet skal læse basen, hver
 *    gang der spørges.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await currentBaseUrl();
  const lang = await currentLanguage();
  const [articles, athletes, schools] = await Promise.all([
    getAllArticleSlugs(),
    getAllAthleteSlugs(),
    getAllSchoolSlugs(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: base,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}${archivePath(lang)}`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}${routePath("athletes", lang)}`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}${athletesAllPath(lang)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${base}${routePath("guides", lang)}`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}${routePath("schools", lang)}`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...["om", "kontakt", "ai-brug", "presseetik", "cookies"].map((slug) => ({
      url: `${base}/${slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  // Viden-guider — D1 (redigerbar) som primær, kode-slugs som fallback
  const dbGuides = await getPublishedGuides();
  const guideSlugs = dbGuides.length ? dbGuides.map((g) => g.slug) : getGuideSlugs(await currentLanguage());
  const guidePages: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: `${base}${routePath("guides", lang)}/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Sport-landingssider (pillar pages)
  const sportPages: MetadataRoute.Sitemap = getSportSlugs(lang).map((slug) => ({
    url: `${base}/${slug}`,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Adressen SKAL bygges med `getArticleUrl` — samme funktion som links og
  // canonical. Her stod DB-nøglen direkte ("soccer"), mens sitet serverer
  // sprogets slug ("fodbold"/"football"): hver eneste fodboldartikel i
  // sitemappet pegede på en 404 (verificeret på .dk 2026-08-21).
  const articlePages: MetadataRoute.Sitemap = articles.map((a) => {
    return {
      url: `${base}${getArticleUrl(a, lang)}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  // Bogstavsiderne (/athletes/a). KUN bogstaver der faktisk har aktive
  // atleter — et sitemap der peger på tomme sider er soft-404'er, og dem har
  // et ungt domæne ikke råd til. Alumni tæller ikke med: bogstavsiden viser
  // den aktive liste, præcis som oversigten.
  const letterCounts = countByLetter(athletes.filter((a) => a.active === 1), lang);
  // `lastModified` skal være et SIGNAL, ikke et tidsstempel for hentningen.
  // Stod som `new Date()`, altså «ændret lige nu» hver eneste gang Google
  // hentede sitemappet — for hele den statiske del af sitet. Et sitemap der
  // altid råber «alt er nyt» lærer Google at ignorere feltet. Bogstavsiden
  // ændrer sig når en atlet under bogstavet gør, så det er dét vi skriver.
  const activeAthletes = athletes.filter((a) => a.active === 1);
  const letterPages: MetadataRoute.Sitemap = alphabetFor(lang)
    .filter((letter) => (letterCounts.get(letter) ?? 0) > 0)
    .map((letter) => {
      const newest = activeAthletes
        .filter((a) => letterOf(a.name, lang) === letter)
        .map((a) => a.updated_at)
        .sort()
        .at(-1);
      return {
        url: `${base}${getAthleteLetterUrl(letter, lang)}`,
        ...(newest ? { lastModified: new Date(newest) } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    });

  const athletePages: MetadataRoute.Sitemap = athletes.map((a) => ({
    url: `${base}${getAthleteUrl(a.slug, lang)}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const schoolPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${base}${getSchoolUrl(s.slug, lang)}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...guidePages, ...sportPages, ...letterPages, ...articlePages, ...athletePages, ...schoolPages];
}
