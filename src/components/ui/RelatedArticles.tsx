import type { Article } from "@/lib/types";
import { articleTypeLabel } from "@/lib/i18n";
import { formatDateShort, getArticleUrl } from "@/lib/seo";

// Titel OG sprog sendes ALTID ind: komponenten kender ikke sitets sprog, og
// adressen på artiklen er sprogbestemt (/football/… vs /fodbold/…).
export function RelatedArticles({ articles, title, lang }: {
  articles: Article[];
  title: string;
  lang: string;
}) {
  if (!articles.length) return null;
  return (
    <aside className="mt-12 pt-8 border-t border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-5" style={{ backgroundColor: "#BF0A30" }} />
        <h3 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((a) => (
          <a key={a.id} href={getArticleUrl(a, lang)}
            className="group flex gap-3 items-start p-3 hover:bg-surface transition-colors">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#BF0A30" }}>
                {articleTypeLabel(a.article_type, lang)}
              </span>
              <p className="text-sm font-semibold text-ink leading-snug mt-0.5 group-hover:underline line-clamp-3"
                style={{ fontFamily: "var(--font-serif)" }}>
                {a.title}
              </p>
              <p className="text-xs text-muted mt-1">{formatDateShort(a.published_at, lang)}</p>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
}
