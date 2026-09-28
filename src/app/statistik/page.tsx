import type { Metadata } from "next";
import { currentLanguage, currentSite } from "@/lib/site-server";
import { routePath, t } from "@/lib/i18n";
import { StatsShell } from "./StatsShell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [lang, site] = await Promise.all([currentLanguage(), currentSite()]);
  return {
    title: `${t("stats.meta_title", lang)} | ${site.brand}`,
    description: t("stats.meta_description", lang),
    alternates: { canonical: routePath("stats", lang) },
  };
}

export default async function StatsPage() {
  const [lang, site] = await Promise.all([currentLanguage(), currentSite()]);
  return <StatsShell lang={lang} country={site.code} nation={null} title={t("stats.meta_title", lang)} />;
}
