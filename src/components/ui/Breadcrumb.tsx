import { BASE_URL, breadcrumbStructuredData } from "@/lib/seo";

interface Crumb { label: string; href?: string }

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const schemaData = breadcrumbStructuredData(
    crumbs.map((c) => ({ name: c.label, url: c.href ? `${BASE_URL}${c.href}` : BASE_URL }))
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <nav aria-label="Brødkrumme" className="text-sm text-muted flex items-center gap-1.5 flex-wrap">
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
