import type { Article, Athlete } from "@/lib/types";
import { ARTICLE_TYPE_LABELS } from "@/lib/types";
import { formatDate, getReadingTime, articleStructuredData, getAthleteUrl } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { RelatedArticles } from "@/components/ui/RelatedArticles";
import { AdSlot } from "@/components/ui/AdSlot";
import { SourceBox } from "@/components/ui/SourceBox";

interface Props {
  article: Article;
  athlete?: Athlete | null;
  relatedArticles?: Article[];
}

export function NewsTemplate({ article, athlete, relatedArticles = [] }: Props) {
  const readTime = getReadingTime(article.content);
  const typeLabel = ARTICLE_TYPE_LABELS[article.article_type] ?? "Nyhed";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleStructuredData(article, athlete))
      }} />

      <div className="max-w-4xl mx-auto flex gap-8">
      <article className="flex-1 max-w-2xl">
        {/* ── Artikel-header ─────────────────────────────────────── */}
        <header className="px-5 md:px-0 pt-10 pb-0">
          <div className="mb-8">
            <Breadcrumb crumbs={[
              { label: "Hjem", href: "/" },
              { label: "Nyheder", href: "/?article_type=news" },
              { label: article.title },
            ]} />
          </div>

          {/* Kicker — rød small-caps kategori + sport */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold tracking-[0.15em] uppercase"
              style={{ color: "#BF0A30" }}>
              {typeLabel}
            </span>
            {article.sport && (
              <>
                <span style={{ color: "#E2E0DC" }}>—</span>
                <span className="text-xs tracking-[0.1em] uppercase text-muted font-medium">
                  {article.sport}
                </span>
              </>
            )}
          </div>

          {/* Overskrift */}
          <h1 style={{ fontFamily: "var(--font-serif)" }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-ink leading-[1.08] mb-6 tracking-tight">
            {article.title}
          </h1>

          {/* Ingress */}
          {article.summary && (
            <p className="text-xl md:text-2xl text-ink/75 leading-relaxed font-normal mb-7"
              style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
              {article.summary}
            </p>
          )}

          {/* Skillelinje */}
          <div className="flex items-center gap-0 mb-0">
            <div className="w-8 h-0.5" style={{ backgroundColor: "#BF0A30" }} />
            <div className="flex-1 h-px" style={{ backgroundColor: "#E2E0DC" }} />
          </div>

          {/* Byline */}
          <div className="flex items-center justify-between py-3 text-sm flex-wrap gap-2">
            <div className="flex items-center gap-2 text-muted">
              {athlete && (
                <a href={getAthleteUrl(athlete.slug)}
                  className="font-semibold text-ink hover:underline decoration-flag-red">
                  {athlete.name}
                </a>
              )}
              {article.author && (
                <span>{athlete ? "·" : ""} Af <span className="text-ink font-medium">{article.author}</span></span>
              )}
            </div>
            <div className="flex items-center gap-3 text-muted text-xs tracking-wide">
              {article.published_at && (
                <time dateTime={article.published_at}>
                  {formatDate(article.published_at)}
                </time>
              )}
              <span className="text-border">·</span>
              <span>{readTime} min. læsning</span>
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: "#E2E0DC" }} />
        </header>

        {/* ── Hero-billede ───────────────────────────────────────── */}
        {article.cover_image_url && (
          <div className="px-5 md:px-0 mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.cover_image_url} alt={article.title}
              className="w-full object-cover max-h-[28rem]" />
          </div>
        )}

        {/* ── Brødtekst ──────────────────────────────────────────── */}
        <div className="px-5 md:px-0 pt-8 pb-2">
          <ArticleBody content={article.content} />
        </div>

        {/* ── Kilde ──────────────────────────────────────────────── */}
        <div className="px-5 md:px-0">
          <SourceBox sourceUrl={article.source_url} />
        </div>

        {/* ── Annonce efter artikel ────────────────────────────── */}
        <AdSlot slot="article-footer" className="my-6" />

        {/* ── Tags ───────────────────────────────────────────────── */}
        <div className="px-5 md:px-0 pt-6 pb-10 border-t border-border mt-4">
          <div className="flex flex-wrap gap-2">
            {[article.sport, typeLabel, "Student athlete"].filter(Boolean).map((tag) => (
              <span key={tag}
                className="text-xs px-3 py-1 border border-border text-muted
                           hover:border-flag-red hover:text-flag-red transition-colors cursor-default tracking-wide">
                {tag}
              </span>
            ))}
          </div>

          <RelatedArticles articles={relatedArticles} />
        </div>
      </article>

      {/* ── Sidebar (kun desktop) ─────────────────────────────── */}
      <aside className="hidden lg:block w-[300px] flex-shrink-0">
        <div className="sticky top-20 pt-10">
          <AdSlot slot="sidebar" />
        </div>
      </aside>
      </div>
    </>
  );
}
