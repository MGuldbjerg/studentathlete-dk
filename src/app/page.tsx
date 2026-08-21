import { Suspense } from "react";
import { Carousel } from "@/components/Carousel";
import { ArticleCard } from "@/components/ArticleCard";
import { AdSlot } from "@/components/ui/AdSlot";
import { LeadBand } from "@/components/home/LeadBand";
import { DataBand } from "@/components/home/DataBand";
import { SportListBand } from "@/components/home/SportListBand";

import { SearchBar } from "@/components/SearchBar";
import {
  getFeaturedArticles,
  getArticles,
  getSiteCounts,
  getArticlesGroupedBySport,
} from "@/lib/db";
import { archivePath } from "@/lib/routes";
import { currentLanguage } from "@/lib/site-server";
import { t } from "@/lib/i18n";

interface SearchParams {
  q?: string;
  sport?: string;
}

/**
 * FORSIDEN — seks bånd med skiftende tæthed.
 *
 * Problemet den løser: alle kort viser det GENEREREDE kampkort (rigtige fotos
 * findes kun på atletprofiler og inde i artiklerne), så et 3-kolonne-grid bliver
 * en væg af næsten ens felter. Løsningen er ikke flere korttyper at vælge
 * imellem — det ville lægge en beslutning oven i hver redigering — men rytme
 * bestemt af PLADSEN på siden:
 *
 *   A hero (karrusel)      billede, fuld bredde
 *   B lead + skinne        ét billede + rene tekstrækker
 *     annonce
 *   C datastribe           ingen artikler, kun tal
 *   D kortrække            tre kort, og så slut
 *     annonce
 *   E efter sport          ren tekst, sportsfarven bærer
 *   F bredt feature        billede til højre (spejler B)
 *
 * Billedtunge og billedfri bånd skiftes, så to kampkort aldrig står i samme
 * størrelse to bånd i træk. Søge-/filtervisningen bruger bevidst det simple
 * grid: dér leder man efter noget bestemt, og rytme er kun støj.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const sport = params.sport ?? "";
  const hasFilter = Boolean(q || sport);
  const lang = await currentLanguage();

  const [featured, articles, counts] = await Promise.all([
    hasFilter ? Promise.resolve([]) : getFeaturedArticles(5),
    getArticles({ q, sport }),
    hasFilter ? Promise.resolve(null) : getSiteCounts(),
  ]);

  // ── Filtreret visning: ét simpelt grid, ingen bånd ────────────────────────
  if (hasFilter) {
    const [first, ...rest] = articles;
    return (
      <main>
        <div className="px-4 md:px-8 py-5 border-b border-border">
          <div className="md:hidden mb-4">
            <Suspense fallback={null}>
              <SearchBar
                defaultValue={q}
                placeholder={t("nav.search_placeholder", lang)}
                submitLabel={t("nav.search_submit", lang)}
              />
            </Suspense>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: "#BF0A30" }} />
              <h2 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
                {q ? t("home.search_results_for", lang, { q }) : sport.charAt(0).toUpperCase() + sport.slice(1)}
              </h2>
            </div>
            <a href="/" className="text-sm text-muted hover:text-ink transition-colors">
              {t("home.clear_filter", lang)} &times;
            </a>
          </div>
        </div>

        <div className="px-4 md:px-8 py-8">
          {articles.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <p className="text-lg font-medium mb-2">{t("home.no_matches", lang)}</p>
              <a href="/" className="text-sm underline" style={{ color: "#BF0A30" }}>
                {t("home.see_all_articles", lang)}
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {first && <ArticleCard article={first} variant="featured" />}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Forsiden: fordel artiklerne ud på båndene ─────────────────────────────
  // Karrusellen viser de fastgjorte artikler, ellers de fem nyeste. Uanset
  // hvilken vej der bruges, trækkes dens artikler UD af strømmen nedenfor —
  // ellers ville en fastgjort artikel, der også er blandt de nyeste, stå både
  // i hero'en og i bånd B.
  const carouselArticles = featured.length > 0 ? featured : articles.slice(0, 5);
  const carouselIds = new Set(carouselArticles.map((a) => a.id));
  const feed = articles.filter((a) => !carouselIds.has(a.id));

  const lead = feed[0];
  const rail = feed.slice(1, 4);
  const row = feed.slice(4, 7);
  const wide = feed[7];

  const shownIds = [...carouselIds, ...feed.slice(0, 8).map((a) => a.id)];
  const sportGroups = await getArticlesGroupedBySport({
    sports: 4,
    perSport: 2,
    excludeIds: shownIds,
  });

  const isEmpty = articles.length === 0;

  return (
    <main>
      {/* A — hero */}
      <Carousel
        articles={carouselArticles}
        lang={lang}
        strings={{
          previous: t("carousel.previous", lang),
          next: t("carousel.next", lang),
          goTo: t("carousel.go_to", lang),
          readTime: t("card.read_time", lang),
          emptyKicker: t("carousel.empty_kicker", lang),
          emptyTitle: t("carousel.empty_title", lang),
          emptyBody: t("carousel.empty_body", lang),
        }}
      />

      <div className="px-4 md:px-8 py-5 border-b border-border">
        <div className="md:hidden mb-4">
          <Suspense fallback={null}>
            <SearchBar
              defaultValue=""
              placeholder={t("nav.search_placeholder", lang)}
              submitLabel={t("nav.search_submit", lang)}
            />
          </Suspense>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: "#BF0A30" }} />
            <h2 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
              {t("home.latest", lang)}
            </h2>
          </div>
          <a href={archivePath(lang)} className="text-sm text-muted hover:text-ink transition-colors">
            {t("home.see_all", lang)} →
          </a>
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center py-20 text-muted">
          <p className="text-lg font-medium">{t("home.no_articles", lang)}</p>
        </div>
      ) : (
        <>
          {/* B — lead + skinne */}
          {lead && <LeadBand lead={lead} rail={rail} />}

          <AdSlot slot="after-lead" band />

          {/* C — datastribe */}
          {counts && <DataBand counts={counts} />}

          {/* D — kortrække */}
          {row.length > 0 && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-8 py-8 border-b border-border">
              {row.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </section>
          )}

          <AdSlot slot="mid-feed" band />

          {/* E — efter sport */}
          <SportListBand groups={sportGroups} />

          {/* F — bredt feature, spejlvendt */}
          {wide && (
            <section className="border-b border-border">
              <ArticleCard article={wide} variant="featured" reverse />
            </section>
          )}

          <div className="flex justify-center px-4 py-8">
            <a
              href={archivePath(lang)}
              data-track="internal"
              className="px-6 py-3 text-sm font-semibold border border-[#00205B] text-[#00205B] hover:bg-[#00205B] hover:text-white transition-colors"
            >
              {t("home.see_all_articles", lang)}
            </a>
          </div>
        </>
      )}
    </main>
  );
}
