import type { Article } from "@/lib/types";
import { ARTICLE_TYPE_LABELS } from "@/lib/types";
import { getArticleUrl } from "@/lib/seo";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ArticleCard({ article }: { article: Article }) {
  const typeLabel = ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type;

  return (
    <a
      href={getArticleUrl(article)}
      className="group flex flex-col bg-white border border-border hover:border-flag-red transition-colors duration-200"
    >
      {/* Billede eller farvet plade */}
      <div className="relative overflow-hidden aspect-[16/9] bg-surface">
        {article.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-end p-3"
            style={{
              background: "linear-gradient(135deg, #00205B, #001240)",
            }}
          >
            <span className="text-white/30 text-xs uppercase tracking-wider">
              {article.sport ?? typeLabel}
            </span>
          </div>
        )}
        {/* Rød top-streg */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: "#BF0A30" }}
        />
      </div>

      {/* Indhold */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {article.sport && (
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#BF0A30" }}
            >
              {article.sport}
            </span>
          )}
          <span className="text-xs text-muted">{typeLabel}</span>
        </div>

        {/* Titel */}
        <h3
          className="text-base font-bold text-ink leading-snug group-hover:underline line-clamp-3"
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
          {article.athlete_name && (
            <span className="text-xs text-muted truncate">{article.athlete_name}</span>
          )}
          <span className="text-xs text-muted ml-auto">
            {formatDate(article.published_at)}
          </span>
        </div>
      </div>
    </a>
  );
}
