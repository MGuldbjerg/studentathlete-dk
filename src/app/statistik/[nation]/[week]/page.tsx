import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentLanguage, currentSite } from "@/lib/site-server";
import { routePath, t } from "@/lib/i18n";
import { formatDate } from "@/lib/seo";
import { getLeaderboardWeek } from "@/lib/db";
import { LEADERBOARD_SLUG } from "@/components/LeaderboardView";
import { LeaderboardWeekView } from "@/components/LeaderboardWeekView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { plain, weekHeadline, weekSections } from "@/lib/leaderboard-week";

export const dynamic = "force-dynamic";

/** The weekly update of the leaderboard: /statistics/leaderboard/2026-11-03 (src/lib/leaderboard-week.ts). */
async function weekFor(params: Promise<{ nation: string; week: string }>) {
  const [{ nation, week }, site, lang] = await Promise.all([params, currentSite(), currentLanguage()]);
  if (nation !== LEADERBOARD_SLUG[lang] || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  const data = await getLeaderboardWeek(site.code, week);
  if (!data) return null;
  const title = t("board.week_title", lang, {
    date: formatDate(data.to, lang, { day: "numeric", month: "long", year: "numeric" }),
    headline: weekHeadline(data, lang),
  });
  return { site, lang, week, data, title };
}

export async function generateMetadata({ params }: { params: Promise<{ nation: string; week: string }> }): Promise<Metadata> {
  const w = await weekFor(params);
  if (!w) return {};
  const first = weekSections(w.data, w.lang)[0]?.lines.slice(0, 2).map(plain).join(" ") ?? "";
  return {
    title: `${w.title} | ${w.site.brand}`,
    description: first.slice(0, 300),
    alternates: { canonical: `${routePath("stats", w.lang)}/${LEADERBOARD_SLUG[w.lang]}/${w.week}` },
  };
}

export default async function LeaderboardWeekPage({ params }: { params: Promise<{ nation: string; week: string }> }) {
  const w = await weekFor(params);
  if (!w) notFound();
  const boardHref = `${routePath("stats", w.lang)}/${LEADERBOARD_SLUG[w.lang]}`;
  const date = (d: string) => formatDate(d, w.lang, { day: "numeric", month: "long" });
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <Breadcrumb crumbs={[
        { label: t("crumb.home", w.lang), href: "/" },
        { label: t("stats.crumb", w.lang), href: routePath("stats", w.lang) },
        { label: t("board.crumb", w.lang), href: boardHref },
        { label: date(w.data.to) },
      ]} />
      <h1 className="text-3xl font-bold text-ink mt-6 mb-3" style={{ fontFamily: "var(--font-serif)" }}>{w.title}</h1>
      <p className="text-sm text-ink/80 mb-8 max-w-2xl border-l-4 pl-3" style={{ borderColor: "#BF0A30" }}>
        {t("board.week_intro", w.lang, { from: date(w.data.from), to: date(w.data.to), n: String(w.data.active) })}
      </p>
      <LeaderboardWeekView week={w.data} lang={w.lang} />
      <p className="text-sm mt-10">
        <a href={boardHref} className="font-semibold hover:underline" style={{ color: "#BF0A30" }}>{t("board.week_full", w.lang)}</a>
      </p>
    </main>
  );
}
