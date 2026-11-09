import type { SeasonHonours } from "@/lib/season-honours";
import { sportLabel, sportSlug, routePath, t } from "@/lib/i18n";
import { ExternalArrow } from "@/components/ui/ExternalArrow";
import { getAthleteUrl } from "@/lib/seo";
import { AWARDS_SLUG } from "@/components/AwardsView";
import type { Nation } from "@/lib/home-nation";

/** The season's first calendar year: "2026-27" → "2026". */
export const seasonYear = (season: string) => season.slice(0, 4);

/** /statistics/awards/football-2026 — the slug under the awards page, in the site language. */
export function seasonHonoursSlug(sport: string, season: string, lang: string): string {
  return `${sportSlug(sport, lang)}-${seasonYear(season)}`;
}

export function seasonHonoursPath(sport: string, season: string, lang: string): string {
  return `${routePath("stats", lang)}/${AWARDS_SLUG[lang] ?? AWARDS_SLUG.en}/${seasonHonoursSlug(sport, season, lang)}`;
}

function groupTitle(gender: "f" | "m" | "x", sport: string, lang: string): string {
  const s = sportLabel(sport, lang).toLowerCase();
  if (gender === "x") return sportLabel(sport, lang);
  return t(gender === "m" ? "awards.sport_m" : "awards.sport_f", lang, { sport: s });
}

export function SeasonHonoursView({ honours, lang }: { honours: SeasonHonours; lang: string }) {
  return (
    <div className="mt-6">
      {honours.groups.map((g) => (
        <section key={g.gender} className="mb-12">
          <h2 className="text-2xl font-bold text-ink mb-1" style={{ fontFamily: "var(--font-serif)" }}>
            {groupTitle(g.gender, honours.sport, lang)}
          </h2>
          <p className="text-xs text-muted mb-5">{t("honours.players", lang, { n: String(g.athletes) })}</p>
          {g.divisions.map((d) => (
            <div key={d.division} className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted mb-3">{d.division}</h3>
              {d.conferences.map((c) => (
                <div key={c.conference} className="mb-6">
                  <h4 className="text-base font-semibold text-ink mb-2 pb-1" style={{ borderBottom: "1px solid #E2E0DC" }}>{c.conference}</h4>
                  <ul className="space-y-3">
                    {c.athletes.map((a) => (
                      <li key={`${a.name}-${a.school}`} className="text-sm">
                        <div>
                          {a.slug
                            ? <a href={getAthleteUrl(a.slug, lang)} className="font-semibold text-ink hover:underline">{a.name}</a>
                            : <span className="font-semibold text-ink">{a.name}</span>}
                          <span className="text-muted">
                            {" · "}{a.school}
                            {a.nation ? <>{" · "}{t(`stats.nation.${a.nation as Nation}` as const, lang)}</> : null}
                          </span>
                        </div>
                        <ul className="mt-0.5 ml-4 list-disc marker:text-muted">
                          {a.honours.map((h, i) => (
                            <li key={i}>
                              {h.text}
                              {h.source ? (
                                <>
                                  {" "}
                                  <a href={h.source} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: "#BF0A30" }} aria-label={t("profile.source", lang)}>
                                    <ExternalArrow />
                                  </a>
                                </>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
