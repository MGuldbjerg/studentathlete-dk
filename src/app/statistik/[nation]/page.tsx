import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentLanguage, currentSite } from "@/lib/site-server";
import { routePath, t } from "@/lib/i18n";
import { NATIONS, type Nation } from "@/lib/home-nation";
import { StatsShell } from "../StatsShell";
import { getLeaderboard } from "@/lib/db";
import { LeaderboardView, LEADERBOARD_SLUG } from "@/components/LeaderboardView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

/** The leaderboard lives under the stats page; its slug is the site language's. */
async function leaderboardFor(params: Promise<{ nation: string }>) {
  const [{ nation }, site, lang] = await Promise.all([params, currentSite(), currentLanguage()]);
  if (nation !== LEADERBOARD_SLUG[lang]) return null;
  return { site, lang, board: await getLeaderboard(site.code) };
}

const seasonOf = (asOf: string | undefined) => {
  const d = asOf ? new Date(asOf) : new Date();
  const y = d.getUTCMonth() + 1 >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
};

export const dynamic = "force-dynamic";

/** Only the UK site splits by nation; anything else is a 404. */
async function resolve(params: Promise<{ nation: string }>): Promise<{ nation: Nation; lang: string } | null> {
  const [{ nation }, site, lang] = await Promise.all([params, currentSite(), currentLanguage()]);
  if (site.code !== "UK" || !NATIONS.includes(nation as Nation)) return null;
  return { nation: nation as Nation, lang };
}

export async function generateMetadata({ params }: { params: Promise<{ nation: string }> }): Promise<Metadata> {
  const lb = await leaderboardFor(params);
  if (lb) {
    if (!lb.board) return {};
    const title = t("board.title", lb.lang, { season: seasonOf(lb.board.asOf) });
    return {
      title: `${title} | ${lb.site.brand}`,
      description: t("board.intro", lb.lang),
      alternates: { canonical: `${routePath("stats", lb.lang)}/${LEADERBOARD_SLUG[lb.lang]}` },
    };
  }
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
  const lb = await leaderboardFor(params);
  if (lb) {
    if (!lb.board || !lb.board.tables.length) notFound();
    const title = t("board.title", lb.lang, { season: seasonOf(lb.board.asOf) });
    return (
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <Breadcrumb crumbs={[
          { label: t("crumb.home", lb.lang), href: "/" },
          { label: t("stats.crumb", lb.lang), href: routePath("stats", lb.lang) },
          { label: title },
        ]} />
        <h1 className="text-3xl font-bold text-ink mt-6 mb-3" style={{ fontFamily: "var(--font-serif)" }}>{title}</h1>
        <p className="text-sm text-ink/80 mb-3 max-w-2xl border-l-4 pl-3" style={{ borderColor: "#BF0A30" }}>{t("board.intro", lb.lang)}</p>
        <LeaderboardView board={lb.board} lang={lb.lang} />
      </main>
    );
  }
  const r = await resolve(params);
  if (!r) notFound();
  const name = t(`stats.nation.${r.nation}` as const, r.lang);
  return <StatsShell lang={r.lang} country="UK" nation={r.nation} title={t("stats.nation_meta_title", r.lang, { nation: name })} />;
}
