import Link from "next/link";
import type { Article, Athlete } from "@/lib/types";
import { getSportColor } from "@/lib/types";
import { getAthleteUrl } from "@/lib/seo";
import type { SportContent } from "@/lib/sport-content";
import { ArticleCard } from "./ArticleCard";
import { Breadcrumb } from "./ui/Breadcrumb";
import { t, routePath } from "@/lib/i18n";
import { currentLanguage } from "@/lib/site-server";

interface Props {
  sport: string;
  content: SportContent;
  articles: Article[];
  athletes: Athlete[];
  counts: { active: number; alumni: number };
}

export async function SportLandingPage({ sport, content, articles, athletes, counts }: Props) {
  const lang = await currentLanguage();
  const color = getSportColor(sport);
  const [featured, ...rest] = articles;
  const total = counts.active + counts.alumni;

  return (
    <main>
      {/* Brødkrumme */}
      <div className="px-4 md:px-8 pt-6">
        <Breadcrumb
          crumbs={[
            { label: t("crumb.home", lang), href: "/" },
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
              <strong className="text-ink">{counts.active}</strong>{" "}
              {t("sport.active_athletes_label", lang)}
            </span>
          )}
          {counts.alumni > 0 && (
            <span>
              <strong className="text-ink">{counts.alumni}</strong> alumni
            </span>
          )}
          {articles.length > 0 && (
            <span>
              <strong className="text-ink">{articles.length}</strong>{" "}
              {t("sport.articles_label", lang)}
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
            {featured && <ArticleCard article={featured} variant="featured" />}
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

      {/* ── Atleter fra sitets land ─────────────────────────────────────────── */}
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
              {t("sport.athletes_heading", lang, { sport: content.title.toLowerCase() })}
            </h2>
            <span className="text-xs text-muted">({athletes.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {athletes.map((athlete) => (
              <Link
                key={athlete.id}
                href={getAthleteUrl(athlete.slug, lang)}
                data-track="internal"
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
                href={routePath("athletes", lang)}
                className="text-sm text-muted hover:text-ink transition-colors"
              >
                {t("sport.see_all_athletes", lang)}
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Intet indhold endnu ────────────────────────────────────── */}
      {articles.length === 0 && athletes.length === 0 && (
        <section className="px-4 md:px-8 py-16 text-center text-muted">
          <p className="text-lg mb-2">
            {t("sport.no_content", lang, { sport: content.title.toLowerCase() })}
          </p>
          <p className="text-sm">{t("sport.empty_note", lang)}</p>
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
/** Parse inline markdown: **fed** og [tekst](url). Interne stier og http(s)-links. */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={match.index}>{match[1]}</strong>);
    } else if (match[2] !== undefined && match[3] !== undefined) {
      const href = match[3];
      const external = href.startsWith("http");
      nodes.push(
        <a
          key={match.index}
          href={href}
          className="underline hover:text-flag-blue transition-colors"
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {match[2]}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : [text];
}

function PillarContent({ markdown }: { markdown: string }) {
  const lines = markdown.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushParagraph() {
    if (paragraph.length > 0) {
      elements.push(
        <p key={key++} className="text-muted text-sm leading-relaxed mb-4">
          {parseInline(paragraph.join(" "))}
        </p>
      );
      paragraph = [];
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc pl-5 mb-4 space-y-1">
          {listItems.map((item, i) => (
            <li key={i} className="text-muted text-sm leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  function flush() {
    flushParagraph();
    flushList();
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      flush();
      elements.push(
        <h3
          key={key++}
          className="text-base font-bold text-ink mt-6 mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {parseInline(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flush();
      elements.push(
        <h2
          key={key++}
          className="text-lg font-bold text-ink mt-8 mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {parseInline(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
    } else if (trimmed === "") {
      flush();
    } else {
      flushList();
      paragraph.push(trimmed);
    }
  }
  flush();

  return <>{elements}</>;
}
