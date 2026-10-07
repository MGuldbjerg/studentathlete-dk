import { notFound } from "next/navigation";
import Link from "next/link";
import { getDraftArticles, getPublishedArticlesPage, getPendingPhotoSuggestionCount, getNewLeadCount, getPendingProfileDraftCount, getMergeCandidateCount, getInstagramCandidateCount } from "@/lib/admin";
import { ARTICLE_TYPE_LABELS, getSportColor } from "@/lib/types";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ side?: string }>;
}) {
  const { side } = await searchParams;

  const [drafts, publishedPage, pendingPhotos, newLeads, pendingProfiles, pendingDupes, pendingHandles] = await Promise.all([
    getDraftArticles(),
    getPublishedArticlesPage(side),
    getPendingPhotoSuggestionCount(),
    getNewLeadCount(),
    getPendingProfileDraftCount(),
    getMergeCandidateCount(),
    getInstagramCandidateCount(),
  ]);
  const { articles: published, total: publishedTotal, page, pages } = publishedPage;

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-4">Admin</h1>

        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href={`/admin/ny-artikel`}
            className="inline-block px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: "#00205B" }}
          >
            + Ny artikel
          </Link>
          <Link
            href={`/admin/tilfoej`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            + Tilføj atlet
          </Link>
          <Link
            href={`/admin/atleter`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Atleter
          </Link>
          <Link
            href={`/admin/sider`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Sider
          </Link>
          <Link
            href={`/admin/indstillinger`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Tekster
          </Link>
          <Link
            href={`/admin/skoler`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Skoler
          </Link>
          <Link
            href={`/admin/fotos`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Fotos{pendingPhotos > 0 ? ` (${pendingPhotos})` : ""}
          </Link>
          <Link
            href={`/admin/profiler`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Profiler{pendingProfiles > 0 ? ` (${pendingProfiles})` : ""}
          </Link>
          <Link
            href={`/admin/dubletter`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Dubletter{pendingDupes > 0 ? ` (${pendingDupes})` : ""}
          </Link>
          <Link
            href={`/admin/instagram`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Instagram{pendingHandles > 0 ? ` (${pendingHandles})` : ""}
          </Link>
          <Link
            href={`/admin/leads`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Leads{newLeads > 0 ? ` (${newLeads})` : ""}
          </Link>
          <Link
            href={`/admin/pipeline`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Pipeline
          </Link>
          <Link
            href={`/admin/stilguide`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Stilguide
          </Link>
          <Link
            href={`/admin/analytics`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Statistik
          </Link>
          <Link
            href={`/admin/katalog`}
            className="inline-block px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Katalog
          </Link>
        </div>

        {/* Kladder */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-ink mb-1">Kladder</h2>
          <p className="text-muted text-sm mb-3">
            {drafts.length === 0
              ? "Ingen kladder at gennemse"
              : `${drafts.length} kladde${drafts.length === 1 ? "" : "r"} venter`}
          </p>

          <div className="flex flex-col gap-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-paper rounded-lg border border-border p-4"
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
                  {draft.sensitive && (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: "#7f1d1d" }}
                      title={`Presseetik-flag: ${draft.sensitive} — læs kilden og vurdér dækningen ekstra kritisk`}
                    >
                      ■ FØLSOM ({draft.sensitive})
                    </span>
                  )}
                  {draft.fabrication_risk === "low" && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{ backgroundColor: "#d1fae5", color: "#065f46" }}
                    >
                      ✓ Lav risiko
                    </span>
                  )}
                  {draft.fabrication_risk === "high" && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: "#b91c1c" }}
                    >
                      ⚠ Mulig fejl
                    </span>
                  )}
                  {draft.fabrication_risk === "medium" && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{ backgroundColor: "#fde68a", color: "#92400e" }}
                    >
                      ⚠ Tjek fakta
                    </span>
                  )}
                </div>
                <h3
                  className="text-lg font-bold text-ink leading-snug"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {draft.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                  {draft.athlete_name && <span>{draft.athlete_name}</span>}
                  {draft.athlete_name && <span>·</span>}
                  <span>{new Date(draft.created_at).toLocaleDateString("da-DK")}</span>
                </div>
                {draft.fabrication_risk && draft.fabrication_risk !== "low" && draft.fact_flags
                  ? (() => {
                      let flags: string[] = [];
                      try {
                        flags = JSON.parse(draft.fact_flags) as string[];
                      } catch {
                        /* ignorér */
                      }
                      return flags.length > 0 ? (
                        <ul className="mt-2 text-xs list-disc list-inside" style={{ color: "#b91c1c" }}>
                          {flags.map((f, i) => (
                            <li key={i}>Uden kildebelæg: {f}</li>
                          ))}
                        </ul>
                      ) : null;
                    })()
                  : null}
                <div className="flex gap-3 mt-3">
                  <Link
                    href={`/admin/tjek/${draft.id}`}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: "#00205B" }}
                  >
                    Tjek mod kilden
                  </Link>
                  <Link
                    href={`/admin/rediger/${draft.id}`}
                    className="text-sm font-medium text-muted hover:underline"
                  >
                    Rediger
                  </Link>
                  <Link
                    href={`/admin/${draft.id}`}
                    className="text-sm font-medium text-muted hover:underline"
                  >
                    Forhåndsvis
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Publicerede artikler */}
        <section>
          <h2 className="text-lg font-bold text-ink mb-1">Publicerede artikler</h2>
          <p className="text-muted text-sm mb-3">
            {publishedTotal} artikel{publishedTotal === 1 ? "" : "er"}
            {pages > 1 ? ` · side ${page} af ${pages}` : ""}
          </p>

          <div className="flex flex-col gap-2">
            {published.map((article) => (
              <div
                key={article.id}
                className="bg-paper rounded-lg border border-border px-4 py-3 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {article.sport && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider text-white px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: getSportColor(article.sport) }}
                      >
                        {article.sport}
                      </span>
                    )}
                    <span className="text-[10px] text-muted">
                      {ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-ink truncate">
                    {article.title}
                  </p>
                </div>
                <Link
                  href={`/admin/rediger/${article.id}`}
                  className="text-sm font-medium flex-shrink-0 ml-4 hover:underline"
                  style={{ color: "#00205B" }}
                >
                  Rediger
                </Link>
              </div>
            ))}
          </div>

          {pages > 1 && <Pager page={page} pages={pages} />}
        </section>
      </div>
    </main>
  );
}

/** Forrige · 1 2 … 9 · Næste — keeps the drafts section at the top of every page. */
function Pager({ page, pages }: { page: number; pages: number }) {
  const href = (p: number) => (p === 1 ? "/admin" : `/admin?side=${p}`);
  // First, last, and two either side of the current page; gaps become "…".
  const shown = [...new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b);
  const link = "px-3 py-1.5 text-sm rounded border border-border bg-paper hover:border-ink";
  return (
    <nav className="flex flex-wrap items-center gap-1.5 mt-6" aria-label="Sider">
      {page > 1 && <Link href={href(page - 1)} className={link}>← Forrige</Link>}
      {shown.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - shown[i - 1] > 1 && <span className="text-muted text-sm">…</span>}
          {p === page ? (
            <span className="px-3 py-1.5 text-sm rounded font-semibold text-white" style={{ backgroundColor: "#00205B" }}>
              {p}
            </span>
          ) : (
            <Link href={href(p)} className={link}>{p}</Link>
          )}
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className={link}>Næste →</Link>}
    </nav>
  );
}
