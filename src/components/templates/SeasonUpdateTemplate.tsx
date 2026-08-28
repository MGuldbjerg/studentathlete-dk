import type { Article, Athlete } from "@/lib/types";
import { formatDate, getReadingTime, articleStructuredData, getAthleteUrl, getArticleCoverUrl } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { RelatedArticles } from "@/components/ui/RelatedArticles";
import { AdSlot } from "@/components/ui/AdSlot";
import { SourceBox } from "@/components/ui/SourceBox";
import { AiDisclaimer } from "@/components/ui/AiDisclaimer";
import { CorrectionNotice } from "@/components/ui/CorrectionNotice";

import { sportLabel, t, articleTypeLabel } from "@/lib/i18n";
import { currentLanguage, currentSite } from "@/lib/site-server";
interface Props {
  article: Article;
  athlete?: Athlete | null;
  relatedArticles?: Article[];
}

/**
 * Sæsonen en dato hører til. Den amerikanske idrætssæson løber hen over
 * årsskiftet og begynder i AUGUST — derfor er august-december år Y sæson
 * Y–Y+1, mens januar-juli er (Y-1)–Y.
 *
 * Stod før som `${year - 1}–${year}` uanset måned. Det var rigtigt et halvt
 * år ad gangen og forkert det andet: en kampreferat fra 20. august 2026 fik
 * badgen «2025–26», altså sæsonen FØR den kamp den handlede om. Hele
 * efterårssæsonen — fodbold, hockey, amerikansk fodbold — lå i det forkerte år.
 */
export function getSeason(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const start = d.getMonth() >= 7 ? year : year - 1; // getMonth(): 7 = august
  return `${start}–${String(start + 1).slice(2)}`;
}

export async function SeasonUpdateTemplate({ article, athlete, relatedArticles = [] }: Props) {
  const lang = await currentLanguage();
  const site = await currentSite();
  const readTime = getReadingTime(article.content);
  const season = getSeason(article.published_at);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleStructuredData(article, athlete, site))
      }} />

      <article className="max-w-2xl mx-auto px-5 md:px-0 py-10">
        <Breadcrumb crumbs={[
          { label: t("crumb.home", lang), href: "/" },
          { label: t("tpl.season_updates", lang), href: "/?article_type=season_update" },
          { label: article.title },
        ]} />

        {/* ── Sæson-badge ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-6 mb-5">
          {season && (
            <span className="text-[10px] font-black tracking-[0.2em] uppercase px-2.5 py-1.5"
              style={{ color: "#00205B", border: "1.5px solid #00205B" }}>
              {t("article.season", lang, { season })}
            </span>
          )}
          {article.sport && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted font-medium">
              {sportLabel(article.sport, lang)}
            </span>
          )}
        </div>

        {/* ── Overskrift ─────────────────────────────────────────── */}
        <h1 style={{ fontFamily: "var(--font-serif)" }}
          className="text-4xl md:text-5xl font-black text-ink leading-[1.08] tracking-tight mb-5">
          {article.title}
        </h1>

        {article.summary && (
          <p className="text-xl text-ink/75 leading-relaxed mb-6"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
            {article.summary}
          </p>
        )}

        {/* Byline */}
        <div className="flex items-center justify-between py-3 border-y text-xs flex-wrap gap-2"
          style={{ borderColor: "#E2E0DC" }}>
          <div className="flex items-center gap-2 text-muted">
            {athlete && (
              <a href={getAthleteUrl(athlete.slug, lang)}
                className="font-semibold text-ink hover:underline">
                {athlete.name}
              </a>
            )}
            {article.author && <span>· Af {article.author}</span>}
          </div>
          <div className="flex items-center gap-2 text-muted tracking-wide">
            {article.published_at && (
              <time dateTime={article.published_at}>{formatDate(article.published_at, lang)}</time>
            )}
            <span style={{ color: "#E2E0DC" }}>·</span>
            <span>{readTime} min.</span>
          </div>
        </div>

        {/* Hero-billede */}
        <figure className="mb-8 -mx-5 md:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getArticleCoverUrl(article)} alt={article.title}
            className="w-full object-cover max-h-80" />
        </figure>

        <ArticleBody content={article.content} />
        <CorrectionNotice article={article} lang={lang} />
        <SourceBox sourceUrl={article.source_url} lang={lang} />
        {article.author_role !== "human" && <AiDisclaimer />}

        {/* ── Atletdatakort ─────────────────────────────────────── */}
        {athlete && (
          <aside className="my-8 overflow-hidden"
            style={{ border: "1px solid #E2E0DC" }}>
            {/* Blå header */}
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: "#00205B" }}>
              <div>
                <p className="text-white font-bold text-sm"
                  style={{ fontFamily: "var(--font-serif)" }}>
                  {athlete.name}
                </p>
                <p className="text-white/50 text-xs">{athlete.university}</p>
              </div>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase px-2 py-1"
                style={{ color: "#BF0A30", border: "1px solid #BF0A30" }}>
                {t("article.season", lang, { season })}
              </span>
            </div>

            {/* Stats-grid */}
            <div className="grid grid-cols-3 divide-x"
              style={{ borderTop: "1px solid #E2E0DC" }}>
              {[
                { label: t("fact.sport", lang), value: sportLabel(athlete.sport, lang) },
                { label: t("fact.position", lang), value: athlete.position ?? "–" },
                { label: t("fact.division", lang), value: athlete.division },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-4 text-center">
                  <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">{stat.label}</dt>
                  <dd className="text-base font-bold text-ink mt-1"
                    style={{ fontFamily: "var(--font-serif)" }}>
                    {stat.value}
                  </dd>
                </div>
              ))}
            </div>
          </aside>
        )}

        <AdSlot slot="article-footer" className="my-6" />
        <RelatedArticles articles={relatedArticles} title={t("tpl.previous_updates", lang)} lang={lang} />
      </article>
    </>
  );
}
