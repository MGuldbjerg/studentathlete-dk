import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ArticleBody } from "@/components/ui/ArticleBody";
import { AdminEditButton } from "@/components/AdminEditButton";
import { getOgImageUrl, breadcrumbStructuredData, formatDate} from "@/lib/seo";
import { getPublishedGuideBySlug } from "@/lib/admin";
import { currentSite, currentBaseUrl, siteRobots } from "@/lib/site-server";
import { routePath, t } from "@/lib/i18n";
import {
  getGuide,
  guideToMarkdown,
  CATEGORY_LABELS,
  type GuideCategory,
} from "@/lib/viden-content";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

interface ResolvedGuide {
  title: string;
  content: string; // markdown
  description: string;
  category: string | null;
  updated: string;
}

// D1 (redigerbar) som primær; kode-guide som fail-safe fallback (rate-limit-sikkert).
async function resolveGuide(slug: string): Promise<ResolvedGuide | null> {
  const db = await getPublishedGuideBySlug(slug);
  if (db) {
    return {
      title: db.title,
      content: db.content,
      description: db.meta_description ?? "",
      category: db.category ?? null,
      updated: new Date().toISOString().slice(0, 10),
    };
  }
  const site = await currentSite();
  const code = getGuide(slug, site.language);
  if (code) {
    return {
      title: code.title,
      content: guideToMarkdown(code),
      description: code.description,
      category: code.category,
      updated: code.updated,
    };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const base = await currentBaseUrl();
  const site = await currentSite();
  const { slug } = await params;
  const g = await resolveGuide(slug);
  if (!g) return { title: "Side ikke fundet" };
  const canonical = `${base}${routePath("guides", site.language)}/${slug}`;
  const ogImage = getOgImageUrl({ title: g.title, subtitle: site.brand, type: "article" });
  return {
    title: `${g.title} | ${site.brand}`,
    description: g.description || undefined,
    alternates: { canonical },
    openGraph: {
      title: g.title,
      description: g.description || undefined,
      images: [{ url: ogImage, width: 1200, height: 630, alt: g.title }],
      type: "article",
      siteName: site.brand,
      url: canonical,
    },
    twitter: { card: "summary_large_image", title: g.title, description: g.description || undefined, images: [ogImage] },
    robots: await siteRobots(),
  };
}

export default async function GuidePage({ params }: { params: Params }) {
  const base = await currentBaseUrl();
  const site = await currentSite();
  const { slug } = await params;
  const g = await resolveGuide(slug);
  if (!g) notFound();

  const url = `${base}${routePath("guides", site.language)}/${slug}`;
  const categoryLabel =
    g.category && g.category in CATEGORY_LABELS
      ? CATEGORY_LABELS[g.category as GuideCategory]
      : null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: g.title,
      description: g.description || undefined,
      inLanguage: site.language,
      dateModified: g.updated,
      mainEntityOfPage: url,
      url,
      publisher: { "@type": "Organization", name: site.brand, url: base },
      author: { "@type": "Organization", name: site.brand },
    },
    breadcrumbStructuredData([
      { name: "Forside", url: base },
      { name: "Viden", url: `${base}/viden` },
      { name: g.title, url },
    ]),
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumb
        crumbs={[
          { label: "Forside", href: "/" },
          { label: t("guides.crumb", site.language), href: routePath("guides", site.language) },
          { label: g.title },
        ]}
      />

      {categoryLabel && (
        <p className="mt-6 text-xs font-bold tracking-[0.15em] uppercase" style={{ color: "#BF0A30" }}>
          {categoryLabel}
        </p>
      )}
      <h1
        className="text-3xl md:text-4xl font-bold text-ink mt-2 mb-6 leading-tight"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {g.title}
      </h1>

      <ArticleBody content={g.content} />
      <AdminEditButton href={`/admin/sider/${slug}`} label="Rediger guide" />
    </main>
  );
}
