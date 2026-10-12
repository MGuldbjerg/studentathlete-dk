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
 * the article's row stands for it.
 *
 * Pure: the page passes the URL builder, so this can be tested without a site.
 */
import { awardLabel, type AthleteEventRow } from "./athlete-events";
import { timelineLine } from "./timeline-entry";

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

export function buildTimeline(
  events: Array<AthleteEventRow & { article_id?: number | null }>,
  articles: ArticleLike[],
  athleteName: string,
  lang: string,
  articleUrl: (a: ArticleLike) => string,
): TimelineRow[] {
  const listed = new Set(articles.map((a) => a.id));
  const rows: TimelineRow[] = [];

  for (const e of events) {
    if (e.article_id != null && listed.has(e.article_id)) continue;
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
