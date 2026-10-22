/**
 * The season's award tally: every honour our athletes won, counted and listed
 * by month (Mikkel 2026-10-22: «I like the monthly award tally»; the honours
 * roundup on Instagram is built from the same data, tagging the winners).
 * ===========================================================================
 *
 * Source: athlete_events kind 'award' — conference releases and our own
 * published articles, each with its source link. Computed once a day by
 * pipeline/report/build-stats.ts into stats_cache key 'awards'; the page reads
 * one row. Pure: no database here.
 */

export const AWARDS_KEY = "awards";

export interface AwardInput {
  athlete_id: number;
  name: string;
  /** null when the athlete's profile is not public (no article, no stats). */
  slug: string | null;
  school: string;
  conference: string | null;
  sport: string;
  gender: string | null;
  award_name: string;
  occurred_on: string | null;
  source_url: string | null;
}

export interface AwardRow {
  name: string;
  slug: string | null;
  school: string;
  conference: string | null;
  sport: string;
  gender: string | null;
  award: string;
  date: string;
  source: string | null;
}

export interface AwardMonth { month: string; count: number; rows: AwardRow[] }

export interface AwardTally {
  country: string;
  season: string;
  asOf: string;
  total: number;
  athletes: number;
  byConference: Array<{ conference: string; count: number }>;
  bySport: Array<{ sport: string; gender: string | null; count: number }>;
  months: AwardMonth[];
}

/**
 * The same award reaches us twice: from the conference's release (dated the
 * week) and from our article about it (dated when we published, often two
 * days later). Marianna MacLean's Patriot League Rookie of the Week on 5
 * October was stored on the 5th and the 7th. Rows for the same athlete and
 * award within `days` of each other are one award; the earliest is kept.
 * Weekly awards are at least a week apart, so a real second one survives.
 */
export function dedupeAwards<T extends { athlete_id: number; award_name: string; occurred_on: string | null }>(rows: T[], days = 4): T[] {
  const sorted = [...rows].sort((a, b) => (a.occurred_on ?? "").localeCompare(b.occurred_on ?? ""));
  const kept: T[] = [];
  const ms = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).getTime();
  for (const r of sorted) {
    const dup = r.occurred_on && kept.some((k) => k.athlete_id === r.athlete_id && k.award_name === r.award_name && k.occurred_on
      && Math.abs(ms(k.occurred_on) - ms(r.occurred_on!)) <= days * 86_400_000);
    if (!dup) kept.push(r);
  }
  return kept;
}

/** Count and list; awards without a date are left out of the months but counted. */
export function buildAwardTally(country: string, season: string, asOf: string, rawInput: AwardInput[]): AwardTally {
  const input = dedupeAwards(rawInput);
  const count = <K extends string>(keyOf: (a: AwardInput) => K | null) => {
    const m = new Map<K, number>();
    for (const a of input) { const k = keyOf(a); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  };
  const months = new Map<string, AwardRow[]>();
  for (const a of input) {
    if (!a.occurred_on) continue;
    const m = a.occurred_on.slice(0, 7);
    months.set(m, [...(months.get(m) ?? []), {
      name: a.name, slug: a.slug, school: a.school, conference: a.conference, sport: a.sport, gender: a.gender,
      award: a.award_name, date: a.occurred_on.slice(0, 10), source: a.source_url,
    }]);
  }
  return {
    country, season, asOf,
    total: input.length,
    athletes: new Set(input.map((a) => a.athlete_id)).size,
    byConference: count((a) => a.conference).map(([conference, n]) => ({ conference, count: n })),
    bySport: count((a) => `${a.sport}|${a.gender ?? ""}`).map(([k, n]) => {
      const [sport, gender] = k.split("|");
      return { sport, gender: gender || null, count: n };
    }),
    months: [...months]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, rows]) => ({ month, count: rows.length, rows: rows.sort((x, y) => y.date.localeCompare(x.date) || x.name.localeCompare(y.name)) })),
  };
}

/** The calendar month before `now`, as YYYY-MM (the roundup's month on the 1st). */
export function previousMonth(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
