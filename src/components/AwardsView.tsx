import type { AwardTally } from "@/lib/award-tally";
import { awardLabel } from "@/lib/athlete-events";
import { sportLabel, routePath, t } from "@/lib/i18n";
import { getAthleteUrl, formatDate } from "@/lib/seo";

/** The awards page's slug under the stats page, per language: /statistics/awards, /statistik/priser. */
export const AWARDS_SLUG: Record<string, string> = { en: "awards", da: "priser" };

function sportName(sport: string, gender: string | null, lang: string): string {
  const s = sportLabel(sport, lang);
  const key = gender === "m" ? "awards.sport_m" : gender === "f" ? "awards.sport_f" : null;
  return key ? t(key, lang, { sport: s.toLowerCase() }) : s;
}

function monthName(month: string, lang: string): string {
  const name = formatDate(`${month}-15`, lang, { month: "long", year: "numeric" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function AwardsView({ tally, lang }: { tally: AwardTally; lang: string }) {
  const th = "text-left text-xs text-muted font-semibold py-2 pr-3";
  return (
    <div className="mt-6">
      <p className="text-lg font-semibold text-ink mb-1">
        {t("awards.total", lang, { n: String(tally.total), m: String(tally.athletes) })}
      </p>
      <p className="text-xs text-muted mb-8">
        {t("board.as_of", lang, { date: formatDate(tally.asOf, lang, { day: "numeric", month: "long", year: "numeric" }) })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
        <section>
          <h2 className="text-sm font-bold text-ink mb-2">{t("awards.by_conference", lang)}</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {tally.byConference.slice(0, 12).map((c) => (
                <tr key={c.conference} style={{ borderBottom: "1px solid #F0EEEA" }}>
                  <td className="py-1.5 pr-3">{c.conference}</td>
                  <td className="py-1.5 text-right font-bold">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h2 className="text-sm font-bold text-ink mb-2">{t("awards.by_sport", lang)}</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {tally.bySport.map((s) => (
                <tr key={`${s.sport}-${s.gender}`} style={{ borderBottom: "1px solid #F0EEEA" }}>
                  <td className="py-1.5 pr-3">{sportName(s.sport, s.gender, lang)}</td>
                  <td className="py-1.5 text-right font-bold">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {tally.months.map((m) => (
        <section key={m.month} className="mb-10">
          <h2 className="text-xl font-bold text-ink mb-3" style={{ fontFamily: "var(--font-serif)" }}>
            {monthName(m.month, lang)} · {m.count}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E0DC" }}>
                  <th className={th}>{t("awards.col_date", lang)}</th>
                  <th className={th}>{t("board.player", lang)}</th>
                  <th className={th}>{t("awards.col_award", lang)}</th>
                  <th className={th}>{t("awards.col_conference", lang)}</th>
                  <th className="text-right text-xs text-muted font-semibold py-2">{t("profile.source", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {m.rows.map((r, i) => (
                  <tr key={`${r.date}-${r.name}-${i}`} style={{ borderBottom: "1px solid #F0EEEA" }}>
                    <td className="py-2 pr-3 text-muted whitespace-nowrap">{formatDate(r.date, lang, { day: "numeric", month: "short" })}</td>
                    <td className="py-2 pr-3">
                      {r.slug
                        ? <a href={getAthleteUrl(r.slug, lang)} className="font-semibold text-ink hover:underline">{r.name}</a>
                        : <span className="font-semibold text-ink">{r.name}</span>}
                      <span className="text-muted"> · {r.school} · {sportName(r.sport, r.gender, lang)}</span>
                    </td>
                    <td className="py-2 pr-3">{awardLabel(r.award, lang)}</td>
                    <td className="py-2 pr-3 text-muted">{r.conference ?? "—"}</td>
                    <td className="py-2 text-right">
                      {r.source ? <a href={r.source} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: "#BF0A30" }}>↗</a> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="text-xs text-muted mt-4">
        <a href={routePath("stats", lang)} className="hover:underline">← {t("stats.crumb", lang)}</a>
      </p>
    </div>
  );
}
