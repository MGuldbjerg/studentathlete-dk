import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleById, getFactSheetForArticle } from "@/lib/admin";
import { getAllAthletes } from "@/lib/db";
import { EditArticleForm } from "./EditArticleForm";
import { FactSheetPanel } from "./FactSheetPanel";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;

  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const article = await getArticleById(id);
  if (!article) notFound();

  const [athletes, factSheet] = await Promise.all([
    getAllAthletes(),
    article.story_id ? getFactSheetForArticle(id) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <div className={`${factSheet ? "max-w-5xl" : "max-w-2xl"} mx-auto px-4 py-8`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Rediger artikel</h1>
          <div className="flex gap-3">
            <Link
              href={`/admin/${article.id}`}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Forhåndsvisning →
            </Link>
            <Link
              href={`/admin`}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              ← Tilbage
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
              article.published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
            }`}
          >
            {article.published ? "Publiceret" : "Kladde"}
          </span>
        </div>

        {factSheet ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
            <EditArticleForm article={article} athletes={athletes} />
            <FactSheetPanel
              factSheetJson={factSheet.fact_sheet}
              factStatus={factSheet.fact_status}
              sourceUrl={factSheet.source_url}
              headline={factSheet.headline}
            />
          </div>
        ) : (
          <EditArticleForm article={article} athletes={athletes} />
        )}
      </div>
    </main>
  );
}
