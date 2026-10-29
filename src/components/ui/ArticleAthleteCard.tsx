import type { Athlete } from "@/lib/types";
import type { SeasonStatsRow } from "@/lib/db";
import { getAthleteUrl } from "@/lib/seo";
import { cleanPosition } from "@/lib/roster-clean";
import { seasonHeadline } from "@/lib/athlete-hub";
import { sportLabel, sportSlug, t, routePath } from "@/lib/i18n";

/**
 * The athlete right after the article: name, sport, position, school and one
 * number from this season, with a clear way on to the profile. A reader who
 * came for one story finds the person behind it instead of a dead end.
 *
 * `seasonStats` is the profile's own row (getSeasonStats, a primary-key
 * lookup); the number is the profile's «Season so far» table cut to one cell
 * (`seasonHeadline`). Language is passed in, never defaulted.
 */
export function ArticleAthleteCard({ athlete, seasonStats, lang }: {
  athlete: Athlete;
  seasonStats: SeasonStatsRow | null;
  lang: string;
}) {
  const profile = getAthleteUrl(athlete.slug, lang);
  const stat = seasonStats ? seasonHeadline(seasonStats.kind, seasonStats.cells, lang) : null;
  const rows: Array<{ label: string; value: string | null | undefined; href?: string }> = [
    { label: t("fact.sport", lang), value: sportLabel(athlete.sport, lang), href: `/${sportSlug(athlete.sport, lang)}` },
    { label: t("fact.position", lang), value: cleanPosition(athlete.position) },
    {
      label: t("fact.university", lang),
      value: athlete.university,
      href: athlete.school_slug ? `${routePath("schools", lang)}/${athlete.school_slug}` : undefined,
    },
    { label: stat ? t("tpl.season_stat", lang, { stat: stat.label }) : "", value: stat?.value },
  ];

  return (
    <aside className="mt-10 mb-8 flex border border-border">
      <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: "#BF0A30" }} />
      <div className="flex-1 p-5">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mb-2">
          {t("tpl.about_athlete", lang)}
        </p>
        <a href={profile} className="text-xl font-black text-ink hover:underline decoration-flag-red"
          style={{ fontFamily: "var(--font-serif)" }}>
          {athlete.name}
        </a>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
          {rows.filter((r) => r.value).map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] text-muted uppercase tracking-[0.12em]">{row.label}</dt>
              <dd className="text-sm font-semibold text-ink mt-0.5">
                {row.href ? (
                  <a href={row.href} className="hover:underline" style={{ color: "#BF0A30" }}>{row.value}</a>
                ) : row.value}
              </dd>
            </div>
          ))}
        </dl>
        <a href={profile}
          className="inline-block mt-5 px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#BF0A30" }}>
          {t("tpl.see_profile", lang)}
        </a>
      </div>
    </aside>
  );
}
