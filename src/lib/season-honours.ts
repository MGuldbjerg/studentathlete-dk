/**
 * End-of-season honours for one sport on one site: the living awards page.
 * ===========================================================================
 *
 * Mikkel, 2026-11-09: a roundup of the season's soccer honours — first as a
 * page that fills itself as the conferences announce (this), later a dated
 * article built from the same data. /statistics/awards keeps the monthly tally
 * of every honour; this page is only the END-OF-SEASON ones: All-Conference,
 * X of the Year, All-Freshman, All-Region, All-American.
 *
 * Rules the layout follows:
 *  - no favourites: everyone is listed the same way, grouped by gender,
 *    division and conference, alphabetical by surname. No "standouts".
 *  - the honour is shown as the release worded it (athlete_events.summary,
 *    see conference-honors.ts FoundHonour.detail). A row that only has the
 *    bucket gets a deliberately general label: the bucket "Player of the Year"
 *    covers any "X of the Year", and naming it outright overstated a Rookie of
 *    the Year once.
 *
 * Computed once a day by pipeline/report/build-stats.ts into stats_cache key
 * 'season_honours'; the page reads one row. Pure: no database here.
 */

import { isReleaseLabel, tidyLabel } from "./honour-label";

export const SEASON_HONOURS_KEY = "season_honours";

/** The buckets that are end-of-season honours, in display order within an athlete. */
export const SEASON_HONOUR_BUCKETS = [
  "All-American", "All-American HM", "Player of the Year", "Freshman of the Year", "MVP",
  "All-Region", "All-Region HM", "All-Conference", "All-Conference HM", "All-Freshman",
] as const;

/** What a bucket-only row says on the page — general on purpose (see above). */
const BUCKET_LABEL: Record<string, string> = {
  "All-American": "All-American",
  "All-American HM": "All-American honourable mention",
  "Player of the Year": "End-of-season conference award",
  "Freshman of the Year": "Conference newcomer award",
  MVP: "MVP",
  "All-Region": "All-Region team",
  "All-Region HM": "All-Region honourable mention",
  "All-Conference": "All-Conference team",
  "All-Conference HM": "All-Conference honourable mention",
  "All-Freshman": "All-Freshman team",
};

/** Buckets that are the same honour seen twice (a Rookie of the Year harvested as "Player of the Year"). */
const SAME_FAMILY: Record<string, string> = {
  "Player of the Year": "year", "Freshman of the Year": "year",
  "All-Conference": "allconf", "All-Conference HM": "allconf",
};

export interface HonourInput {
  athlete_id: number;
  name: string;
  /** null when the profile is not public on the site. */
  slug: string | null;
  school: string;
  conference: string | null;
  gender: string | null;
  division: string | null;
  /** "england" … or null when unknown. */
  nation: string | null;
  award_name: string;
  summary: string | null;
  occurred_on: string | null;
  source_url: string | null;
}

export interface Honour { text: string; source: string | null; date: string | null }
export interface HonouredAthlete { name: string; slug: string | null; school: string; nation: string | null; honours: Honour[] }
export interface ConferenceGroup { conference: string; athletes: HonouredAthlete[] }
export interface DivisionGroup { division: string; conferences: ConferenceGroup[] }
export interface GenderGroup { gender: "f" | "m" | "x"; athletes: number; divisions: DivisionGroup[] }

export interface SeasonHonours {
  country: string;
  sport: string;
  season: string;
  asOf: string;
  athletes: number;
  honours: number;
  conferences: number;
  groups: GenderGroup[];
}

const DIVISION_ORDER = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "NJCAA"];
/**
 * The row carries the release's own label. A sentence (an article-harvest
 * summary: "Named to … after anchoring the defence") is not a list entry — it
 * counts as bucket-only, and merges into a worded twin when there is one.
 */
const precise = (r: HonourInput) => !!r.summary && r.summary.trim() !== "" && r.summary !== r.award_name && isReleaseLabel(r.summary);
const dayMs = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).getTime() : NaN);
const surname = (name: string) => name.trim().split(/\s+/).slice(-1)[0].toLowerCase();

/**
 * One honour per real award: a bucket-only row is dropped when the same athlete
 * has a worded row of the same family within `days` (the article harvest and
 * the conference release both saw it). Same bucket + same wording = one row.
 */
