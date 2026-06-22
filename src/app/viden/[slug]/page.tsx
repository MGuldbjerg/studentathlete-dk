import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { BASE_URL, getOgImageUrl, breadcrumbStructuredData, formatDate } from "@/lib/seo";
import {
  getGuide,
  getGuideSlugs,
  CATEGORY_LABELS,
  type VidenGuide,
} from "@/lib/viden-content";

type Params = Promise<{ slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Side ikke fundet" };

  const canonical = `${BASE_URL}/viden/${guide.slug}`;
  const ogImage = getOgImageUrl({
    title: guide.title,
    subtitle: "StudentAthlete.dk · Viden",
    type: "article",
  });
  return {
    title: `${guide.metaTitle} | StudentAthlete.dk`,
    description: guide.description,
    alternates: { canonical },
    openGraph: {
      title: guide.title,
      description: guide.description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: guide.title }],
      type: "article",
      siteName: "StudentAthlete.dk",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

// [label](/sti) → <Link> (interne) eller <a> (eksterne). Bruges i prosa for
// kontekstuel intern link-building.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, label, href] = m;
    const linkClass = "underline decoration-1 underline-offset-2 hover:opacity-80";
    out.push(
      href.startsWith("/") ? (
        <Link key={`${keyPrefix}-${i}`} href={href} className={linkClass} style={{ color: "#BF0A30" }}>
          {label}
        </Link>
      ) : (
        <a key={`${keyPrefix}-${i}`} href={href} rel="noopener noreferrer" className={linkClass} style={{ color: "#BF0A30" }}>
          {label}
        </a>
      ),
    );
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const stripInline = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function guideJsonLd(guide: VidenGuide) {
  const url = `${BASE_URL}/viden/${guide.slug}`;
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    inLanguage: "da",
    dateModified: guide.updated,
    mainEntityOfPage: url,
    url,
    publisher: { "@type": "Organization", name: "StudentAthlete.dk", url: BASE_URL },
    author: { "@type": "Organization", name: "StudentAthlete.dk" },
  };
  const faq = guide.faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: stripInline(f.a) },
        })),
      }
    : null;
  const crumbs = breadcrumbStructuredData([
    { name: "Forside", url: BASE_URL },
    { name: "Viden", url: `${BASE_URL}/viden` },
    { name: guide.title, url },
  ]);
  return [article, crumbs, ...(faq ? [faq] : [])];
}

export default async function GuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd(guide)) }}
      />

      <Breadcrumb
        crumbs={[
          { label: "Forside", href: "/" },
          { label: "Viden", href: "/viden" },
          { label: guide.title },
        ]}
      />

      <p className="mt-6 text-xs font-bold tracking-[0.15em] uppercase" style={{ color: "#BF0A30" }}>
        {CATEGORY_LABELS[guide.category]}
      </p>
      <h1
        className="text-3xl md:text-4xl font-bold text-ink mt-2 mb-3 leading-tight"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {guide.title}
      </h1>
      <p className="text-muted text-base md:text-lg leading-relaxed mb-2">{guide.intro}</p>
      <p className="text-xs text-muted mb-10">Opdateret {formatDate(guide.updated)}</p>

      {/* ── Sektioner ───────────────────────────────────────────────── */}
      <article className="flex flex-col gap-8">
        {guide.sections.map((section, si) => (
          <section key={si}>
            <h2
              className="text-xl md:text-2xl font-bold text-ink mb-3"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {section.heading}
            </h2>
            {section.body?.map((p, pi) => (
              <p key={pi} className="text-ink/90 leading-relaxed mb-3">
                {renderInline(p, `s${si}-p${pi}`)}
              </p>
            ))}
            {section.list && (
              <ul className="list-disc pl-5 flex flex-col gap-1.5">
                {section.list.map((item, li) => (
                  <li key={li} className="text-ink/90 leading-relaxed">
                    {renderInline(item, `s${si}-l${li}`)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      {guide.faqs && guide.faqs.length > 0 && (
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-ink mb-5" style={{ fontFamily: "var(--font-serif)" }}>
            Ofte stillede spørgsmål
          </h2>
          <div className="flex flex-col gap-5">
            {guide.faqs.map((f, fi) => (
              <div key={fi}>
                <p className="font-bold text-ink mb-1">{f.q}</p>
                <p className="text-ink/90 leading-relaxed">{renderInline(f.a, `faq${fi}`)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Relateret (intern link-building) ────────────────────────── */}
      <section className="mt-12 pt-8 border-t border-border">
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-muted mb-4">
          Læs også
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guide.related.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="p-4 rounded-lg border border-border bg-paper hover:bg-surface transition-colors
                         text-sm font-medium text-ink"
            >
              {r.label} →
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
