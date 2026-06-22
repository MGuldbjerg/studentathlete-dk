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

function groupBySport(athletes: Athlete[]) {
  const map = new Map<string, Athlete[]>();
  for (const a of athletes) {
    if (!map.has(a.sport)) map.set(a.sport, []);
    map.get(a.sport)!.push(a);
  }
  return map;
}

function AthleteGrid({ athletes, faded = false }: { athletes: Athlete[]; faded?: boolean }) {
  const bySport = groupBySport(athletes);

  return (
    <div className="space-y-10">
      {[...bySport.entries()].map(([sport, group]) => (
        <section key={sport}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: getSportColor(sport) }}
            />
            <h3 className="text-lg font-bold text-ink capitalize">{sport}</h3>
            <span className="text-xs text-muted">({group.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.map((athlete) => (
              <Link
                key={athlete.id}
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
                    className="text-sm font-bold text-ink leading-snug
                               group-hover:underline truncate"
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
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function AtleterPage() {
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
          {/* Aktive atleter */}
          <h2
            className="text-xl font-bold text-ink mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Aktive atleter
          </h2>
          {active.length > 0 ? (
            <AthleteGrid athletes={active} />
          ) : (
            <p className="text-muted text-sm mb-10">Ingen aktive atleter.</p>
          )}

          {/* Alumni — sammenklappet */}
          {alumni.length > 0 && (
            <div className="mt-14 pt-10 border-t border-border">
              <AlumniToggle count={alumni.length}>
                <AthleteGrid athletes={alumni} faded />
              </AlumniToggle>
            </div>
          )}
        </>
      )}
    </main>
  );
}
