import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleById, getFactSheetForArticle } from "@/lib/admin";
import { getAllAthletes } from "@/lib/db";
import { EditArticleForm } from "./EditArticleForm";
import { FactSheetPanel } from "./FactSheetPanel";
import { articleHero } from "@/lib/article-photo";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import { countryProfile } from "@/lib/countries";

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

        {/* The page hero and share image readers will get (migration 085): the
            school's photo with its credit, or a note that the match card is used. */}
        {(() => {
          const hero = articleHero(article);
          const lang = countryProfile(article.country ?? undefined).language;
          return (
            <section className="mb-6 rounded border border-border bg-white p-3">
              <p className="text-xs font-semibold text-muted mb-2">
                {hero.credit ? "Billede (side + sociale medier)" : "Billede: genereret kampkort"}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.src} alt="" className="w-full h-auto max-h-96 object-contain bg-surface" />
              {hero.credit && <PhotoCredit className="text-xs text-muted mt-2" {...hero.credit} lang={lang} />}
              {article.photo_url && !hero.credit && (
                <p className="text-xs text-red-700 mt-2">
                  Artiklen har et foto, men skolen tillader ikke fotos (eller mangler) — kortet bruges.
                </p>
              )}
            </section>
          );
        })()}

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
