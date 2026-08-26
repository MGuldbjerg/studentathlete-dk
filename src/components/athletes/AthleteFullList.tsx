/**
 * Den fulde atletliste — aktive og alumni, sorterbar efter sport, navn eller
 * skole. Bor på `/athletes/all` · `/atleter/alle`.
 *
 * Lå indtil 2026-08-26 direkte på `/athletes`. Den side er nu et niveau
 * OVER de målrettede sider: den præsenterer akserne (forbogstav, hele listen)
 * i stedet for selv at være 2.343 links. Det er også det Google helst vil
 * have — et knudepunkt der peger videre, ikke ét dump.
 */
import Link from "next/link";
import type { Athlete } from "@/lib/types";
import { getSportColor } from "@/lib/types";
import { t, languagePack } from "@/lib/i18n";
import { CardGrid } from "./AthleteCardGrid";
import { AlumniToggle } from "./AlumniToggle";
import { athletesAllPath } from "@/lib/athlete-letters";

export type SortMode = "sport" | "name" | "school";

const SORT_OPTIONS: {
  key: SortMode;
  labelKey: "athletes.sort_sport" | "athletes.sort_name" | "athletes.sort_school";
}[] = [
  { key: "sport", labelKey: "athletes.sort_sport" },
  { key: "name", labelKey: "athletes.sort_name" },
  { key: "school", labelKey: "athletes.sort_school" },
];

export function parseSort(v: string | undefined): SortMode {
  return v === "name" || v === "school" ? v : "sport";
}

/**
 * Grupper atleter efter nøgle; grupperne sorteres med SITETS kollation.
 * Stod som `localeCompare(..., "da")` — en dansk sortering af britiske
 * skolenavne. Se regel 6 i ARKITEKTUR-motor.md.
 */
function groupBy(athletes: Athlete[], key: (a: Athlete) => string, lang: string) {
  const locale = languagePack(lang).locale;
  const map = new Map<string, Athlete[]>();
  for (const a of athletes) {
    const k = key(a);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(a);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], locale));
}

function SortTabs({ sort, lang }: { sort: SortMode; lang: string }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      <span className="text-xs text-muted mr-1">{t("athletes.sort_label", lang)}</span>
      {SORT_OPTIONS.map((o) => {
        const active = o.key === sort;
        return (
          <Link
            key={o.key}
            href={`${athletesAllPath(lang)}?sort=${o.key}`}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              active
                ? "text-white border-transparent"
                : "text-ink border-border bg-paper hover:bg-surface"
            }`}
            style={active ? { backgroundColor: "#00205B" } : undefined}
          >
            {t(o.labelKey, lang)}
          </Link>
        );
      })}
    </div>
  );
}

function AthleteGrid({
  athletes,
  sort,
  faded = false,
  lang,
}: {
  athletes: Athlete[];
  sort: SortMode;
  faded?: boolean;
  lang: string;
}) {
  if (sort === "name") {
    const locale = languagePack(lang).locale;
    const sorted = [...athletes].sort((a, b) => a.name.localeCompare(b.name, locale));
    return <CardGrid athletes={sorted} faded={faded} lang={lang} />;
  }

  const groups =
    sort === "school"
      ? groupBy(athletes, (a) => a.university?.trim() || t("athletes.unknown_school", lang), lang)
      : groupBy(athletes, (a) => a.sport, lang);

  return (
    <div className="space-y-10">
      {groups.map(([groupKey, group]) => (
        <section key={groupKey}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: sort === "school" ? "#00205B" : getSportColor(groupKey) }}
            />
            <h3 className="text-lg font-bold text-ink capitalize">{groupKey}</h3>
            <span className="text-xs text-muted">({group.length})</span>
          </div>
          <CardGrid athletes={group} faded={faded} lang={lang} />
        </section>
      ))}
    </div>
  );
}

/** Dimissions-badgets forklaring. Vises hvor 🎓 kan optræde. */
export function GraduationHelp({ lang }: { lang: string }) {
  return (
    <div className="mb-8 flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
      <span aria-hidden className="leading-none">🎓</span>
      <p>
        {t("athletes.grad_help_before", lang)}
        <strong className="text-ink">{t("athletes.grad_help_strong", lang)}</strong>
        {t("athletes.grad_help_after", lang)}
        <em>{t("athletes.alumni_heading", lang)}</em>.
      </p>
    </div>
  );
}

export function AthleteFullList({
  active,
  alumni,
  sort,
  lang,
}: {
  active: Athlete[];
  alumni: Athlete[];
  sort: SortMode;
  lang: string;
}) {
  return (
    <>
      <SortTabs sort={sort} lang={lang} />
      <GraduationHelp lang={lang} />

      <h2
        className="text-xl font-bold text-ink mb-6"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {t("athletes.active_heading", lang)}
      </h2>
      {active.length > 0 ? (
        <AthleteGrid athletes={active} sort={sort} lang={lang} />
      ) : (
        <p className="text-muted text-sm mb-10">{t("athletes.none_active", lang)}</p>
      )}

      {alumni.length > 0 && (
        <div className="mt-14 pt-10 border-t border-border">
          <AlumniToggle
            count={alumni.length}
            heading={t("athletes.alumni_heading", lang)}
            showLabel={t("athletes.show", lang)}
            hideLabel={t("athletes.hide", lang)}
          >
            <AthleteGrid athletes={alumni} sort={sort} faded lang={lang} />
          </AlumniToggle>
        </div>
      )}
    </>
  );
}
