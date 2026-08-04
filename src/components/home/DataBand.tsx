import type { SiteCounts } from "@/lib/db";

/**
 * BÅND C — datastribe.
 *
 * Det ene bånd på forsiden helt uden artikler. Formålet er rytme: efter et
 * billedtungt lead-bånd giver en stribe rene tal øjet et hvil, før kortrækken
 * begynder. Tallene er dem vi FAKTISK har (aktive atleter, universiteter,
 * sportsgrene, ugens artikler) — ingen rekorder eller ranglister, som basen
 * ikke fører.
 */
export function DataBand({ counts }: { counts: SiteCounts }) {
  const cells: { value: number; suffix?: string; label: string }[] = [
    { value: counts.athletes, label: "Danskere fulgt" },
    { value: counts.universities, label: "Universiteter" },
    { value: counts.sports, label: "Sportsgrene" },
    { value: counts.newThisWeek, suffix: "nye", label: "Denne uge" },
  ];

  return (
    <section
      aria-label="Sitet i tal"
      className="grid grid-cols-2 md:grid-cols-4 text-white"
      style={{ backgroundColor: "#00205B" }}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          className="px-4 md:px-8 py-5 border-b border-white/15 md:border-b-0 border-r border-r-white/15 last:border-r-0 even:border-r-0 md:even:border-r md:last:border-r-0"
        >
          <b
            className="block text-3xl md:text-4xl font-bold leading-none tabular-nums"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {c.value}
            {c.suffix && (
              <i className="not-italic text-[0.5em] ml-1" style={{ color: "#FF7A96" }}>
                {c.suffix}
              </i>
            )}
          </b>
          <span className="block mt-1.5 text-[11px] uppercase tracking-widest text-white/60">
            {c.label}
          </span>
        </div>
      ))}
    </section>
  );
}
