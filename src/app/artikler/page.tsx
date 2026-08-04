import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { getArticles, countArticles } from "@/lib/db";
import { BASE_URL } from "@/lib/seo";
import { ARCHIVE_PATH, PAGE_PARAM } from "@/lib/routes";
import { sportLabel, sportSlug, sportKeyFromSlug, sportNav } from "@/lib/i18n";

/**
 * ARKIVET — alle artikler, pagineret.
 *
 * Fandtes ikke før: forsiden hentede 18 artikler uden paginering, så artikel
 * nr. 19 kun kunne nås via søgning eller sitemap. Siden er samtidig målet for
 * Instagram-bio-linket (`/artikler?kilde=ig`) — derfor er den indekserbar og
 * responsiv i stedet for en separat, noindex mobil-side. Den gamle `/ig`
 * viderestiller hertil.
 *
 * `?sport=` bruger sportens LÆSER-slug (/fodbold), ikke den kanoniske nøgle;
 * oversættelsen sker her, så URL'en matcher resten af sitet.
 */

const PER_PAGE = 24;

export const revalidate = 300;

interface SearchParams {
  side?: string;
  sport?: string;
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { side, sport } = await searchParams;
  const page = parsePage(side);
  const key = sport ? sportKeyFromSlug(sport) : null;
  const name = key ? sportLabel(key) : null;

  const title = name
    ? `${name} — alle artikler${page > 1 ? ` (side ${page})` : ""}`
    : `Alle artikler${page > 1 ? ` (side ${page})` : ""}`;

  // Kanonisk: side 1 uden parametre, øvrige sider med deres egne — ellers
  // konkurrerer sider om samme URL i indekset.
  const params = new URLSearchParams();
  if (key) params.set("sport", sportSlug(key));
  if (page > 1) params.set(PAGE_PARAM, String(page));
  const qs = params.toString();

  return {
    title,
    description: name
      ? `Alle artikler om danske ${name.toLowerCase()}-atleter i amerikansk college-sport.`
      : "Alle artikler fra StudentAthlete.dk — danske college-atleter i USA, nyeste først.",
    alternates: { canonical: `${BASE_URL}${ARCHIVE_PATH}${qs ? `?${qs}` : ""}` },
  };
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { side, sport } = await searchParams;
  const page = parsePage(side);
  const sportKey = sport ? sportKeyFromSlug(sport) : null;
  const filter = sportKey ?? "";

  const [articles, total] = await Promise.all([
    getArticles({ sport: filter, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }),
    countArticles({ sport: filter }),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  // Interval udregnes af det vi FAKTISK fik — ikke af sidetallet. En hånd-
  // skrevet ?side=99 gav ellers "Viser 25–18 af 18".
  const from = articles.length > 0 ? (page - 1) * PER_PAGE + 1 : 0;
  const to = from + articles.length - 1;

  function hrefFor(targetPage: number, targetSport: string | null): string {
    const params = new URLSearchParams();
    if (targetSport) params.set("sport", targetSport);
    if (targetPage > 1) params.set(PAGE_PARAM, String(targetPage));
    const qs = params.toString();
    return `${ARCHIVE_PATH}${qs ? `?${qs}` : ""}`;
  }

  const currentSlug = sportKey ? sportSlug(sportKey) : null;

  return (
    <main>
      <div className="px-4 md:px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="w-1 h-6 rounded-full" style={{ backgroundColor: "#BF0A30" }} />
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
            {sportKey ? sportLabel(sportKey) : "Alle artikler"}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          {total === 0
            ? "Ingen artikler endnu."
            : articles.length === 0
              ? `Side ${page} findes ikke — der er ${total} artikler i alt.`
              : `Viser ${from}–${to} af ${total} artikler. Nyeste først.`}
        </p>
      </div>

      {/* Sportsfilter */}
      <nav
        aria-label="Filtrér efter sport"
        className="flex gap-2 overflow-x-auto px-4 md:px-8 py-3 border-b border-border"
      >
        <a
          href={hrefFor(1, null)}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors ${
            currentSlug
              ? "border-border text-muted hover:text-ink"
              : "border-[#00205B] bg-[#00205B] text-white"
          }`}
        >
          Alle
        </a>
        {sportNav()
          .filter((s) => s.key !== "other")
          .map((s) => (
            <a
              key={s.slug}
              href={hrefFor(1, s.slug)}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors ${
                currentSlug === s.slug
                  ? "border-[#00205B] bg-[#00205B] text-white"
                  : "border-border text-muted hover:text-ink"
              }`}
            >
              {s.label}
            </a>
          ))}
      </nav>

      {articles.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="text-lg font-medium mb-2">Ingen artikler på denne side.</p>
          <a href={hrefFor(1, currentSlug)} className="text-sm underline" style={{ color: "#BF0A30" }}>
            Tilbage til første side
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 md:px-8 py-8">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <nav
          aria-label="Sider"
          className="flex items-center justify-between gap-4 px-4 md:px-8 py-8 border-t border-border"
        >
          {page > 1 ? (
            <a
              href={hrefFor(page - 1, currentSlug)}
              rel="prev"
              className="px-4 py-2.5 text-sm font-semibold border border-[#00205B] text-[#00205B] hover:bg-[#00205B] hover:text-white transition-colors"
            >
              ← Nyere
            </a>
          ) : (
            <span />
          )}

          <span className="text-sm text-muted tabular-nums">
            Side {page} af {lastPage}
          </span>

          {page < lastPage ? (
            <a
              href={hrefFor(page + 1, currentSlug)}
              rel="next"
              className="px-4 py-2.5 text-sm font-semibold border border-[#00205B] text-[#00205B] hover:bg-[#00205B] hover:text-white transition-colors"
            >
              Ældre →
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
