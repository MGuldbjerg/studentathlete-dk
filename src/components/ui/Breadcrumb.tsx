import { breadcrumbStructuredData } from "@/lib/seo";
import { currentBaseUrl, currentLanguage } from "@/lib/site-server";
import { t } from "@/lib/i18n";

interface Crumb { label: string; href?: string }

export async function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  // Absolut URL pr. vært: med modul-konstanten pegede brødkrumme-JSON-LD'en
  // på standardsitet fra ALLE sites (samme fælde som canonical/sitemap).
  const base = await currentBaseUrl();
  const lang = await currentLanguage();
  const schemaData = breadcrumbStructuredData(
    crumbs.map((c) => ({ name: c.label, url: c.href ? `${base}${c.href}` : base }))
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <nav aria-label={t("crumb.aria", lang)} className="text-sm text-muted flex items-center gap-1.5 flex-wrap">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-border">›</span>}
            {crumb.href && i < crumbs.length - 1 ? (
              <a href={crumb.href} className="hover:text-ink transition-colors">
                {crumb.label}
              </a>
            ) : (
              <span className={i === crumbs.length - 1 ? "text-ink font-medium" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
