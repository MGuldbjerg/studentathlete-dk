import type { Metadata } from "next";
import Link from "next/link";
import { getSportColor } from "@/lib/types";
import { getSportContent, getSportSlugs } from "@/lib/sport-content";
import { guidesFor, categoryLabels, type GuideCategory } from "@/lib/viden-content";
import { currentLanguage, currentSite } from "@/lib/site-server";
import { t } from "@/lib/i18n";
import { getPublishedGuides } from "@/lib/admin";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [lang, site] = await Promise.all([currentLanguage(), currentSite()]);
  return {
    title: `${t("guides.meta_title", lang)} | ${site.brand}`,
    description: t("guides.meta_description", lang),
    alternates: { canonical: "/viden" },
  };
}

const CATEGORY_ORDER: GuideCategory[] = ["system", "begreber", "saeson"];

interface HubGuide {
  slug: string;
  title: string;
  description: string;
  category: GuideCategory;
}

export default async function VidenPage() {
  // D1 (redigerbar) som primær; kode-guides som fallback.
  const lang = await currentLanguage();
  const dbGuides = await getPublishedGuides();
  const guides: HubGuide[] = dbGuides.length
    ? dbGuides.map((g) => ({
        slug: g.slug,
        title: g.title,
        description: g.meta_description ?? "",
        category: (g.category && g.category in categoryLabels(lang)
          ? g.category
          : "system") as GuideCategory,
      }))
    : guidesFor(lang).map((g) => ({
        slug: g.slug,
        title: g.title,
        description: g.description,
        category: g.category,
      }));

  // Sport-teksterne er sprogstyrede: slug OG titel skal komme fra sprogets
  // eget sæt, ellers linker det engelske site til de danske sport-sider.
  const sportEntries = getSportSlugs(lang)
    .filter((slug) => slug !== "andet" && slug !== "other")
    .map((slug) => [slug, getSportContent(slug, lang)] as const)
    .filter((e): e is readonly [string, NonNullable<ReturnType<typeof getSportContent>>] => !!e[1]);

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <Breadcrumb
        crumbs={[{ label: t("crumb.home", lang), href: "/" }, { label: t("guides.crumb", lang) }]}
      />

      <h1 className="text-3xl font-bold text-ink mt-6 mb-3" style={{ fontFamily: "var(--font-serif)" }}>
        {t("guides.meta_title", lang)}
      </h1>
      <p className="text-muted text-base mb-10 max-w-2xl">{t("guides.intro", lang)}</p>

      {CATEGORY_ORDER.map((cat) => {
        const inCat = guides.filter((g) => g.category === cat);
        if (inCat.length === 0) return null;
        return (
          <section key={cat} className="mb-12">
            <h2 className="text-xl font-bold text-ink mb-5" style={{ fontFamily: "var(--font-serif)" }}>
              {categoryLabels(lang)[cat]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inCat.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/viden/${guide.slug}`}
                  className="block p-5 rounded-lg border border-border bg-paper hover:bg-surface transition-colors group"
                >
                  <h3 className="text-base font-bold text-ink mb-1 group-hover:underline" style={{ fontFamily: "var(--font-serif)" }}>
                    {guide.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">{guide.description}</p>
                  <span className="inline-block mt-3 text-sm font-medium" style={{ color: "#BF0A30" }}>
                    {t("guides.read_more", lang)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Reference-hubs */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-ink mb-5" style={{ fontFamily: "var(--font-serif)" }}>
          {t("guides.lookup_heading", lang)}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/skoler" className="block p-5 rounded-lg border border-border bg-paper hover:bg-surface transition-colors group">
            <h3 className="text-base font-bold text-ink mb-1 group-hover:underline" style={{ fontFamily: "var(--font-serif)" }}>
              {t("guides.schools_card_title", lang)}
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              {t("guides.schools_card_body", lang)}
            </p>
          </Link>
          <Link href="/atleter" className="block p-5 rounded-lg border border-border bg-paper hover:bg-surface transition-colors group">
            <h3 className="text-base font-bold text-ink mb-1 group-hover:underline" style={{ fontFamily: "var(--font-serif)" }}>
              {t("guides.athletes_card_title", lang)}
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              {t("guides.athletes_card_body", lang)}
            </p>
          </Link>
        </div>
      </section>

      {/* Sport-sider */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-5" style={{ fontFamily: "var(--font-serif)" }}>
          {t("guides.sports_heading", lang)}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sportEntries.map(([slug, content]) => {
            const color = getSportColor(slug);
            return (
              <Link
                key={slug}
                href={`/${slug}`}
                className="flex items-center gap-3 p-4 rounded-lg border border-border bg-paper hover:bg-surface transition-colors group"
              >
                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink group-hover:underline" style={{ fontFamily: "var(--font-serif)" }}>
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