export function mergeHonours(rows: HonourInput[], days = 4): HonourInput[] {
  const kept: HonourInput[] = [];
  const seen = new Set<string>();
  const worded = rows.filter(precise);
  for (const r of [...worded, ...rows.filter((x) => !precise(x))]) {
    const key = `${r.athlete_id}|${r.award_name}|${(r.summary ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    if (!precise(r)) {
      const fam = SAME_FAMILY[r.award_name] ?? r.award_name;
      const twin = worded.some((w) => w.athlete_id === r.athlete_id && (SAME_FAMILY[w.award_name] ?? w.award_name) === fam
        && (!r.occurred_on || !w.occurred_on || Math.abs(dayMs(w.occurred_on) - dayMs(r.occurred_on)) <= days * 86_400_000));
      if (twin) continue;
      // Two bucket-only rows of one bucket are one honour.
      if (kept.some((k) => k.athlete_id === r.athlete_id && k.award_name === r.award_name && !precise(k))) continue;
    }
    seen.add(key);
    kept.push(r);
  }
  return kept;
}

export function buildSeasonHonours(country: string, sport: string, season: string, asOf: string, raw: HonourInput[]): SeasonHonours {
  const buckets = new Set<string>(SEASON_HONOUR_BUCKETS);
  // Academic honours are not athletic ones (Mikkel, 2026-10-06); an article
  // harvest can file "Academic All-ASUN" under the All-Conference bucket.
  const rows = mergeHonours(raw.filter((r) => buckets.has(r.award_name) && !/\bacademic\b|\bscholar|\bgpa\b/i.test(r.summary ?? "")));
  const order = (b: string) => (SEASON_HONOUR_BUCKETS as readonly string[]).indexOf(b);

  const byAthlete = new Map<number, { info: HonourInput; rows: HonourInput[] }>();
  for (const r of rows) {
    const e = byAthlete.get(r.athlete_id);
    if (e) e.rows.push(r);
    else byAthlete.set(r.athlete_id, { info: r, rows: [r] });
  }

  const groups = new Map<string, Map<string, Map<string, HonouredAthlete[]>>>();
  for (const { info, rows: rs } of byAthlete.values()) {
    const g = info.gender === "f" || info.gender === "m" ? info.gender : "x";
    const d = info.division ?? "Other";
    const c = info.conference ?? "Independent or unknown conference";
    const athlete: HonouredAthlete = {
      name: info.name, slug: info.slug, school: info.school, nation: info.nation,
      honours: rs
        .sort((a, b) => order(a.award_name) - order(b.award_name) || (a.summary ?? "").localeCompare(b.summary ?? ""))
        .map((r) => ({ text: precise(r) ? tidyLabel(r.summary!) : BUCKET_LABEL[r.award_name] ?? r.award_name, source: r.source_url, date: r.occurred_on?.slice(0, 10) ?? null })),
    };
    const gm = groups.get(g) ?? new Map();
    const dm = gm.get(d) ?? new Map();
    dm.set(c, [...(dm.get(c) ?? []), athlete]);
    gm.set(d, dm);
    groups.set(g, gm);
  }

  const divRank = (d: string) => { const i = DIVISION_ORDER.indexOf(d); return i < 0 ? 99 : i; };
  const out: GenderGroup[] = (["f", "m", "x"] as const).filter((g) => groups.has(g)).map((g) => {
    const divisions = [...groups.get(g)!].sort((a, b) => divRank(a[0]) - divRank(b[0]) || a[0].localeCompare(b[0])).map(([division, cm]) => ({
      division,
      conferences: [...cm].sort((a, b) => a[0].localeCompare(b[0])).map(([conference, athletes]) => ({
        conference,
        athletes: athletes.sort((a, b) => surname(a.name).localeCompare(surname(b.name)) || a.name.localeCompare(b.name)),
      })),
    }));
    return { gender: g, athletes: divisions.reduce((n, d) => n + d.conferences.reduce((m, c) => m + c.athletes.length, 0), 0), divisions };
  });

  return {
    country, sport, season, asOf,
    athletes: byAthlete.size,
    honours: rows.length,
    conferences: new Set(rows.map((r) => r.conference ?? "")).size,
    groups: out,
  };
}
