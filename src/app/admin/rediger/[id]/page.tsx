import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getArticleById } from "@/lib/admin";
import { getAllAthletes } from "@/lib/db";
import { EditArticleForm } from "./EditArticleForm";

export default async function EditArticlePage({
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

  const athletes = await getAllAthletes();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Rediger artikel</h1>
          <div className="flex gap-3">
            <Link
              href={`/admin/${article.id}?token=${token}`}
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Forhåndsvisning →
            </Link>
            <Link
              href={`/admin?token=${token}`}
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

        <EditArticleForm article={article} athletes={athletes} token={token!} />
      </div>
    </main>
  );
}
