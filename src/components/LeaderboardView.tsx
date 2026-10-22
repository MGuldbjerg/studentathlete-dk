import type { Leaderboard, BoardTable } from "@/lib/leaderboard";
import { sportLabel, routePath } from "@/lib/i18n";
import { getAthleteUrl, formatDate } from "@/lib/seo";

/** The leaderboard slug under the stats page, per language: /statistics/leaderboard, /statistik/topscorere. */
export const LEADERBOARD_SLUG: Record<string, string> = { en: "leaderboard", da: "topscorere" };

const L = {
  en: {
    goals: "Goals", assists: "Assists", shutouts: "Clean sheets", player: "Player", school: "School",
    div: "Div.", games: "Games", movement: "Since last week", new: "new", asOf: "Numbers as of",
    weekAgo: "movement against", men: "Men's", women: "Women's",
  },
  da: {
    goals: "Mål", assists: "Assists", shutouts: "Clean sheets", player: "Spiller", school: "Skole",
    div: "Div.", games: "Kampe", movement: "Siden sidste uge", new: "ny", asOf: "Tal pr.",
    weekAgo: "bevægelse målt mod", men: "Herrer,", women: "Damer,",
  },
} as const;

function heading(t: BoardTable, lang: "en" | "da"): string {
  const l = L[lang];
  const sport = sportLabel(t.sport, lang);
  const who = t.gender === "m" ? `${l.men} ` : t.gender === "f" ? `${l.women} ` : "";
  return `${who}${lang === "en" && who ? sport.toLowerCase() : sport} — ${l[t.stat]}`;
}

function movement(rank: number, prev: number | null, lang: "en" | "da"): string {
  if (prev === null) return L[lang].new;
  if (prev === rank) return "–";
  return prev > rank ? `↑${prev - rank}` : `↓${rank - prev}`;
}

export function LeaderboardView({ board, lang: rawLang }: { board: Leaderboard; lang: string }) {
  const lang = rawLang === "da" ? "da" : "en";
  const l = L[lang];
  return (
    <div className="mt-6">
      <p className="text-xs text-muted mb-8">
        {l.asOf} {formatDate(board.asOf, lang, { day: "numeric", month: "long", year: "numeric" })}
        {board.weekAgo ? ` · ${l.weekAgo} ${formatDate(board.weekAgo, lang, { day: "numeric", month: "long" })}` : ""}
      </p>
      {board.tables.map((t) => (
        <section key={`${t.sport}-${t.gender}-${t.stat}`} className="mb-10">
          <h2 className="text-xl font-bold text-ink mb-3" style={{ fontFamily: "var(--font-serif)" }}>{heading(t, lang)}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E0DC" }}>
                  <th className="text-left text-xs text-muted font-semibold py-2 pr-3">#</th>
                  <th className="text-left text-xs text-muted font-semibold py-2 pr-3">{l.player}</th>
                  <th className="text-left text-xs text-muted font-semibold py-2 pr-3">{l.school}</th>
                  <th className="text-left text-xs text-muted font-semibold py-2 pr-3">{l.div}</th>
                  <th className="text-right text-xs text-muted font-semibold py-2 pr-3">{l[t.stat]}</th>
                  <th className="text-right text-xs text-muted font-semibold py-2 pr-3">{l.games}</th>
                  {board.weekAgo && <th className="text-right text-xs text-muted font-semibold py-2">{l.movement}</th>}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r) => (
                  <tr key={r.slug} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td className="py-2 pr-3 text-muted whitespace-nowrap">{r.tied ? `=${r.rank}` : r.rank}</td>
                    <td className="py-2 pr-3 font-semibold">
                      <a href={getAthleteUrl(r.slug, lang)} className="text-ink hover:underline">{r.name}</a>
                    </td>
                    <td className="py-2 pr-3 text-muted">{r.school}</td>
                    <td className="py-2 pr-3 text-muted">{r.division ?? "—"}</td>
                    <td className="py-2 pr-3 text-right font-bold text-ink">{r.value}</td>
                    <td className="py-2 pr-3 text-right text-muted">{r.games}</td>
                    {board.weekAgo && <td className="py-2 text-right text-muted whitespace-nowrap">{movement(r.rank, r.prevRank, lang)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="text-xs text-muted mt-4">
        <a href={routePath("stats", lang)} className="hover:underline">← {lang === "da" ? "Statistik" : "Statistics"}</a>
      </p>
    </div>
  );
}
