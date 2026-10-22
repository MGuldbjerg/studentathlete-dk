import { getAthleteUrl } from "@/lib/seo";
import { weekSections, type LeaderboardWeek, type Part } from "@/lib/leaderboard-week";

function Sentence({ parts, lang }: { parts: Part[]; lang: string }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? p : (
          <a key={i} href={getAthleteUrl(p.slug, lang)} className="font-semibold text-ink hover:underline">{p.name}</a>
        ),
      )}
    </>
  );
}

/** The weekly update's sections (src/lib/leaderboard-week.ts), one paragraph per line. */
export function LeaderboardWeekView({ week, lang }: { week: LeaderboardWeek; lang: string }) {
  return (
    <div>
      {weekSections(week, lang).map((s) => (
        <section key={s.heading} className="mb-8">
          <h2 className="text-xl font-bold text-ink mb-3" style={{ fontFamily: "var(--font-serif)" }}>{s.heading}</h2>
          {s.lines.map((line, i) => (
            <p key={i} className="text-base text-ink/90 mb-2 leading-relaxed"><Sentence parts={line} lang={lang} /></p>
          ))}
        </section>
      ))}
    </div>
  );
}
