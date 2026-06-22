import type { Metadata } from "next";
import Link from "next/link";
import { getSchoolsWithAthletes } from "@/lib/db";
import { BASE_URL, getSchoolUrl, breadcrumbStructuredData } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Universiteter med danske atleter | StudentAthlete.dk",
  description:
    "Overblik over de amerikanske universiteter, hvor danske student athletes går — sorteret efter NCAA-division med conference og antal danskere.",
  alternates: { canonical: "/skoler" },
  robots: { index: true, follow: true },
};

// Rangér divisioner i logisk rækkefølge; ukendte sidst.
function divisionRank(div: string): number {
  const d = div.toLowerCase();
  if (d.includes("i") && !d.includes("ii") && !d.includes("iii")) return 0;
  if (d.includes("iii")) return 2;
  if (d.includes("ii")) return 1;
  if (d.includes("naia")) return 3;
  if (d.includes("njcaa") || d.includes("juco")) return 4;
  return 5;
}

export default async function SkolerPage() {
  const schools = await getSchoolsWithAthletes();

  // Gruppér efter division
  const groups = new Map<string, typeof schools>();
  for (const s of schools) {
    const key = s.division || "Andet";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const orderedDivisions = [...groups.keys()].sort(
    (a, b) => divisionRank(a) - divisionRank(b) || a.localeCompare(b),
  );

  const totalSchools = schools.length;
  const totalAthletes = schools.reduce((n, s) => n + s.athlete_count, 0);

  const jsonLd = breadcrumbStructuredData([
    { name: "Forside", url: BASE_URL },
    { name: "Universiteter", url: `${BASE_URL}/skoler` },
  ]);

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        crumbs={[
          { label: "Forside", href: "/" },
          { label: "Universiteter" },
        ]}
      />

      <h1
        className="text-3xl font-bold text-ink mt-6 mb-3"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Universiteter med danske atleter
      </h1>
      <p className="text-muted text-base mb-3 max-w-2xl">
        De amerikanske universiteter, hvor vi følger danske student athletes —
        grupperet efter NCAA-division. Læs mere om forskellene i vores guide til{" "}
        <Link href="/viden/ncaa-divisioner" className="underline" style={{ color: "#BF0A30" }}>
          divisioner i NCAA
        </Link>
        .
      </p>
      {totalSchools > 0 && (
        <p className="text-sm text-muted mb-10">
          {totalSchools} universiteter · {totalAthletes} danske atleter
        </p>
      )}

      {totalSchools === 0 && (
        <p className="text-muted">Ingen universiteter at vise endnu.</p>
      )}

      {orderedDivisions.map((division) => {
        const list = groups.get(division)!;
        return (
          <section key={division} className="mb-12">
            <h2
              className="text-sm font-bold tracking-[0.12em] uppercase text-muted mb-4 pb-2 border-b border-border"
            >
              {division} <span className="text-muted/70">· {list.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {list.map((s) => (
                <Link
                  key={s.id}
                  href={getSchoolUrl(s.slug)}
                  className="flex items-start justify-between gap-3 p-4 rounded-lg border border-border
                             bg-paper hover:bg-surface transition-colors group"
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-bold text-ink group-hover:underline leading-snug"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {s.name}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {[s.conference, s.state].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs font-bold rounded-full px-2 py-0.5 text-white"
                    style={{ backgroundColor: "#00205B" }}
                    title={`${s.athlete_count} danske atleter`}
                  >
                    {s.athlete_count}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
