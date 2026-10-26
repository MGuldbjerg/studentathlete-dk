/**
 * The honours and milestones in brief (PLAN-content-floor-uk.md, P5): the
 * profile's timeline is a table, and a table cell does not count towards the
 * floor — so the same facts are summed up in prose above it: what the athlete
 * was named this season and how often, earlier honours by season, and the
 * season's milestones with their dates.
 * ===========================================================================
 *
 * Rule-based from our own rows (athlete_events), so it publishes without
 * approval (the plan's decision 2). Computed at render time, so it is never
 * stale. The same award announced twice within a few days (conference, then
 * school) counts once, as on the timeline. No pronouns: the surname.
 */
import { awardLabel, type AthleteEventRow } from "./athlete-events";
import { languagePack } from "./i18n";

const TWIN_DAYS = 4;
const daysApart = (a: string, b: string) => Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86_400_000;

function list(items: string[], lang: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${lang === "da" ? "og" : "and"} ${items[items.length - 1]}`;
}

function times(k: number, lang: string): string {
  if (lang === "da") return k === 1 ? "én gang" : k === 2 ? "to gange" : `${k} gange`;
  return k === 1 ? "once" : k === 2 ? "twice" : `${k} times`;
}

const day = (iso: string, lang: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(languagePack(lang).locale, { day: "numeric", month: "long", timeZone: "UTC" });

/** One award per announcement: twins within TWIN_DAYS are one. */
function dedupe(rows: AthleteEventRow[]): AthleteEventRow[] {
  const kept: AthleteEventRow[] = [];
  for (const e of [...rows].sort((a, b) => (a.occurred_on ?? "").localeCompare(b.occurred_on ?? ""))) {
    const twin = e.occurred_on && kept.some((k) => k.award_name === e.award_name && k.occurred_on && daysApart(k.occurred_on, e.occurred_on!) <= TWIN_DAYS);
    if (!twin) kept.push(e);
  }
  return kept;
}

/** «(28 September and 7 October)» when there are three dates or fewer. */
function dates(rows: AthleteEventRow[], lang: string): string {
  const ds = rows.map((r) => r.occurred_on).filter((d): d is string => !!d);
  return ds.length && ds.length === rows.length && ds.length <= 3 ? ` (${list(ds.map((d) => day(d, lang)), lang)})` : "";
}

const NOUN: Record<string, Record<string, [string, string]>> = {
  en: { goals: ["goal", "goals"], assists: ["assist", "assists"], shutouts: ["clean sheet", "clean sheets"] },
  da: { goals: ["mål", "mål"], assists: ["assist", "assists"], shutouts: ["clean sheet", "clean sheets"] },
};

export function honoursParagraph(events: AthleteEventRow[], name: string, season: string, lang: string): string {
  const da = lang === "da";
  const who = name.trim().split(/\s+/).pop() ?? name;
  const out: string[] = [];
  const awards = dedupe(events.filter((e) => e.kind === "award" && e.award_name));

  // This season, grouped by award, most frequent first.
  const now = awards.filter((e) => e.season === season);
  if (now.length) {
    const groups = new Map<string, AthleteEventRow[]>();
    for (const e of now) groups.set(e.award_name!, [...(groups.get(e.award_name!) ?? []), e]);
    const parts = [...groups].sort((a, b) => b[1].length - a[1].length)
      .map(([award, rows]) => `${awardLabel(award, lang)} ${times(rows.length, lang)}${dates(rows, lang)}`);
    out.push(da ? `I denne sæson er ${who} blevet kåret til ${list(parts, lang)}.` : `This season ${who} has been named ${list(parts, lang)}.`);
  }

  // Earlier seasons, by award with the seasons it was won in.
  const before = awards.filter((e) => e.season && e.season < season);
  if (before.length) {
    const groups = new Map<string, Set<string>>();
    for (const e of before) groups.set(e.award_name!, (groups.get(e.award_name!) ?? new Set()).add(e.season!.slice(0, 4)));
    // Newest season first, within an award too.
    const parts = [...groups]
      .sort((a, b) => Math.max(...[...b[1]].map(Number)) - Math.max(...[...a[1]].map(Number)))
      .map(([award, ys]) => `${awardLabel(award, lang)} (${[...ys].sort().reverse().join(", ")})`);
    out.push(da ? `Tidligere hædersbevisninger i vores tal: ${list(parts, lang)}.` : `Earlier honours on file: ${list(parts, lang)}.`);
  }

  // The season's milestones in order.
  const ms = events
    .filter((e) => e.kind === "milestone" && e.season === season && e.occurred_on)
    .map((e) => ({ m: /^milestone:(goals|assists|shutouts):(\d+)$/.exec(e.award_name ?? ""), d: e.occurred_on! }))
    .filter((x): x is { m: RegExpExecArray; d: string } => !!x.m)
    .sort((a, b) => a.d.localeCompare(b.d));
  if (ms.length) {
    const L = NOUN[da ? "da" : "en"];
    const parts = ms.map(({ m, d }) => {
      const k = Number(m[2]), [one, many] = L[m[1]];
      const what = k === 1 ? (da ? `første ${one}` : `first ${one}`) : `${k} ${many}`;
      return da ? `${what} den ${day(d, lang)}` : `${what} on ${day(d, lang)}`;
    });
    out.push(da ? `Sæsonens milepæle: ${list(parts, lang)}.` : `Milestones this season: ${list(parts, lang)}.`);
  }
  return out.join(" ");
}
