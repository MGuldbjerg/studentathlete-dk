/**
 * A short story becomes a line on the athlete's timeline, not a page of its own.
 * ===========================================================================
 *
 * Mikkel, 2026-10-12 (PLAN-adsense-uk.md, step 2): AdSense rejected
 * student-athlete.co.uk for low value content; 59 of its 342 articles were under
 * 100 words — a weekly award, a 92nd place in a field of 200, one goal and
 * nothing else verified. From now on such a draft, when it is published, becomes
 * one dated line in the profile's timeline («6 Oct 2026 · Named Metro
 * Conference Rookie of the Week ↗») and the draft row is removed, as an
 * addition's is (article-addition.ts). Articles already published are untouched.
 *
 * Decided at PUBLISH time from the final text, so a draft the review lengthened
 * stays an article. Both publish paths call this: publishArticle (admin) and
 * apply-draft-decisions.ts (batch and the Opus editor).
 *
 * The line is the published title with the athlete's name taken off the front —
 * text that has already passed review. Nothing is written for it.
 */
import { countryProfile } from "./countries";
import { ADDITION_TYPE } from "./article-addition";
import { extractEvents, seasonForEvent } from "./athlete-events";

/** Words, as the site counts them: whitespace-separated tokens. */
export function wordCount(text: string | null | undefined): number {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Does this draft become a timeline line when published? Only where the site
 * sets a floor (CountryProfile.standaloneMinWords), never for an addition, and
 * only for an athlete — a line needs a profile to stand on.
 */
export function becomesTimelineEntry(d: {
  country: string | null;
  article_type: string | null;
  content: string | null;
  athlete_id: number | null;
}): boolean {
  if (!d.country || !d.athlete_id || d.article_type === ADDITION_TYPE) return false;
  let min = 0;
  try { min = countryProfile(d.country).standaloneMinWords; } catch { return false; }
  return min > 0 && wordCount(d.content) < min;
}

/**
 * «Lucy Trinder named Metro Conference Rookie of the Week» on Lucy Trinder's
 * own profile reads «Named Metro Conference Rookie of the Week». Only an exact
 * leading full name followed by a verb is taken off; a possessive («Lucy
 * Trinder's double …») or a name further in leaves the title as it is.
 */
export function timelineLine(title: string, athleteName: string): string {
  const t = title.trim();
  const name = athleteName.trim();
  if (name && t.toLowerCase().startsWith(name.toLowerCase() + " ")) {
    const rest = t.slice(name.length + 1).trim();
    if (rest && !/^['’]s\b/.test(rest)) return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return t;
}

/** The event's own date from the fact sheet when it carries a year; else the fallback. */
export function timelineDate(factSheetJson: string | null, fallbackIso: string): string {
  try {
    const raw = (JSON.parse(factSheetJson ?? "null") as { event?: { date?: unknown } } | null)?.event?.date;
    if (typeof raw === "string" && /\b\d{4}\b/.test(raw)) {
      const d = new Date(raw.replace(/(\d)(st|nd|rd|th)\b/g, "$1"));
      // Parsed as local midnight, so read it back locally: toISOString() would
      // turn 26 September into the 25th anywhere east of UTC.
      if (!Number.isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      }
    }
  } catch { /* not JSON: use the fallback */ }
  return fallbackIso.slice(0, 10);
}

export const TIMELINE_INSERT_SQL = `INSERT OR IGNORE INTO athlete_events
  (athlete_id, occurred_on, season, kind, award_name, summary, significance, source_url, article_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'))`;

/** The draft goes, children first — as an addition's does (article-addition.ts). */
export const TIMELINE_DELETE_SQL = [
  "DELETE FROM draft_reviews WHERE article_id = ?",
  "DELETE FROM social_posts WHERE article_id = ?",
  "DELETE FROM article_athletes WHERE article_id = ?",
  "DELETE FROM articles WHERE id = ? AND published = 0",
] as const;

/**
 * Parameters for TIMELINE_INSERT_SQL. A headline naming an award keeps the
 * award's canonical name, so the profile's award counts and the weekly-award
 * dedup (migration 062: no article → by date) still see it; anything else is a
 * routine result.
 */
export function timelineParams(d: {
  athlete_id: number;
  athlete_name: string;
  title: string;
  source_url: string | null;
  fact_sheet: string | null;
}, nowIso: string = new Date().toISOString()): unknown[] {
  const occurred = timelineDate(d.fact_sheet, nowIso);
  const award = extractEvents(d.title)[0];
  const significance = award?.significance ?? "routine";
  return [
    d.athlete_id, occurred, seasonForEvent(occurred, significance),
    award ? award.kind : "result", award?.award_name ?? null,
    timelineLine(d.title, d.athlete_name), significance, d.source_url,
  ];
}
