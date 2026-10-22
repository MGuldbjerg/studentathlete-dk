import type { Leaderboard, BoardTable } from "@/lib/leaderboard";
import { sportLabel, routePath, t } from "@/lib/i18n";
import { getAthleteUrl, formatDate } from "@/lib/seo";

/** The leaderboard slug under the stats page, per language: /statistics/leaderboard, /statistik/topscorere. */
export const LEADERBOARD_SLUG: Record<string, string> = { en: "leaderboard", da: "topscorere" };

function heading(tb: BoardTable, lang: string): string {
  const sport = sportLabel(tb.sport, lang);
  const stat = t(`board.${tb.stat}` as const, lang);
  const key = tb.gender === "m" ? "board.heading_m" : tb.gender === "f" ? "board.heading_f" : "board.heading";
  return t(key, lang, { sport: tb.gender ? sport.toLowerCase() : sport, stat });
}

function movement(rank: number, prev: number | null, lang: string): string {
  if (prev === null) return t("board.new", lang);
  if (prev === rank) return "–";
  return prev > rank ? `↑${prev - rank}` : `↓${rank - prev}`;
}

function BoardTableView({ tb, weekAgo, lang }: { tb: BoardTable; weekAgo: string | null; lang: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: "1px solid #E2E0DC" }}>
            <th className="text-left text-xs text-muted font-semibold py-2 pr-3">#</th>
            <th className="text-left text-xs text-muted font-semibold py-2 pr-3">{t("board.player", lang)}</th>
            <th className="text-left text-xs text-muted font-semibold py-2 pr-3">{t("board.school", lang)}</th>
            {tb.division === null && <th className="text-left text-xs text-muted font-semibold py-2 pr-3">{t("board.div", lang)}</th>}
            <th className="text-right text-xs text-muted font-semibold py-2 pr-3">{t(`board.${tb.stat}` as const, lang)}</th>
            <th className="text-right text-xs text-muted font-semibold py-2 pr-3">{t("board.games", lang)}</th>
            {weekAgo && <th className="text-right text-xs text-muted font-semibold py-2">{t("board.movement", lang)}</th>}
          </tr>
        </thead>
        <tbody>
          {tb.rows.map((r) => (
            <tr key={r.slug} style={{ borderBottom: "1px solid #F0EEEA" }}>
              <td className="py-2 pr-3 text-muted whitespace-nowrap">{r.tied ? `=${r.rank}` : r.rank}</td>
              <td className="py-2 pr-3 font-semibold">
                <a href={getAthleteUrl(r.slug, lang)} className="text-ink hover:underline">{r.name}</a>
              </td>
              <td className="py-2 pr-3 text-muted">{r.school}</td>
              {tb.division === null && <td className="py-2 pr-3 text-muted">{r.division ?? "—"}</td>}
              <td className="py-2 pr-3 text-right font-bold text-ink">{r.value}</td>
              <td className="py-2 pr-3 text-right text-muted">{r.games}</td>
              {weekAgo && <td className="py-2 text-right text-muted whitespace-nowrap">{movement(r.rank, r.prevRank, lang)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeaderboardView({ board, lang }: { board: Leaderboard; lang: string }) {
  // National table first; its divisions folded underneath (Mikkel 2026-10-22: show both).
  const national = board.tables.filter((tb) => tb.division === null);
  const divisionsOf = (n: BoardTable) =>
    board.tables.filter((tb) => tb.division !== null && tb.sport === n.sport && tb.gender === n.gender && tb.stat === n.stat);
  return (
    <div className="mt-6">
      <p className="text-xs text-muted mb-8">
        {t("board.as_of", lang, { date: formatDate(board.asOf, lang, { day: "numeric", month: "long", year: "numeric" }) })}
        {board.weekAgo ? ` · ${t("board.week_ago", lang, { date: formatDate(board.weekAgo, lang, { day: "numeric", month: "long" }) })}` : ""}
      </p>
      {national.map((tb) => {
        const divs = divisionsOf(tb);
        return (
          <section key={`${tb.sport}-${tb.gender}-${tb.stat}`} className="mb-10">
            <h2 className="text-xl font-bold text-ink mb-3" style={{ fontFamily: "var(--font-serif)" }}>{heading(tb, lang)}</h2>
            <BoardTableView tb={tb} weekAgo={board.weekAgo} lang={lang} />
            {divs.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm font-semibold cursor-pointer" style={{ color: "#BF0A30" }}>{t("board.by_division", lang)}</summary>
                {divs.map((d) => (
                  <div key={d.division} className="mt-4">
                    <h3 className="text-sm font-bold text-ink mb-1">{d.division}</h3>
                    <BoardTableView tb={d} weekAgo={board.weekAgo} lang={lang} />
                  </div>
                ))}
              </details>
            )}
          </section>
        );
      })}
      <p className="text-xs text-muted mt-4">
        <a href={routePath("stats", lang)} className="hover:underline">← {t("stats.crumb", lang)}</a>
      </p>
    </div>
  );
}
