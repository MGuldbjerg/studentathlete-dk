import type { Article, ArticleListItem } from "@/lib/types";
import { RelatedArticles } from "@/components/ui/RelatedArticles";
import { sportLabel, sportSlug, t, articleTypeLabel, routePath } from "@/lib/i18n";

/**
 * The end of every article template: the tags as real links (sport page,
 * the article archive, the athletes overview) and «Read next», which
 * getReadNext fills to four (src/lib/read-next.ts). The tags were spans
 * that looked clickable and were not.
 */
export function ArticleEnd({ article, readNext, lang, className = "" }: {
  article: Article;
  readNext: ArticleListItem[];
  lang: string;
  className?: string;
}) {
  const typeLabel = articleTypeLabel(article.article_type, lang) || t("tpl.news_plural", lang);
  const tags = [
    article.sport ? { label: sportLabel(article.sport, lang), href: `/${sportSlug(article.sport, lang)}` } : null,
    { label: typeLabel, href: routePath("archive", lang) },
    { label: t("tpl.student_athlete_tag", lang), href: routePath("athletes", lang) },
  ].filter((x): x is { label: string; href: string } => x !== null);

  return (
    <div className={`pt-6 pb-10 border-t border-border mt-4 ${className}`}>
      <nav aria-label={t("tpl.topics", lang)} className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <a key={tag.href} href={tag.href}
            className="text-xs px-3 py-1 border border-border text-muted
                       hover:border-flag-red hover:text-flag-red transition-colors tracking-wide">
            {tag.label}
          </a>
        ))}
      </nav>

      <RelatedArticles articles={readNext} title={t("tpl.read_next", lang)} lang={lang} />
    </div>
  );
}
