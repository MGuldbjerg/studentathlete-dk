import type { Metadata } from "next";
import Link from "next/link";
import { getSportColor } from "@/lib/types";
import { SPORT_CONTENT } from "@/lib/sport-content";
import { VIDEN_GUIDES, CATEGORY_LABELS, type GuideCategory } from "@/lib/viden-content";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Viden om NCAA og college sport | StudentAthlete.dk",
  description:
    "Alt du skal vide om NCAA, college sport og danske atleter i USA. Guider til divisioner, conferences, eligibility, transfer portal og meget mere.",
  alternates: { canonical: "/viden" },
};

const CATEGORY_ORDER: GuideCategory[] = ["system", "begreber", "saeson"];

export default function VidenPage() {
  const sportEntries = Object.entries(SPORT_CONTENT).filter(
    ([slug]) => slug !== "andet",
  );

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <Breadcrumb
        crumbs={[
          { label: "Forside", href: "/" },
          { label: "Viden" },
        ]}
      />

      <h1
        className="text-3xl font-bold text-ink mt-6 mb-3"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Viden om NCAA og college sport
      </h1>
      <p className="text-muted text-base mb-10 max-w-2xl">
        Forstå det amerikanske college sport-system og følg danske atleter i
        NCAA. Her samler vi baggrundsviden og guider — fra divisioner og
        conferences til eligibility, transfer portal og de store mesterskaber.
      </p>

      {/* ── Guides grupperet efter kategori ─────────────────────────── */}
      {CATEGORY_ORDER.map((cat) => {
        const guides = VIDEN_GUIDES.filter((g) => g.category === cat);
        if (guides.length === 0) return null;
        return (
          <section key={cat} className="mb-12">
            <h2
              className="text-xl font-bold text-ink mb-5"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {guides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/viden/${guide.slug}`}
                  className="block p-5 rounded-lg border border-border bg-paper hover:bg-surface
                             transition-colors group"
                >
                  <h3
                    className="text-base font-bold text-ink mb-1 group-hover:underline"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {guide.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {guide.description}
                  </p>
                  <span
                    className="inline-block mt-3 text-sm font-medium"
                    style={{ color: "#BF0A30" }}
                  >
                    Læs mere →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Reference-hubs ──────────────────────────────────────────── */}
      <section className="mb-12">
        <h2
          className="text-xl font-bold text-ink mb-5"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Slå op
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/skoler"
            className="block p-5 rounded-lg border border-border bg-paper hover:bg-surface transition-colors group"
          >
            <h3 className="text-base font-bold text-ink mb-1 group-hover:underline" style={{ fontFamily: "var(--font-serif)" }}>
              Universiteter med danske atleter
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Overblik over de amerikanske universiteter, hvor danske student athletes går — sorteret efter division.
            </p>
          </Link>
          <Link
            href="/atleter"
            className="block p-5 rounded-lg border border-border bg-paper hover:bg-surface transition-colors group"
          >
            <h3 className="text-base font-bold text-ink mb-1 group-hover:underline" style={{ fontFamily: "var(--font-serif)" }}>
              Alle danske atleter
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Find og følg de danske atleter, vi dækker — på tværs af sportsgrene.
            </p>
          </Link>
        </div>
      </section>

      {/* ── Sport-sider ─────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xl font-bold text-ink mb-5"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Sportsgrene i NCAA
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sportEntries.map(([slug, content]) => {
            const color = getSportColor(slug);
            return (
              <Link
                key={slug}
                href={`/${slug}`}
                className="flex items-center gap-3 p-4 rounded-lg border border-border
                           bg-paper hover:bg-surface transition-colors group"
              >
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0">
                  <p
                    className="text-sm font-bold text-ink group-hover:underline"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {content.title}
                  </p>
                  <p className="text-xs text-muted truncate">{content.intro}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
