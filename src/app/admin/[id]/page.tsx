import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getArticleById } from "@/lib/admin";
import { ARTICLE_TYPE_LABELS, getSportColor } from "@/lib/types";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { AdminActions } from "./AdminActions";

export default async function AdminArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id: idStr } = await params;
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const article = await getArticleById(id);
  if (!article) notFound();

  return (
    <main className="min-h-screen bg-surface pb-28">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {article.sport && (
            <span
              className="text-[11px] font-semibold uppercase tracking-wider text-white px-2 py-0.5 rounded"
              style={{ backgroundColor: getSportColor(article.sport) }}
            >
              {article.sport}
            </span>
          )}
          <span className="text-xs text-muted">
            {ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}
          </span>
          {article.athlete_name && (
            <>
              <span className="text-muted">·</span>
              <span className="text-xs text-muted">{article.athlete_name}</span>
            </>
          )}
        </div>

        <h1
          className="text-3xl font-bold text-ink leading-tight mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {article.title}
        </h1>

        {article.summary && (
          <p className="text-muted text-base mb-6">{article.summary}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mb-8 border-b border-border pb-4">
          <span>Oprettet: {new Date(article.created_at).toLocaleDateString("da-DK")}</span>
          {article.author && <span>Forfatter: {article.author}</span>}
          <Link
            href={`/admin/rediger/${article.id}?token=${token}`}
            className="font-medium hover:underline"
            style={{ color: "#00205B" }}
          >
            Rediger →
          </Link>
        </div>

        {/* Artikelindhold */}
        <ArticleBody content={article.content} />
      </div>

      {/* Sticky knapper i bunden */}
      <AdminActions articleId={article.id} token={token!} />
    </main>
  );
}
