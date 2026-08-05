import type { MetadataRoute } from "next";
import { currentBaseUrl, currentSite } from "@/lib/site-server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await currentBaseUrl();

  // Dark launch: sitet må ikke indekseres, før indholdet er dets eget.
  // Uden dette bliver et nyt landesite crawlet mens det stadig viser
  // standardsitets atleter — altså som en dublet af det.
  if ((await currentSite()).darkLaunch) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
