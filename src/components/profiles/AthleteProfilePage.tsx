import type { Athlete, Article } from "@/lib/types";
import { ARTICLE_TYPE_LABELS } from "@/lib/types";
import { formatDateShort, athleteStructuredData, getArticleUrl } from "@/lib/seo";
import { graduationBadgeYear } from "@/lib/graduation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

interface Props { athlete: Athlete; articles: Article[] }

const STAT_ROWS = (a: Athlete) => [
  { label: "Sport",     value: a.sport },
  { label: "Position",  value: a.position },
  { label: "Hjemby",   value: a.hometown },
  { label: "Universitet", value: a.university },
  { label: "Stat",     value: a.university_state },
  { label: "Division", value: a.division },
  { label: "Årgang",   value: a.class_year },
  { label: "Forventet dimission", value: a.expected_graduation?.toString() },
  { label: "Optaget",  value: a.year_enrolled?.toString() },
  {
    label: "Status",
    value: graduationBadgeYear(a.expected_graduation)
      ? `🎓 Færdiguddannet ${graduationBadgeYear(a.expected_graduation)}`
      : a.active
        ? "Aktiv"
        : "Tidligere atlet",
  },
].filter((r) => r.value);

export function AthleteProfilePage({ athlete, articles }: Props) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(athleteStructuredData(athlete, articles))
      }} />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <header style={{ backgroundColor: "#00205B" }} className="relative overflow-hidden">
        {/* Subtil diagonal tekstur */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }} />

        <div className="h-[3px]" style={{ backgroundColor: "#BF0A30" }} />

        <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-12 md:py-16
                        flex flex-col md:flex-row gap-8 items-start md:items-end">
          {/* Foto */}
          {athlete.photo_url ? (
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={athlete.photo_url} alt={athlete.name}
                className="w-36 h-44 md:w-44 md:h-56 object-cover"
                style={{ border: "2px solid rgba(255,255,255,0.12)" }} />
              {athlete.photo_credit && (
                <p className="text-[10px] text-white/30 mt-1">{athlete.photo_credit}</p>
              )}
            </div>
          ) : (
            <div className="w-36 h-44 md:w-44 md:h-56 flex-shrink-0
                            flex items-center justify-center text-5xl font-black text-white/20"
              style={{
                fontFamily: "var(--font-serif)",
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "2px solid rgba(255,255,255,0.08)"
              }}>
              {athlete.name.charAt(0)}
            </div>
          )}

          {/* Tekst */}
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white px-2.5 py-1.5"
                style={{ backgroundColor: "#BF0A30" }}>
                {athlete.sport}
              </span>
              {graduationBadgeYear(athlete.expected_graduation) ? (
                <span
                  className="text-[10px] font-black tracking-[0.15em] uppercase px-2.5 py-1.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#f5d061" }}
                >
                  🎓 Færdiguddannet {graduationBadgeYear(athlete.expected_graduation)}
                </span>
              ) : !athlete.active ? (
                <span className="text-[10px] tracking-[0.15em] uppercase text-white/40">
                  Tidligere atlet
                </span>
              ) : null}
            </div>

            <h1 style={{ fontFamily: "var(--font-serif)" }}
              className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight">
              {athlete.name}
            </h1>

            <p className="text-white/55 text-base mt-3 tracking-wide">
              {[athlete.position, athlete.university,
                athlete.university_state && `${athlete.university_state}, USA`]
                .filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="h-[3px]" style={{ backgroundColor: "#BF0A30" }} />
      </header>

      {/* ── Indhold ────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-10">
        <Breadcrumb crumbs={[
          { label: "Forside", href: "/" },
          { label: "Atleter", href: "/atleter" },
          { label: athlete.name },
        ]} />

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 mt-8">

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-4">
              Fakta
            </p>
            <dl className="divide-y" style={{ borderTop: "1px solid #E2E0DC", borderBottom: "1px solid #E2E0DC" }}>
              {STAT_ROWS(athlete).map((row) => (
                <div key={row.label} className="flex justify-between items-baseline py-3 px-1 gap-4">
                  <dt className="text-xs text-muted tracking-wide flex-shrink-0">{row.label}</dt>
                  <dd className="text-sm font-semibold text-ink text-right">{row.value}</dd>
                </div>
              ))}
            </dl>

            {athlete.bio_url && (
              <a href={athlete.bio_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-5 text-xs font-bold tracking-[0.1em]
                           uppercase hover:underline"
                style={{ color: "#BF0A30" }}>
                Officiel profil hos {athlete.university} ↗
              </a>
            )}
          </aside>

          {/* ── Hoved ────────────────────────────────────────────── */}
          <div>
            {/* Profilresumé */}
            {athlete.profile_summary && (
              <section className="mb-10 pb-10" style={{ borderBottom: "1px solid #E2E0DC" }}>
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-4">
                  Om {athlete.name}
                </p>
                <p className="text-base text-ink leading-relaxed">{athlete.profile_summary}</p>
              </section>
            )}

            {/* Artikler */}
            {articles.length > 0 ? (
              <section>
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-5">
                  Artikler
                </p>
                <div className="flex flex-col">
                  {articles.map((a, i) => (
                    <a key={a.id} href={getArticleUrl(a)}
                      className="group flex gap-4 items-start py-5 hover:bg-surface -mx-3 px-3
                                 transition-colors"
                      style={{ borderTop: i > 0 ? "1px solid #E2E0DC" : "none" }}>
                      {a.cover_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.cover_image_url} alt=""
                          className="w-20 h-14 object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase"
                          style={{ color: "#BF0A30" }}>
                          {ARTICLE_TYPE_LABELS[a.article_type] ?? a.article_type}
                        </span>
                        <p className="text-sm font-bold text-ink leading-snug mt-1
                                      group-hover:underline"
                          style={{ fontFamily: "var(--font-serif)" }}>
                          {a.title}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {formatDateShort(a.published_at)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            ) : (
              <p className="text-muted text-sm">Ingen artikler endnu.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
