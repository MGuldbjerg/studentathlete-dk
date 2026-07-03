import type { Article, Athlete } from "@/lib/types";
import { formatDate, articleStructuredData, getAthleteUrl } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { RelatedArticles } from "@/components/ui/RelatedArticles";
import { AdSlot } from "@/components/ui/AdSlot";
import { SourceBox } from "@/components/ui/SourceBox";
import { AiDisclaimer } from "@/components/ui/AiDisclaimer";
import { CorrectionNotice } from "@/components/ui/CorrectionNotice";

interface Props {
  article: Article;
  athlete?: Athlete | null;
  relatedArticles?: Article[];
}

export function RecruitingTemplate({ article, athlete, relatedArticles = [] }: Props) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(articleStructuredData(article, athlete))
      }} />

      <article>
        {/* ── Annonceringsbanner ─────────────────────────────────── */}
        <header className="w-full relative overflow-hidden"
          style={{ backgroundColor: "#00205B" }}>

          {/* Subtil tekstur-overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
              backgroundSize: "8px 8px"
            }} />

          <div className="h-[3px] w-full" style={{ backgroundColor: "#BF0A30" }} />

          <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-12 md:py-16">
            {/* OFFICIELT badge */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 text-white border border-white/20 px-3 py-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#BF0A30" }} />
                <span className="text-[10px] font-black tracking-[0.25em] uppercase">Officielt</span>
              </div>
              <span className="text-white/30 text-[10px] tracking-[0.2em] uppercase">
                Rekruttering · {article.sport ?? "Student Athlete"}
              </span>
            </div>

            {/* Split-layout: atlet til venstre, tekst til højre */}
            <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
              {/* Atletfoto */}
              {athlete?.photo_url && (
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={athlete.photo_url} alt={athlete.name}
                    className="w-40 h-40 md:w-52 md:h-52 object-cover"
                    style={{ border: "3px solid #BF0A30" }} />
                </div>
              )}

              {/* Tekst */}
              <div className="flex-1">
                {athlete && (
                  <p className="text-white/50 text-xs tracking-[0.2em] uppercase mb-2 font-medium">
                    {athlete.hometown ?? "Danmark"} · {athlete.sport}
                  </p>
                )}
                <h1 style={{ fontFamily: "var(--font-serif)" }}
                  className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-4">
                  {article.title}
                </h1>
                {article.summary && (
                  <p className="text-white/65 text-base md:text-lg leading-relaxed max-w-xl"
                    style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                    {article.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Dato */}
            {article.published_at && (
              <p className="text-white/30 text-xs tracking-widest mt-10">
                <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
                {article.author && <> · Af {article.author}</>}
              </p>
            )}
          </div>

          <div className="h-[3px] w-full" style={{ backgroundColor: "#BF0A30" }} />
        </header>

        {/* ── Indhold ────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto px-5 md:px-0 pt-10">
          <Breadcrumb crumbs={[
            { label: "Hjem", href: "/" },
            { label: "Rekruttering", href: "/?article_type=recruiting" },
            { label: article.title },
          ]} />

          <div className="h-px mb-10 mt-8" style={{ backgroundColor: "#E2E0DC" }} />
          <ArticleBody content={article.content} />
          <CorrectionNotice article={article} />
          <SourceBox sourceUrl={article.source_url} />
          {article.author_role !== "human" && <AiDisclaimer />}

          {/* Atletfaktaboks */}
          {athlete && (
            <aside className="mt-10 mb-10">
              {/* Rød venstre-linje */}
              <div className="flex">
                <div className="w-[3px] flex-shrink-0 mr-5"
                  style={{ backgroundColor: "#BF0A30" }} />
                <div className="flex-1">
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-4">
                    Om atleten
                  </p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {[
                      { label: "Navn", value: athlete.name },
                      { label: "Sport", value: athlete.sport },
                      { label: "Position", value: athlete.position },
                      { label: "Hjemby", value: athlete.hometown },
                      { label: "Universitet", value: athlete.university },
                      { label: "Division", value: athlete.division },
                    ].filter((r) => r.value).map((row) => (
                      <div key={row.label}>
                        <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">{row.label}</dt>
                        <dd className="text-sm font-semibold text-ink mt-0.5">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <a href={getAthleteUrl(athlete.slug)}
                    className="inline-block mt-5 text-xs font-bold tracking-[0.12em] uppercase hover:underline"
                    style={{ color: "#BF0A30" }}>
                    Se fuld profil →
                  </a>
                </div>
              </div>
            </aside>
          )}

          <AdSlot slot="article-footer" className="my-6" />
          <RelatedArticles articles={relatedArticles} title="Mere om rekruttering" />
        </div>
      </article>
    </>
  );
}
