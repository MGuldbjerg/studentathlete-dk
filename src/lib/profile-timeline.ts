/**
 * The profile's timeline: honours and our own articles as dated lines.
 * ===================================================================
 *
 * Replaces the «Career highlights» table (2026-10-12, with the word floor in
 * timeline-entry.ts). Three kinds of row, newest first:
 *   · an honour from the school's or conference's own list → canonical award
 *     name, season or date, link to the source (Mikkel 2026-09-17: a table of
 *     honours, not a copy of the school's prose);
 *   · a short story kept as a line (timeline-entry.ts) → its approved headline
 *     without the athlete's name, dated, link to the source;
 *   · one of our articles → its headline without the name, linking to the article.
 * An honour harvested FROM one of the listed articles is the same fact twice, so
 * the article's row stands for it. So is the same award announced twice — the
 * conference's release and the school's a day or two later (2026-10-26: 14
 * pairs on 13 UK profiles): within AWARD_TWIN_DAYS it is one award, as in
 * award-tally.ts `dedupeAwards`. The article-backed one wins, else the earliest.
 *
 * Pure: the page passes the URL builder, so this can be tested without a site.
 */
import { awardLabel, type AthleteEventRow } from "./athlete-events";
import { timelineLine } from "./timeline-entry";
import { milestoneEvent } from "./leaderboard";

export interface TimelineRow {
  key: string;
  /** ISO date when known; otherwise only `season` is shown. */
  date: string | null;
  season: string | null;
  text: string;
  href: string | null;
  /** true: the source on another site (↗); false: our own article. */
  external: boolean;
  honor: boolean;
}

interface ArticleLike { id: number; title: string; published_at: string | null }

/** Same athlete, same award, this many days apart or less: one award. */
const AWARD_TWIN_DAYS = 4;
const daysApart = (a: string, b: string) => Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86_400_000;

export function buildTimeline(
  events: Array<AthleteEventRow & { article_id?: number | null }>,
  articles: ArticleLike[],
  athleteName: string,
  lang: string,
  articleUrl: (a: ArticleLike) => string,
): TimelineRow[] {
  const listed = new Set(articles.map((a) => a.id));
  const rows: TimelineRow[] = [];

  const isAward = (e: (typeof events)[number]) => e.kind === "award" && !!e.award_name && !!e.occurred_on;
  const twins = (a: (typeof events)[number], b: (typeof events)[number]) =>
    a.award_name === b.award_name && daysApart(a.occurred_on!, b.occurred_on!) <= AWARD_TWIN_DAYS;
  // Awards an article on this profile stands for.
  const covered = events.filter((e) => isAward(e) && e.article_id != null && listed.has(e.article_id));
  const keptAwards: typeof events = [];
  const byDate = [...events].sort((x, y) => (x.occurred_on ?? "").localeCompare(y.occurred_on ?? ""));
  const skip = new Set<number>();
  for (const e of byDate) {
    if (!isAward(e) || covered.includes(e)) continue;
    if (covered.some((c) => twins(c, e)) || keptAwards.some((k) => twins(k, e))) skip.add(e.id);
    else keptAwards.push(e);
  }

  for (const e of events) {
    if (e.article_id != null && listed.has(e.article_id)) continue;
    if (skip.has(e.id)) continue;
    // A milestone is rendered from its key in the READER's language, not from
    // the stored sentence — a market launched later reads its own language.
    const ms = /^milestone:(goals|assists|shutouts):(\d+)$/.exec(e.award_name ?? "");
    if (ms) {
      rows.push({
        key: `e${e.id}`, date: e.occurred_on ? e.occurred_on.slice(0, 10) : null, season: e.season,
        text: milestoneEvent(ms[1] as "goals" | "assists" | "shutouts", Number(ms[2]), lang).summary,
        href: e.source_url, external: true, honor: false,
      });
      continue;
    }
    // A kept line carries its own sentence; a harvested honour only its name.
    const own = e.summary && e.summary !== e.award_name;
    rows.push({
      key: `e${e.id}`,
      date: e.occurred_on ? e.occurred_on.slice(0, 10) : null,
      season: e.season,
      text: own ? e.summary : awardLabel(e.award_name, lang) || e.summary,
      href: e.source_url,
      external: true,
      honor: e.significance === "honor",
    });
  }
  for (const a of articles) {
    rows.push({
      key: `a${a.id}`,
      date: a.published_at ? a.published_at.slice(0, 10) : null,
      season: null,
      text: timelineLine(a.title, athleteName),
      href: articleUrl(a),
      external: false,
      honor: false,
    });
  }

  // Dated rows newest first; undated honours after them, newest season first.
  return rows.sort((x, y) => {
    if (x.date && y.date) return y.date.localeCompare(x.date);
    if (x.date) return -1;
    if (y.date) return 1;
    return (y.season ?? "").localeCompare(x.season ?? "");
  });
}
