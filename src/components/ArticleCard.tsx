import type { Article } from "@/lib/types";
import { ARTICLE_TYPE_LABELS, getSportColor } from "@/lib/types";
import { getArticleUrl, getArticleCoverUrl, getReadingTime, formatRelativeTime } from "@/lib/seo";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const typeLabel = ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type;
  const sportColor = getSportColor(article.sport);
  const readingTime = getReadingTime(article.content);
  const relTime = formatRelativeTime(article.published_at);

  if (featured) {
    return (
      <a
        href={getArticleUrl(article)}
        data-track="internal"
        className="group relative flex flex-col md:flex-row bg-white border border-border hover:shadow-lg transition-shadow duration-300 overflow-hidden"
      >
        {/* Billede — stor */}
        <div className="relative overflow-hidden md:w-3/5 aspect-[16/9] md:aspect-auto bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getArticleCoverUrl(article)}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Sport-farvet accent */}
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{ backgroundColor: sportColor }}
          />
        </div>

        {/* Indhold */}
        <div className="flex flex-col flex-1 p-6 md:p-8 justify-center gap-3">
          {/* Sport-tag */}
          <div className="flex items-center gap-3">
            {article.sport && (
              <span
                className="inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-white rounded-sm"
                style={{ backgroundColor: sportColor }}
              >
                {article.sport}
              </span>
            )}
            <span className="text-xs text-muted">{typeLabel}</span>
          </div>

          {/* Titel — serif */}
          <h2
            className="text-xl md:text-2xl lg:text-3xl font-bold text-ink leading-tight group-hover:underline decoration-1 underline-offset-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {article.title}
          </h2>

          {/* Summary */}
          {article.summary && (
            <p className="text-muted text-sm md:text-base line-clamp-3">
              {article.summary}
            </p>
          )}

          {/* Atlet + meta */}
          <div className="flex items-center gap-3 pt-2 mt-auto">
            {article.athlete_name && (
              <span className="text-sm font-medium text-ink">
                {article.athlete_name}
              </span>
            )}
            <span className="text-xs text-muted">{relTime}</span>
            <span className="text-xs text-muted">{readingTime} min. læsning</span>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={getArticleUrl(article)}
      data-track="internal"
      className="group flex flex-col bg-white hover:shadow-md transition-shadow duration-300"
    >
      {/* Billede */}
      <div className="relative overflow-hidden aspect-[16/9] bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getArticleCoverUrl(article)}
          alt={article.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Sport-farvet top-streg */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: sportColor }}
        />
      </div>

      {/* Indhold */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Sport-tag + type */}
        <div className="flex items-center gap-2 flex-wrap">
          {article.sport && (
            <span
              className="inline-block px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white rounded-sm"
              style={{ backgroundColor: sportColor }}
            >
              {article.sport}
            </span>
          )}
          <span className="text-xs text-muted">{typeLabel}</span>
        </div>

        {/* Titel — serif */}
        <h3
          className="text-base font-bold text-ink leading-snug group-hover:underline decoration-1 underline-offset-2 line-clamp-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {article.title}
        </h3>

        {/* Summary */}
        {article.summary && (
          <p className="text-sm text-muted line-clamp-2 flex-1">
            {article.summary}
          </p>
        )}

        {/* Footer: atlet + tid + læsetid */}
        <div className="flex items-center gap-2 pt-2 border-t border-border mt-auto text-xs text-muted">
          {article.athlete_name && (
            <>
              <span className="font-medium text-ink truncate">
                {article.athlete_name}
              </span>
              <span className="text-border">|</span>
            </>
          )}
          <span>{relTime}</span>
          <span className="ml-auto">{readingTime} min.</span>
        </div>
      </div>
    </a>
  );
}
