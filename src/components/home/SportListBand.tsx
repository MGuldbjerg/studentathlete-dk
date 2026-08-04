import type { SportGroup } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";
import { getSportColor } from "@/lib/types";
import { sportLabel, sportSlug } from "@/lib/i18n";

/**
 * BÅND E — efter sport, ren tekst.
 *
 * Det andet billedfri bånd. Sportsfarven bærer genkendelsen (prik + mærke i
 * hver række) i stedet for et kampkort, så de genererede kort aldrig står
 * flere rækker i træk. To spalter på desktop, én på mobil.
 */
export function SportListBand({ groups }: { groups: SportGroup[] }) {
  if (groups.length === 0) return null;

  // Fordel sportsgrenene skiftevis, så spalterne bliver nogenlunde lige lange.
  const columns: SportGroup[][] = [[], []];
  groups.forEach((g, i) => columns[i % 2].push(g));

  return (
    <section className="border-b border-border">
      <div className="flex items-center gap-3 px-4 md:px-8 py-5">
        <span className="w-1 h-6 rounded-full" style={{ backgroundColor: "#BF0A30" }} />
        <h2 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
          Efter sport
        </h2>
        <a href="/atleter" className="ml-auto text-sm text-muted hover:text-ink transition-colors">
          Alle atleter →
        </a>
      </div>

      <div className="grid md:grid-cols-2">
        {columns.map((col, i) => (
          <div key={i} className={i === 0 ? "md:border-r border-border" : ""}>
            {col.map((g) => (
              <div key={g.sport}>
                <a
                  href={`/${sportSlug(g.sport)}`}
                  className="group flex items-center gap-2.5 px-4 md:px-8 pt-4 pb-2 border-t border-border"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getSportColor(g.sport) }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink group-hover:underline">
                    {sportLabel(g.sport)}
                  </span>
                  <span className="ml-auto text-[11px] text-muted tabular-nums">
                    {g.athleteCount} atleter
                  </span>
                </a>
                {g.articles.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="compact" />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
