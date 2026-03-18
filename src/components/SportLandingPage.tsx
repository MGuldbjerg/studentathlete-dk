import Link from "next/link";
import type { Article, Athlete } from "@/lib/types";
import { getSportColor } from "@/lib/types";
import { getAthleteUrl } from "@/lib/seo";
import type { SportContent } from "@/lib/sport-content";
import { ArticleCard } from "./ArticleCard";
import { Breadcrumb } from "./ui/Breadcrumb";

interface Props {
  sport: string;
  content: SportContent;
  articles: Article[];
  athletes: Athlete[];
  counts: { active: number; alumni: number };
}

export function SportLandingPage({ sport, content, articles, athletes, counts }: Props) {
  const color = getSportColor(sport);
  const [featured, ...rest] = articles;
  const total = counts.active + counts.alumni;

  return (
    <main>
      {/* Brødkrumme */}
      <div className="px-4 md:px-8 pt-6">
        <Breadcrumb
          crumbs={[
            { label: "Forside", href: "/" },
            { label: content.title },
          ]}
        />
      </div>

      {/* Hero-banner */}
      <section className="px-4 md:px-8 pt-6 pb-10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-1.5 h-10 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h1
            className="text-3xl md:text-4xl font-bold text-ink"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {content.title}
          </h1>
        </div>
        <p className="text-muted text-base md:text-lg max-w-2xl mb-3">
          {content.intro}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted">
          {counts.active > 0 && (
            <span>
              <strong className="text-ink">{counts.active}</strong> aktive atleter
            </span>
          )}
          {counts.alumni > 0 && (
            <span>
              <strong className="text-ink">{counts.alumni}</strong> alumni
            </span>
          )}
          {articles.length > 0 && (
            <span>
              <strong className="text-ink">{articles.length}</strong> artikler
            </span>
          )}
        </div>
      </section>

      {/* ── Seneste nyheder ────────────────────────────────────────── */}
      {articles.length > 0 && (
        <section className="px-4 md:px-8 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h2
              className="text-xl font-bold text-ink"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Seneste nyheder
            </h2>
          </div>

          <div className="space-y-6">
            {featured && <ArticleCard article={featured} featured />}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Danske atleter ─────────────────────────────────────────── */}
      {athletes.length > 0 && (
        <section className="px-4 md:px-8 py-10 border-t border-border">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: color }}
            />
            <h2
              className="text-xl font-bold text-ink"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Danske {content.title.toLowerCase()}-atleter i USA
            </h2>
            <span className="text-xs text-muted">({athletes.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {athletes.map((athlete) => (
              <Link
                key={athlete.id}
                href={getAthleteUrl(athlete.slug)}
                className="flex items-center gap-4 p-4 rounded-lg border border-border
                           bg-paper hover:bg-surface transition-colors group"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center
                             text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {athlete.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-bold text-ink leading-snug
                               group-hover:underline truncate"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {athlete.name}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {athlete.university}
                    {athlete.position && ` · ${athlete.position}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {total > athletes.length && (
            <div className="mt-4 text-center">
              <Link
                href="/atleter"
                className="text-sm text-muted hover:text-ink transition-colors"
              >
                Se alle atleter →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Intet indhold endnu ────────────────────────────────────── */}
      {articles.length === 0 && athletes.length === 0 && (
        <section className="px-4 md:px-8 py-16 text-center text-muted">
          <p className="text-lg mb-2">Vi har endnu ikke indhold om {content.title.toLowerCase()}.</p>
          <p className="text-sm">Atleter og nyheder tilføjes løbende.</p>
        </section>
      )}

      {/* ── Evergreen pillar-tekst (SEO) ───────────────────────────── */}
      <section className="px-4 md:px-8 py-10 border-t border-border">
        <div className="max-w-3xl mx-auto prose prose-sm prose-slate">
          <PillarContent markdown={content.pillar} />
        </div>
      </section>
    </main>
  );
}

/** Simpel markdown → HTML for pillar-tekst (kun ## og ### overskrifter + afsnit) */
function PillarContent({ markdown }: { markdown: string }) {
  const lines = markdown.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let key = 0;

  function flushParagraph() {
    if (paragraph.length > 0) {
      elements.push(
        <p key={key++} className="text-muted text-sm leading-relaxed mb-4">
          {paragraph.join(" ")}
        </p>
      );
      paragraph = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      elements.push(
        <h3
          key={key++}
          className="text-base font-bold text-ink mt-6 mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushParagraph();
      elements.push(
        <h2
          key={key++}
          className="text-lg font-bold text-ink mt-8 mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed === "") {
      flushParagraph();
    } else {
      paragraph.push(trimmed);
    }
  }
  flushParagraph();

  return <>{elements}</>;
}
