import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllAthletes } from "@/lib/db";
import { NewArticleForm } from "./NewArticleForm";

export default async function NewArticlePage() {

  const athletes = await getAllAthletes();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Ny artikel</h1>
          <Link
            href={`/admin`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>

        <NewArticleForm athletes={athletes} />
      </div>
    </main>
  );
}
