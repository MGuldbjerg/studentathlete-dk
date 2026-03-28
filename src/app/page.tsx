import { Suspense } from "react";
import { Carousel } from "@/components/Carousel";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/ui/AdSlot";

import { SearchBar } from "@/components/SearchBar";
import { getLatestArticles, getArticles } from "@/lib/db";

interface SearchParams {
  q?: string;
  sport?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sport = params.sport ?? "";

  const [carouselArticles, articles] = await Promise.all([
    getLatestArticles(5),
    getArticles({ q, sport }),
  ]);

  const hasFilter = q || sport;
  const [featuredArticle, ...restArticles] = articles;

  return (
    <main>
      {/* Karrusel — kun på forsiden uden filter */}
      {!hasFilter && <Carousel articles={carouselArticles} />}

      {/* Søgefelt (mobil) + sektion-header */}
      <div className="px-4 md:px-8 py-5 border-b border-border">
        <div className="md:hidden mb-4">
          <Suspense fallback={null}>
            <SearchBar defaultValue={q} />
          </Suspense>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: "#BF0A30" }} />
            <h2
              className="text-xl font-bold text-ink"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {hasFilter
                ? q
                  ? `Søgeresultater for "${q}"`
                  : `${sport.charAt(0).toUpperCase() + sport.slice(1)}`
                : "Seneste artikler"}
            </h2>
          </div>
          {hasFilter && (
            <a
              href="/"
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Nulstil filter &times;
            </a>
          )}
        </div>
      </div>

      {/* Annonce efter karrusel */}
      <AdSlot slot="after-carousel" className="my-6" />

      {/* Artikler — modulært grid */}
      <div className="px-4 md:px-8 py-8">
        {articles.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg font-medium mb-2">
              {hasFilter ? "Ingen artikler matcher din søgning." : "Ingen artikler endnu."}
            </p>
            {hasFilter && (
              <a
                href="/"
                className="text-sm underline"
                style={{ color: "#BF0A30" }}
              >
                Se alle artikler
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tophistorie — stor featured card */}
            {featuredArticle && (
              <ArticleCard article={featuredArticle} featured />
            )}

            {/* Resten i 3-kolonne grid */}
            {restArticles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {restArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
