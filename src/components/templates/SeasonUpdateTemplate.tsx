import type { Article, Athlete } from "@/lib/types";
import { formatDate, getReadingTime, articleStructuredData, getAthleteUrl } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { RelatedArticles } from "@/components/ui/RelatedArticles";

interface Props {
  article: Article;
  athlete?: Athlete | null;
  relatedArticles?: Article[];
}

function getSeason(dateStr: string | null): string {
  if (!dateStr) return "";
  const year = new Date(dateStr).getFullYear();
  return `${year - 1}–${String(year).slice(2)}`;
}

export function SeasonUpdateTemplate({ article, athlete, relatedArticles = [] }: Props) {
  const readTime = getReadingTime(article.content);
  const season = getSeason(article.published_at);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleStructuredData(article, athlete))
      }} />

      <article className="max-w-2xl mx-auto px-5 md:px-0 py-10">
        <Breadcrumb crumbs={[
          { label: "Hjem", href: "/" },
          { label: "Sæsonopdateringer", href: "/?article_type=season_update" },
          { label: article.title },
        ]} />

        {/* ── Sæson-badge ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-6 mb-5">
          {season && (
            <span className="text-[10px] font-black tracking-[0.2em] uppercase px-2.5 py-1.5"
              style={{ color: "#00205B", border: "1.5px solid #00205B" }}>
              Sæson {season}
            </span>
          )}
          {article.sport && (
            <span className="text-[10px] tracking-[0.15em] uppercase text-muted font-medium">
              {article.sport}
            </span>
          )}
        </div>

        {/* ── Overskrift ─────────────────────────────────────────── */}
        <h1 style={{ fontFamily: "var(--font-serif)" }}
          className="text-4xl md:text-5xl font-black text-ink leading-[1.08] tracking-tight mb-5">
          {article.title}
        </h1>

        {article.summary && (
          <p className="text-xl text-ink/75 leading-relaxed mb-6"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
            {article.summary}
          </p>
        )}

        {/* Byline */}
        <div className="flex items-center justify-between py-3 border-y text-xs flex-wrap gap-2"
          style={{ borderColor: "#E2E0DC" }}>
          <div className="flex items-center gap-2 text-muted">
            {athlete && (
              <a href={getAthleteUrl(athlete.slug)}
                className="font-semibold text-ink hover:underline">
                {athlete.name}
              </a>
            )}
            {article.author && <span>· Af {article.author}</span>}
          </div>
          <div className="flex items-center gap-2 text-muted tracking-wide">
            {article.published_at && (
              <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
            )}
            <span style={{ color: "#E2E0DC" }}>·</span>
            <span>{readTime} min.</span>
          </div>
        </div>

        {/* ── Atletdatakort ─────────────────────────────────────── */}
        {athlete && (
          <aside className="my-8 overflow-hidden"
            style={{ border: "1px solid #E2E0DC" }}>
            {/* Blå header */}
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: "#00205B" }}>
              <div>
                <p className="text-white font-bold text-sm"
                  style={{ fontFamily: "var(--font-serif)" }}>
                  {athlete.name}
                </p>
                <p className="text-white/50 text-xs">{athlete.university}</p>
              </div>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase px-2 py-1"
                style={{ color: "#BF0A30", border: "1px solid #BF0A30" }}>
                Sæson {season}
              </span>
            </div>

            {/* Stats-grid */}
            <div className="grid grid-cols-3 divide-x"
              style={{ borderTop: "1px solid #E2E0DC" }}>
              {[
                { label: "Sport", value: athlete.sport },
                { label: "Position", value: athlete.position ?? "–" },
                { label: "Division", value: athlete.division },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-4 text-center">
                  <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">{stat.label}</dt>
                  <dd className="text-base font-bold text-ink mt-1"
                    style={{ fontFamily: "var(--font-serif)" }}>
                    {stat.value}
                  </dd>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Hero-billede */}
        {article.cover_image_url && (
          <figure className="mb-8 -mx-5 md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.cover_image_url} alt={article.title}
              className="w-full object-cover max-h-80" />
          </figure>
        )}

        <ArticleBody content={article.content} />
        <RelatedArticles articles={relatedArticles} title="Tidligere opdateringer" />
      </article>
    </>
  );
}
