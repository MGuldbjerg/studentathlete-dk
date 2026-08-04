import type { MetadataRoute } from "next";
import { getAllArticleSlugs, getAllAthleteSlugs, getAllSchoolSlugs } from "@/lib/db";
import { getSportSlugs } from "@/lib/sport-content";
import { getGuideSlugs } from "@/lib/viden-content";
import { getPublishedGuides } from "@/lib/admin";
import { ARCHIVE_PATH } from "@/lib/routes";
import { currentLanguage, currentBaseUrl } from "@/lib/site-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await currentBaseUrl();
  const [articles, athletes, schools] = await Promise.all([
    getAllArticleSlugs(),
    getAllAthleteSlugs(),
    getAllSchoolSlugs(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}${ARCHIVE_PATH}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/atleter`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/viden`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/skoler`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...["om", "kontakt", "ai-brug", "presseetik", "cookies"].map((slug) => ({
      url: `${base}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  // Viden-guider — D1 (redigerbar) som primær, kode-slugs som fallback
  const dbGuides = await getPublishedGuides();
  const guideSlugs = dbGuides.length ? dbGuides.map((g) => g.slug) : getGuideSlugs(await currentLanguage());
  const guidePages: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: `${base}/viden/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Sport-landingssider (pillar pages)
  const sportPages: MetadataRoute.Sitemap = getSportSlugs(await currentLanguage()).map((slug) => ({
    url: `${base}/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => {
    const sport = (a.sport ?? "sport").toLowerCase().replace(/\s+/g, "-");
    return {
      url: `${base}/${sport}/${a.slug}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  const athletePages: MetadataRoute.Sitemap = athletes.map((a) => ({
    url: `${base}/atleter/${a.slug}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const schoolPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${base}/skoler/${s.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...guidePages, ...sportPages, ...articlePages, ...athletePages, ...schoolPages];
}
