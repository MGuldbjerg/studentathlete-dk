import type { Metadata } from "next";
import Link from "next/link";
import { getAllAthletes } from "@/lib/db";
import { getSportColor } from "@/lib/types";
import { getAthleteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alle atleter | StudentAthlete.dk",
  description:
    "Oversigt over danske student athletes på amerikanske universiteter. Find din favorit og følg deres karriere.",
};

export default async function AtleterPage() {
  const athletes = await getAllAthletes();

  // Gruppér efter sport
  const bySport = new Map<string, typeof athletes>();
  for (const a of athletes) {
    const sport = a.sport;
    if (!bySport.has(sport)) bySport.set(sport, []);
    bySport.get(sport)!.push(a);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <h1
        className="text-3xl font-bold text-ink mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Alle atleter
      </h1>
      <p className="text-muted text-sm mb-8">
        {athletes.length} aktive danske student athletes i USA
      </p>

      {athletes.length === 0 ? (
        <p className="text-muted py-20 text-center">
          Ingen atleter registreret endnu.
        </p>
      ) : (
        <div className="space-y-10">
          {[...bySport.entries()].map(([sport, group]) => (
            <section key={sport}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: getSportColor(sport) }}
                />
                <h2 className="text-lg font-bold text-ink capitalize">
                  {sport}
                </h2>
                <span className="text-xs text-muted">({group.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.map((athlete) => (
                  <Link
                    key={athlete.id}
                    href={getAthleteUrl(athlete.slug)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border
                               bg-paper hover:bg-surface transition-colors group"
                  >
                    {/* Initialer */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center
                                 text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: getSportColor(athlete.sport) }}
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
                      </p>
                      <p className="text-xs text-muted truncate">
                        {athlete.university}
                        {athlete.position && ` · ${athlete.position}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
