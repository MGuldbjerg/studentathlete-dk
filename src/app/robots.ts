import type { MetadataRoute } from "next";
import { currentBaseUrl } from "@/lib/site-server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await currentBaseUrl();
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
