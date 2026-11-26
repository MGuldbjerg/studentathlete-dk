import type { Metadata } from "next";
import { currentBaseUrl, currentLanguage, currentSite } from "@/lib/site-server";
import { routePath, t } from "@/lib/i18n";
import { breadcrumbStructuredData } from "@/lib/seo";
import { jsonLdHtml } from "@/lib/json-ld";
import { SEASON, formatUpdated } from "@/lib/season-calendar";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { FullSeasonCalendar, KeyDatesTables, SeasonCalendarFaq } from "@/components/season-calendar/SeasonCalendarServer";
import { withAds } from "@/components/AdsenseScript";

/**
 * The season calendar (`/ncaa-saesonkalender` · `/ncaa-season-calendar`). Static
 * data; the folder is the Danish slug and the middleware rewrites the English one.
 * Title, intro, key-dates tables and FAQ follow PLAN-seo-season-calendar.md
 * (approved by Mikkel 2026-11-26). The year lives in the title, never the URL.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [lang, site] = await Promise.all([currentLanguage(), currentSite()]);
  return {
    title: `${t("cal.meta_title", lang, { season: SEASON.label })} | ${site.brand}`,
    description: t("cal.meta_description", lang, { season: SEASON.label }),
    alternates: { canonical: routePath("calendar", lang) },
  };
}

async function SeasonCalendarPage() {
  const [lang, base] = await Promise.all([currentLanguage(), currentBaseUrl()]);
  const jsonLd = breadcrumbStructuredData([
    { name: t("crumb.home", lang), url: base },
    { name: t("cal.crumb", lang), url: `${base}${routePath("calendar", lang)}` },
  ]);
  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <Breadcrumb crumbs={[{ label: t("crumb.home", lang), href: "/" }, { label: t("cal.crumb", lang) }]} />
      <header className="mt-6 mb-8 grid gap-3 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
          {t("cal.title", lang, { season: SEASON.label })}
        </h1>
        <p className="text-xs font-semibold uppercase tracking-widest text-flag-red">
          {t("cal.updated", lang, { date: formatUpdated(lang) })}
        </p>
        <p className="text-ink/85 text-base md:text-lg leading-relaxed">{t("cal.lede", lang)}</p>
        <p className="text-sm text-muted border-l-2 border-border pl-3">
          {t("cal.sources_note", lang, { season: SEASON.label })}
        </p>
      </header>
      <FullSeasonCalendar lang={lang} />
      <KeyDatesTables lang={lang} />
      <SeasonCalendarFaq lang={lang} />
      <p className="text-sm text-muted mt-10 pt-4 border-t border-border max-w-3xl">{t("cal.footnote", lang)}</p>
    </main>
  );
}

export default withAds(SeasonCalendarPage);
