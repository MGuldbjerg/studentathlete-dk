import { notFound } from "next/navigation";
import Link from "next/link";
import { validateAdminToken, getAllPages } from "@/lib/admin";

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = await validateAdminToken(token ?? null);
  if (!valid) notFound();

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
    })),
  ];

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Sider</h1>
          <Link
            href={`/admin?token=${token}`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/admin/sider/${page.slug}?token=${token}`}
              className="block bg-paper rounded-lg border border-border p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg font-bold text-ink"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {page.title}
                </h2>
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

          {pages.length === 0 && (
            <p className="text-sm text-muted text-center py-8">
              Ingen sider oprettet endnu.
            </p>
          )}
        </div>

        <Link
          href={`/admin/sider/ny?token=${token}`}
          className="mt-6 block w-full py-3 rounded-lg font-semibold text-white text-center transition-opacity"
          style={{ backgroundColor: "#00205B" }}
        >
          + Opret ny side
        </Link>
      </div>
    </main>
  );
}
