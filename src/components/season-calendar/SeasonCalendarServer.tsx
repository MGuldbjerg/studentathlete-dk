import { languagePack, routePath, t } from "@/lib/i18n";
import { getGuideUrl } from "@/lib/seo";
import { DIVISIONS, DIVISION_LABEL, SEASON, calendarIdsForSport, faq, keyDates, localizeCalendar, type SeasonKey } from "@/lib/season-calendar";
import { SeasonCalendar, type CalendarStrings } from "./SeasonCalendar";

/**
 * «Key dates»: the national-championship finals per sport and division as
 * plain server-rendered tables, from the same data as the interactive calendar.
 */
export function KeyDatesTables({ lang }: { lang: string }) {
  const data = keyDates(lang);
  const heads: Record<SeasonKey, string> = {
    fall: t("cal.season_head.fall", lang), winter: t("cal.season_head.winter", lang), spring: t("cal.season_head.spring", lang),
  };
  return (
    <section className="mt-12 pt-8 border-t-2 border-flag-blue">
      <h2 className="text-2xl font-bold text-ink mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        {t("cal.key_dates_heading", lang, { season: SEASON.label })}
      </h2>
      <p className="text-sm text-muted mb-6 max-w-3xl">{t("cal.key_dates_intro", lang)}</p>
      {(["fall", "winter", "spring"] as SeasonKey[]).map((k) => (
        <div key={k} className="mb-8">
          <h3 className="text-lg font-bold text-ink mb-2" style={{ fontFamily: "var(--font-serif)" }}>{heads[k]}</h3>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[720px] text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">{t("cal.col_sport", lang)}</th>
                  {DIVISIONS.map((d) => <th key={d} scope="col" className="py-2 px-3 font-semibold">{DIVISION_LABEL[d]}</th>)}
                </tr>
              </thead>
              <tbody>
                {data[k].map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">
                      {r.name}{r.sub && <span className="text-xs text-muted font-normal"> {r.sub}</span>}
                      <br />
                      <a href={r.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline font-normal" title={r.source.label}>
                        {t("cal.source_link", lang)}
                      </a>
                    </th>
                    {DIVISIONS.map((d) => {
                      const c = r.cells[d];
                      return (
                        <td key={d} className="py-2 px-3 tabular-nums">
                          {c.none ? <span className="text-muted">–</span> : (
                            <>
                              <span className="text-ink whitespace-nowrap">{c.est ? "≈ " : ""}{c.when}</span>
                              {c.venue && <><br /><span className="text-xs text-muted">{c.venue}</span></>}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Short FAQ with links to the existing guides. Plain HTML; no FAQPage markup. */
export function SeasonCalendarFaq({ lang }: { lang: string }) {
  return (
    <section className="mt-12 pt-8 border-t border-border max-w-3xl">
      <h2 className="text-2xl font-bold text-ink mb-6" style={{ fontFamily: "var(--font-serif)" }}>{t("cal.faq_heading", lang)}</h2>
      <div className="grid gap-6">
        {faq(lang).map((f) => (
          <div key={f.q}>
            <h3 className="text-lg font-bold text-ink mb-1" style={{ fontFamily: "var(--font-serif)" }}>{f.q}</h3>
            <p className="text-ink/85 leading-relaxed">{f.a}</p>
            <p className="text-sm mt-1">
              <a href={getGuideUrl(f.link.guide, lang)} className="font-semibold hover:underline text-flag-red">
                {t("cal.read_more", lang, { guide: f.link.label })}
              </a>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Month names August → July in the site's language, without trailing dots. */
function monthNames(lang: string): string[] {
  const f = new Intl.DateTimeFormat(languagePack(lang).locale, { month: "short", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => f.format(new Date(Date.UTC(2026, (7 + i) % 12, 15))).replace(/\.$/, ""));
}

export function calendarStrings(lang: string): CalendarStrings {
  return {
    division: t("cal.division", lang),
    season: t("cal.season", lang),
    allSports: t("cal.all_sports", lang),
    seasonName: { fall: t("cal.season.fall", lang), winter: t("cal.season.winter", lang), spring: t("cal.season.spring", lang) },
    seasonHead: { fall: t("cal.season_head.fall", lang), winter: t("cal.season_head.winter", lang), spring: t("cal.season_head.spring", lang) },
    mainSeason: { fall: t("cal.main_season.fall", lang), winter: t("cal.main_season.winter", lang), spring: t("cal.main_season.spring", lang) },
    semester: { fall: t("cal.semester.fall", lang), spring: t("cal.semester.spring", lang), summer: t("cal.semester.summer", lang) },
    months: monthNames(lang),
    today: t("cal.today", lang),
    now: t("cal.now", lang),
    nowNothing: t("cal.now_nothing", lang),
    phase: { off: t("cal.phase.off", lang), ind: t("cal.phase.ind", lang), reg: t("cal.phase.reg", lang), conf: t("cal.phase.conf", lang), ncaa: t("cal.phase.ncaa", lang) },
    legendEst: t("cal.legend_est", lang),
    legendAa: t("cal.legend_aa", lang),
    estimate: t("cal.estimate", lang),
    pickTitle: t("cal.pick_title", lang),
    pickHint: t("cal.pick_hint", lang),
    allDivisions: t("cal.all_divisions", lang),
    stepByStep: t("cal.step_by_step", lang),
    howYearWorks: t("cal.how_year_works", lang),
    aaNamed: t("cal.aa_named", lang),
    aaNone: t("cal.aa_none", lang),
    aaAround: t("cal.aa_around", lang),
    aaLastYear: t("cal.aa_last_year", lang),
    and: t("cal.and", lang),
    sources: t("cal.sources", lang),
    showAll: t("cal.show_all", lang),
    statusNow: t("cal.status_now", lang),
    statusNext: t("cal.status_next", lang),
    statusOver: t("cal.status_over", lang),
    seeFull: t("cal.see_full", lang),
  };
}

/** The whole calendar (the calendar page). */
export function FullSeasonCalendar({ lang }: { lang: string }) {
  return (
    <SeasonCalendar
      data={localizeCalendar(lang)}
      strings={calendarStrings(lang)}
      divisionLabels={DIVISION_LABEL}
      locale={languagePack(lang).locale}
      startYear={SEASON.startYear}
      mode="full"
      fullHref={routePath("calendar", lang)}
    />
  );
}

/**
 * One sport's rows on its pillar page, with a link to the full calendar.
 * Renders nothing for a sport the calendar does not cover. Only that sport's
 * rows are sent to the browser.
 */
export function SportSeasonCalendar({ sport, lang }: { sport: string; lang: string }) {
  const ids = calendarIdsForSport(sport);
  if (ids.length === 0) return null;
  const data = localizeCalendar(lang).filter((x) => ids.includes(x.id));
  return (
    <section className="px-4 md:px-8 py-10 border-t border-border">
      <h2 className="text-xl font-bold text-ink mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        {t("cal.sport_heading", lang, { season: SEASON.label })}
      </h2>
      <p className="text-sm text-muted mb-5 max-w-2xl">{t("cal.sport_intro", lang)}</p>
      <SeasonCalendar
        data={data}
        strings={calendarStrings(lang)}
        divisionLabels={DIVISION_LABEL}
        locale={languagePack(lang).locale}
        startYear={SEASON.startYear}
        mode="sport"
        ids={ids}
        fullHref={routePath("calendar", lang)}
      />
    </section>
  );
}
