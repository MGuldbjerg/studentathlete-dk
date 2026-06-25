import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPages } from "@/lib/admin";

export default async function AdminPagesPage() {

  const dbPages = await getAllPages();

  // Vis altid kendte sider, også selvom de ikke er gemt i DB endnu
  const KNOWN_PAGES = [
    { slug: "om", title: "Om StudentAthlete.dk" },
    { slug: "kontakt", title: "Kontakt" },
    { slug: "ai-brug", title: "Sådan bruger vi AI" },
  ];
  const dbSlugs = new Set(dbPages.map((p) => p.slug));
  const pages = [
    ...dbPages,
    ...KNOWN_PAGES.filter((d) => !dbSlugs.has(d.slug)).map((d) => ({
      ...d,
      meta_description: null,
      published: null as number | null,
      updated_at: null,
      kind: "page",
    })),
  ];

  const GROUPS = [
    { kind: "page", label: "Sider" },
    { kind: "guide", label: "Guider (viden)" },
    { kind: "sport", label: "Sportssider" },
  ];

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Sider</h1>
          <Link
            href={`/admin`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>

        {GROUPS.map((g) => {
          const inGroup = pages.filter(
            (p) => ((p as { kind?: string }).kind ?? "page") === g.kind,
          );
          if (inGroup.length === 0) return null;
          return (
            <section key={g.kind} className="mb-8">
              <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-muted mb-3">
                {g.label} <span className="text-muted/60">· {inGroup.length}</span>
              </h2>
              <div className="flex flex-col gap-3">
                {inGroup.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/admin/sider/${page.slug}`}
                    className="block bg-paper rounded-lg border border-border p-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-lg font-bold text-ink"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {page.title}
                      </h3>
                      {page.published === 1 ? (
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: "#d1fae5", color: "#065f46" }}
                        >
                          Publiceret
                        </span>
                      ) : page.published === 0 ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                          Kladde
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-400">
                          Ikke oprettet
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">/{page.slug}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <Link
          href={`/admin/sider/ny`}
          className="mt-6 block w-full py-3 rounded-lg font-semibold text-white text-center transition-opacity"
          style={{ backgroundColor: "#00205B" }}
        >
          + Opret ny side
        </Link>
      </div>
    </main>
  );
}
