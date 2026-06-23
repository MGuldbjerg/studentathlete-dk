import type { MetadataRoute } from "next";
import { getAllArticleSlugs, getAllAthleteSlugs, getAllSchoolSlugs } from "@/lib/db";
import { BASE_URL } from "@/lib/seo";
import { getSportSlugs } from "@/lib/sport-content";
import { getGuideSlugs } from "@/lib/viden-content";
import { getPublishedGuides } from "@/lib/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, athletes, schools] = await Promise.all([
    getAllArticleSlugs(),
    getAllAthleteSlugs(),
    getAllSchoolSlugs(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/atleter`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/viden`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/skoler`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...["om", "kontakt", "ai-brug"].map((slug) => ({
      url: `${BASE_URL}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  // Viden-guider — D1 (redigerbar) som primær, kode-slugs som fallback
  const dbGuides = await getPublishedGuides();
  const guideSlugs = dbGuides.length ? dbGuides.map((g) => g.slug) : getGuideSlugs();
  const guidePages: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: `${BASE_URL}/viden/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Sport-landingssider (pillar pages)
  const sportPages: MetadataRoute.Sitemap = getSportSlugs().map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => {
    const sport = (a.sport ?? "sport").toLowerCase().replace(/\s+/g, "-");
    return {
      url: `${BASE_URL}/${sport}/${a.slug}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  const athletePages: MetadataRoute.Sitemap = athletes.map((a) => ({
    url: `${BASE_URL}/atleter/${a.slug}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const schoolPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${BASE_URL}/skoler/${s.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...guidePages, ...sportPages, ...articlePages, ...athletePages, ...schoolPages];
}
