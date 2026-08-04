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
import { currentLanguage } from "@/lib/site-server";
interface Props {
  article: Article;
  athlete?: Athlete | null;
  relatedArticles?: Article[];
}

export async function FeatureTemplate({ article, athlete, relatedArticles = [] }: Props) {
  const lang = await currentLanguage();
  const readTime = getReadingTime(article.content);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleStructuredData(article, athlete))
      }} />

      <article>
        {/* ── Fuldt udstrakt hero ────────────────────────────────── */}
        <header className="relative w-full overflow-hidden"
          style={{ minHeight: "85vh" }}>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getArticleCoverUrl(article)} alt=""
            className="absolute inset-0 w-full h-full object-cover" />

          {/* Gradient-overlay — tung i bunden */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)" }} />

          {/* Rød bundstreg */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ backgroundColor: "#BF0A30" }} />

          {/* Indhold */}
          <div className="relative flex flex-col justify-end min-h-[85vh]
                          max-w-4xl mx-auto px-6 md:px-8 pb-14 pt-28">
            {/* Feature-mærkat */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white/90
                               border border-white/30 px-3 py-1.5">
                Feature
              </span>
              {article.sport && (
                <span className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-medium">
                  {sportLabel(article.sport, lang)}
                </span>
              )}
              <span className="text-white/30 text-[10px] tracking-[0.15em]">
                {readTime} min. læsning
              </span>
            </div>

            {/* Overskrift — meget stor */}
            <h1 style={{ fontFamily: "var(--font-serif)" }}
              className="text-4xl md:text-6xl lg:text-7xl font-black text-white
                         leading-[1.05] tracking-tight mb-5 max-w-3xl">
              {article.title}
            </h1>

            {article.summary && (
              <p className="text-white/70 text-lg md:text-xl leading-relaxed max-w-2xl mb-6"
                style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                {article.summary}
              </p>
            )}

            {/* Byline i bunden */}
            <div className="flex items-center gap-3 text-sm text-white/50">
              {athlete && (
                <a href={getAthleteUrl(athlete.slug)}
                  className="text-white/80 font-semibold hover:text-white transition-colors">
                  {athlete.name}
                </a>
              )}
              {article.author && <span>Af {article.author}</span>}
              {article.published_at && (
                <>
                  <span>·</span>
                  <time dateTime={article.published_at} className="text-white/40">
                    {formatDate(article.published_at)}
                  </time>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Brødkrumme ─────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-6 md:px-8 pt-8">
          <Breadcrumb crumbs={[
            { label: t("crumb.home", lang), href: "/" },
            { label: t("tpl.features", lang), href: "/?article_type=feature" },
            { label: article.title },
          ]} />
        </div>

        {/* ── Brødtekst med drop cap ─────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-6 md:px-8 py-10 flex gap-8">
          <div className="flex-1 max-w-3xl article-drop-cap">
            <ArticleBody content={article.content} />
            <CorrectionNotice article={article} />
            <SourceBox sourceUrl={article.source_url} />
            {article.author_role !== "human" && <AiDisclaimer />}

            <AdSlot slot="article-footer" className="my-6" />

            <div className="mt-12 pt-8 border-t border-border">
              <RelatedArticles articles={relatedArticles} title={t("tpl.read_also", lang)} />
            </div>
          </div>

          {/* ── Sidebar (kun desktop) ─────────────────────────── */}
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="sticky top-20">
              <AdSlot slot="sidebar" />
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
