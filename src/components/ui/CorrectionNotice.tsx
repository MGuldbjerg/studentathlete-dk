import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/seo";

/**
 * Synlig rettelses-boks på publicerede artikler (presseetik — indfrier
 * /presseetik-løftet). Vises kun når redaktøren har udfyldt correction_note
 * i admin; corrected_at stemples automatisk (se updateArticle).
 */
export function CorrectionNotice({ article }: { article: Article }) {
  if (!article.correction_note) return null;
  return (
    <aside
      className="mt-8 px-5 py-4 border-l-[3px] bg-surface/50 text-sm leading-relaxed"
      style={{ borderLeftColor: "#002868" }}
    >
      <strong className="text-ink">
        Rettet{article.corrected_at ? ` ${formatDate(article.corrected_at)}` : ""}:
      </strong>{" "}
      <span className="text-muted">{article.correction_note}</span>
    </aside>
  );
}
