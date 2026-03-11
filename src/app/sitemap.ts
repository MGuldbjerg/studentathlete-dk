import type { MetadataRoute } from "next";
import { getAllArticleSlugs, getAllAthleteSlugs, getAllSchoolSlugs } from "@/lib/db";
import { BASE_URL } from "@/lib/seo";

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
  ];

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
    url: `${BASE_URL}/${a.slug}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const schoolPages: MetadataRoute.Sitemap = schools.map((s) => ({
    url: `${BASE_URL}/${s.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...articlePages, ...athletePages, ...schoolPages];
}
