/**
 * The statistics pages in words, written from their own numbers.
 * ===========================================================================
 *
 * The UK floor (PLAN-content-floor-uk.md) found /statistics and the four nation
 * pages at 92-126 words: tables and nothing else. Mikkel approved the plan on
 * 2026-10-27: the static pages get text, and for these the text comes from the
 * data the page already shows, the way a profile's does (profile-prose.ts).
 * Nothing here can say more than the tables: totals, the gender split, the
 * three biggest sports, the divisions, the home nations, and how we count.
 */
import type { SiteStats, StatsBlock } from "./athlete-stats";
import type { Nation } from "./home-nation";
import { languagePack, sportLabel, t } from "./i18n";

/** «Field Hockey» → «field hockey» mid-sentence; «American Football» keeps its capital. */
function midSentence(label: string, lang: string): string {
  if (lang === "da") return label.toLowerCase();
  return label.split(" ").map((w) => (w === "American" ? w : w.toLowerCase())).join(" ");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function list(items: string[], lang: string): string {
  const and = lang === "da" ? "og" : "and";
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

/** Division keys as the tables show them («NCAA D1»), read out in a sentence. */
function divisionName(d: string, lang: string): string {
  const m = /^NCAA D(\d)$/.exec(d);
  if (m) return lang === "da" ? `NCAA Division ${m[1]}` : `NCAA Division ${"I".repeat(Number(m[1]))}`;
  return d;
}

export function statsProse(stats: SiteStats, nation: Nation | null, lang: string): string[] {
  const block: StatsBlock | undefined = nation ? stats.nations[nation] : stats.all;
  if (!block || !block.totals.total) return [];
  const n = (x: number) => x.toLocaleString(languagePack(lang).locale);
  const pct = (x: number) => `${Math.round((x / block.totals.total) * 100)}%`;
  const who = nation
    ? t("stats.prose.who_nation", lang, { nation: t(`stats.nation.${nation}` as const, lang) })
    : t("stats.prose.who_all", lang);
  const out: string[] = [];

  const { f, m, u, total } = block.totals;
  out.push(t(u ? "stats.prose.totals_u" : "stats.prose.totals", lang, { total: n(total), who, f: n(f), m: n(m), u: n(u) }));

  const sports = block.bySport.filter((s) => s.sport && s.sport !== "other").slice(0, 3);
  if (sports.length) {
    const [first, ...rest] = sports;
    const top3 = sports.reduce((a, s) => a + s.total, 0);
    out.push(t(rest.length ? "stats.prose.sports" : "stats.prose.sports_one", lang, {
      first: cap(midSentence(sportLabel(first.sport, lang), lang)),
      firstN: n(first.total),
      firstPct: pct(first.total),
      rest: list(rest.map((s) => `${midSentence(sportLabel(s.sport, lang), lang)} (${n(s.total)})`), lang),
      top3Pct: pct(top3),
      count: n(block.bySport.length),
    }));
  }

  if (block.byDivision.length) {
    const parts = block.byDivision.filter((d) => d.division !== "?").map((d) => `${n(d.total)} ${t("stats.prose.in", lang)} ${divisionName(d.division, lang)}`);
    if (parts.length) out.push(t("stats.prose.divisions", lang, { list: list(parts, lang) }));
  }

  if (!nation && Object.keys(stats.nations).length) {
    const parts = (Object.entries(stats.nations) as Array<[Nation, StatsBlock]>)
      .sort((a, b) => b[1].totals.total - a[1].totals.total)
      .map(([k, b]) => `${t(`stats.nation.${k}` as const, lang)} ${n(b.totals.total)}`);
    out.push(t(stats.nationUnknown ? "stats.prose.nations_u" : "stats.prose.nations", lang, { list: list(parts, lang), unknown: n(stats.nationUnknown) }));
  }

  out.push(t("stats.prose.method", lang));
  return out;
}
