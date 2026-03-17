import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getDraftArticles } from "@/lib/admin";
import { ARTICLE_TYPE_LABELS, getSportColor } from "@/lib/types";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

  const drafts = await getDraftArticles();

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-1">Kladder</h1>
        <p className="text-muted text-sm mb-6">
          {drafts.length === 0
            ? "Ingen kladder at gennemse"
            : `${drafts.length} kladde${drafts.length === 1 ? "" : "r"} venter`}
        </p>

        <div className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/admin/${draft.id}?token=${token}`}
              className="block bg-paper rounded-lg border border-border p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2 mb-2">
                {draft.sport && (
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider text-white px-2 py-0.5 rounded"
                    style={{ backgroundColor: getSportColor(draft.sport) }}
                  >
                    {draft.sport}
                  </span>
                )}
                <span className="text-[11px] text-muted">
                  {ARTICLE_TYPE_LABELS[draft.article_type] ?? draft.article_type}
                </span>
              </div>
              <h2
                className="text-lg font-bold text-ink leading-snug"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {draft.title}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                {draft.athlete_name && <span>{draft.athlete_name}</span>}
                {draft.athlete_name && <span>·</span>}
                <span>{new Date(draft.created_at).toLocaleDateString("da-DK")}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
