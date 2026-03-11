import type { School, Athlete, Article } from "@/lib/types";
import { ARTICLE_TYPE_LABELS } from "@/lib/types";
import { formatDateShort, schoolStructuredData, getAthleteUrl, getArticleUrl } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

interface Props { school: School; athletes: Athlete[]; articles: Article[] }

export function SchoolProfilePage({ school, athletes, articles }: Props) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(schoolStructuredData(school))
      }} />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <header style={{ backgroundColor: "#00205B" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "10px 10px",
          }} />

        <div className="h-[3px]" style={{ backgroundColor: "#BF0A30" }} />

        <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white
                             border border-white/25 px-3 py-1.5">
              {school.division}
            </span>
            {school.conference && (
              <span className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-medium">
                {school.conference}
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: "var(--font-serif)" }}
            className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-3">
            {school.name}
          </h1>

          <p className="text-white/50 text-sm tracking-widest">
            {[school.state, "USA"].filter(Boolean).join(", ")}
          </p>

          {school.website && (
            <a href={school.website} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-4 text-xs tracking-[0.12em] uppercase font-bold hover:underline"
              style={{ color: "#BF0A30" }}>
              {school.website.replace(/^https?:\/\//, "")} →
            </a>
          )}
        </div>

        <div className="h-[3px]" style={{ backgroundColor: "#BF0A30" }} />
      </header>

      {/* ── Faktaboks ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#F7F6F4", borderBottom: "1px solid #E2E0DC" }}>
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x">
            {[
              { label: "Division",         value: school.division },
              { label: "Conference",       value: school.conference ?? "–" },
              { label: "Stat",             value: school.state ?? "–" },
              { label: "Danske atleter",   value: String(athletes.length) },
            ].map((stat) => (
              <div key={stat.label} className="px-5 py-5">
                <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">{stat.label}</dt>
                <dd className="text-2xl font-black text-ink mt-1"
                  style={{ fontFamily: "var(--font-serif)" }}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Indhold ────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-10">
        <Breadcrumb crumbs={[
          { label: "Hjem", href: "/" },
          { label: school.name },
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 mt-8">
          {/* Venstre: atleter */}
          <section>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-5">
              Danske atleter på {school.name}
            </p>

            {athletes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {athletes.map((a) => (
                  <a key={a.id} href={getAthleteUrl(a.slug)}
                    className="group flex items-center gap-4 p-4 transition-colors
                               hover:bg-surface"
                    style={{ border: "1px solid #E2E0DC" }}>
                    {/* Avatar */}
                    <div className="w-12 h-14 flex-shrink-0 overflow-hidden
                                    flex items-center justify-center text-white font-black text-lg"
                      style={{
                        backgroundColor: "#00205B",
                        fontFamily: "var(--font-serif)",
                      }}>
                      {a.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.photo_url} alt={a.name} className="w-full h-full object-cover" />
                      ) : a.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink group-hover:underline truncate text-sm"
                        style={{ fontFamily: "var(--font-serif)" }}>
                        {a.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {[a.sport, a.position].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm">Ingen registrerede atleter endnu.</p>
            )}
          </section>

          {/* Højre: seneste artikler */}
          {articles.length > 0 && (
            <aside>
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-5">
                Seneste nyheder
              </p>
              <div className="flex flex-col">
                {articles.map((a, i) => (
                  <a key={a.id} href={getArticleUrl(a)}
                    className="group flex gap-3 py-4 hover:bg-surface -mx-3 px-3 transition-colors"
                    style={{ borderTop: i > 0 ? "1px solid #E2E0DC" : "none" }}>
                    {a.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.cover_image_url} alt=""
                        className="w-16 h-12 object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold tracking-[0.12em] uppercase"
                        style={{ color: "#BF0A30" }}>
                        {ARTICLE_TYPE_LABELS[a.article_type] ?? a.article_type}
                      </span>
                      <p className="text-sm font-bold text-ink leading-snug mt-0.5
                                    group-hover:underline line-clamp-2"
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
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
