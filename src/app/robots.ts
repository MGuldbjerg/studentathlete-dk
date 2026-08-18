import type { MetadataRoute } from "next";
import { currentBaseUrl, currentSite } from "@/lib/site-server";
import { robotsRules } from "@/lib/robots-txt";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await currentBaseUrl();

  // Dark launch: sitet må ikke indekseres, før indholdet er dets eget.
  // Uden dette bliver et nyt landesite crawlet mens det stadig viser
  // standardsitets atleter — altså som en dublet af det.
  const dark = (await currentSite()).darkLaunch;
  if (dark) return { rules: robotsRules(true) };

  // Reglerne (og hvorfor `/api/og` SKAL være tilladt) står i src/lib/robots-txt.ts.
  return { rules: robotsRules(false), sitemap: `${base}/sitemap.xml` };
}
