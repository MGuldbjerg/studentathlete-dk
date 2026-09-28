import { getSiteStats } from "@/lib/db";
import { breadcrumbStructuredData } from "@/lib/seo";
import { currentBaseUrl } from "@/lib/site-server";
import { routePath, t } from "@/lib/i18n";
import type { Nation } from "@/lib/home-nation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatsView } from "./StatsView";

/** Shared frame for the stats pages: crumbs, heading, disclaimer, numbers. */
export async function StatsShell({
  lang,
  country,
  nation,
  title,
}: {
  lang: string;
  country: string;
  nation: Nation | null;
  title: string;
}) {
  const [data, siteBase] = await Promise.all([getSiteStats(country), currentBaseUrl()]);
  const statsUrl = `${siteBase}${routePath("stats", lang)}`;
  const jsonLd = breadcrumbStructuredData([
    { name: t("crumb.home", lang), url: siteBase },
    { name: t("stats.crumb", lang), url: statsUrl },
    ...(nation ? [{ name: t(`stats.nation.${nation}` as const, lang), url: `${statsUrl}/${nation}` }] : []),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        crumbs={[
          { label: t("crumb.home", lang), href: "/" },
          nation
            ? { label: t("stats.crumb", lang), href: routePath("stats", lang) }
            : { label: t("stats.crumb", lang) },
          ...(nation ? [{ label: t(`stats.nation.${nation}` as const, lang) }] : []),
        ]}
      />
      <h1 className="text-3xl font-bold text-ink mt-6 mb-3" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h1>
      <p className="text-sm text-ink/80 mb-3 max-w-2xl border-l-4 pl-3" style={{ borderColor: "#BF0A30" }}>
        {t("stats.disclaimer", lang)}
      </p>
      {data ? (
        <StatsView stats={data.stats} computedAt={data.computedAt} lang={lang} country={country} nation={nation} />
      ) : (
        <p className="text-muted mt-8">{t("stats.pending", lang)}</p>
      )}
    </main>
  );
}
