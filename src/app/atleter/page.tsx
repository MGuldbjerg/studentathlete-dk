import type { Metadata } from "next";
import Link from "next/link";
import { getAllAthletes, getAlumniAthletes } from "@/lib/db";
import type { Athlete } from "@/lib/types";
import { getSportColor } from "@/lib/types";
import { getAthleteUrl } from "@/lib/seo";
import { graduationBadgeYear } from "@/lib/graduation";
import { AlumniToggle } from "./AlumniToggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alle atleter | StudentAthlete.dk",
  description:
    "Oversigt over danske student athletes på amerikanske universiteter. Find din favorit og følg deres karriere.",
  alternates: { canonical: "/atleter" },
};

type SortMode = "sport" | "name" | "school";
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "sport", label: "Sport" },
  { key: "name", label: "Navn" },
  { key: "school", label: "Skole" },
];

function parseSort(v: string | undefined): SortMode {
  return v === "name" || v === "school" ? v : "sport";
}

/** Grupper atleter efter nøgle; grupper sorteres alfabetisk (dansk). */
function groupBy(athletes: Athlete[], key: (a: Athlete) => string) {
  const map = new Map<string, Athlete[]>();
  for (const a of athletes) {
    const k = key(a);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(a);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "da"));
}

function SortTabs({ sort }: { sort: SortMode }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      <span className="text-xs text-muted mr-1">Sortér:</span>
      {SORT_OPTIONS.map((o) => {
        const active = o.key === sort;
        return (
          <Link
            key={o.key}
            href={`/atleter?sort=${o.key}`}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              active
                ? "text-white border-transparent"
                : "text-ink border-border bg-paper hover:bg-surface"
            }`}
            style={active ? { backgroundColor: "#00205B" } : undefined}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function AthleteCard({ athlete, faded }: { athlete: Athlete; faded?: boolean }) {
  return (
    <Link
      href={getAthleteUrl(athlete.slug)}
      className={`flex items-center gap-4 p-4 rounded-lg border border-border
                 bg-paper hover:bg-surface transition-colors group
                 ${faded ? "opacity-70" : ""}`}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center
                   text-sm font-bold text-white flex-shrink-0"
        style={{ backgroundColor: faded ? "#999" : getSportColor(athlete.sport) }}
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
          className="text-sm font-bold text-ink leading-snug group-hover:underline truncate"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {athlete.name}
          {graduationBadgeYear(athlete.expected_graduation) && (
            <span
              className="ml-1.5"
              title={`Færdiguddannet ${graduationBadgeYear(athlete.expected_graduation)}`}
            >
              🎓
            </span>
          )}
        </p>
        <p className="text-xs text-muted truncate">
          {athlete.university}
          {athlete.position && ` · ${athlete.position}`}
          {athlete.class_year && ` · ${athlete.class_year}`}
        </p>
      </div>
    </Link>
  );
}

function CardGrid({ athletes, faded }: { athletes: Athlete[]; faded?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {athletes.map((a) => (
        <AthleteCard key={a.id} athlete={a} faded={faded} />
      ))}
    </div>
  );
}

function AthleteGrid({
  athletes,
  sort,
  faded = false,
}: {
  athletes: Athlete[];
  sort: SortMode;
  faded?: boolean;
}) {
  // Flad liste sorteret efter navn
  if (sort === "name") {
    const sorted = [...athletes].sort((a, b) => a.name.localeCompare(b.name, "da"));
    return <CardGrid athletes={sorted} faded={faded} />;
  }

  // Grupperet efter sport eller skole
  const groups =
    sort === "school"
      ? groupBy(athletes, (a) => a.university?.trim() || "Ukendt skole")
      : groupBy(athletes, (a) => a.sport);

  return (
    <div className="space-y-10">
      {groups.map(([groupKey, group]) => (
        <section key={groupKey}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: sort === "school" ? "#00205B" : getSportColor(groupKey) }}
            />
            <h3 className="text-lg font-bold text-ink capitalize">{groupKey}</h3>
            <span className="text-xs text-muted">({group.length})</span>
          </div>
          <CardGrid athletes={group} faded={faded} />
        </section>
      ))}
    </div>
  );
}

export default async function AtleterPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort = parseSort(rawSort);

  const [active, alumni] = await Promise.all([
    getAllAthletes(),
    getAlumniAthletes(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <h1
        className="text-3xl font-bold text-ink mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Danske atleter i USA
      </h1>
      <p className="text-muted text-sm mb-8">
        {active.length} aktive{alumni.length > 0 ? ` · ${alumni.length} alumni` : ""}
      </p>

      {active.length === 0 && alumni.length === 0 ? (
        <p className="text-muted py-20 text-center">
          Ingen atleter registreret endnu.
        </p>
      ) : (
        <>
          <SortTabs sort={sort} />

          {/* Aktive atleter */}
          <h2
            className="text-xl font-bold text-ink mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Aktive atleter
          </h2>
          {active.length > 0 ? (
            <AthleteGrid athletes={active} sort={sort} />
          ) : (
            <p className="text-muted text-sm mb-10">Ingen aktive atleter.</p>
          )}

          {/* Alumni — sammenklappet */}
          {alumni.length > 0 && (
            <div className="mt-14 pt-10 border-t border-border">
              <AlumniToggle count={alumni.length}>
                <AthleteGrid athletes={alumni} sort={sort} faded />
              </AlumniToggle>
            </div>
          )}
        </>
      )}
    </main>
  );
}
