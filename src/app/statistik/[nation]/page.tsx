import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentLanguage, currentSite } from "@/lib/site-server";
import { routePath, t } from "@/lib/i18n";
import { NATIONS, type Nation } from "@/lib/home-nation";
import { StatsShell } from "../StatsShell";

export const dynamic = "force-dynamic";

/** Only the UK site splits by nation; anything else is a 404. */
async function resolve(params: Promise<{ nation: string }>): Promise<{ nation: Nation; lang: string } | null> {
  const [{ nation }, site, lang] = await Promise.all([params, currentSite(), currentLanguage()]);
  if (site.code !== "UK" || !NATIONS.includes(nation as Nation)) return null;
  return { nation: nation as Nation, lang };
}

export async function generateMetadata({ params }: { params: Promise<{ nation: string }> }): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return {};
  const site = await currentSite();
  const name = t(`stats.nation.${r.nation}` as const, r.lang);
  return {
    title: `${t("stats.nation_meta_title", r.lang, { nation: name })} | ${site.brand}`,
    description: t("stats.meta_description", r.lang),
    alternates: { canonical: `${routePath("stats", r.lang)}/${r.nation}` },
  };
}

export default async function NationStatsPage({ params }: { params: Promise<{ nation: string }> }) {
  const r = await resolve(params);
  if (!r) notFound();
  const name = t(`stats.nation.${r.nation}` as const, r.lang);
  return <StatsShell lang={r.lang} country="UK" nation={r.nation} title={t("stats.nation_meta_title", r.lang, { nation: name })} />;
}
