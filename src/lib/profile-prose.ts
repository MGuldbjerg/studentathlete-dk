/**
 * The profile's own prose in one place (PLAN-content-floor-uk.md, step 6):
 * the page renders it, and the daily index job counts it — so the noindex
 * decision is made on exactly the text a reader sees.
 * ===========================================================================
 *
 * Every computed paragraph on a profile: the season line, team context (P2),
 * standing (P3), earlier seasons (P1), background (P4), honours in brief (P5),
 * and the fact-sheet hub lines. The approved summary and our article titles
 * are counted by `profileWords` beside these. Tables, the facts list and the
 * timeline are not prose by the floor rule and are left out of the count.
 */
import type { Athlete } from "./types";
import type { SeasonStatsRow } from "./db";
import type { AthleteEventRow } from "./athlete-events";
import { seasonFromDate } from "./athlete-events";
import { hubLines, seasonHubLine, statColumns } from "./athlete-hub";
import { readTeamContext, teamParagraphs } from "./team-context";
import { careerParagraph, careerRows, type CareerSeason } from "./career";
import { readStanding, standingSentences } from "./standing";
import { bioParagraph, readBioFacts } from "./bio-facts";
import { honoursParagraph } from "./honours-summary";
import { sportLabel, t, articleTypeLabel } from "./i18n";
import { formatDateShort } from "./seo";

export interface ProfileProseInput {
  athlete: Pick<Athlete, "name" | "university" | "bio_facts" | "previous_school">;
  seasonStats: SeasonStatsRow | null;
  career: CareerSeason[];
  events: AthleteEventRow[];
  records: string[];
  lang: string;
}

export interface ProfileProse {
  statsLine: { text: string; source: string } | null;
  statsTable: ReturnType<typeof statColumns>;
  teamText: string[];
  standingText: string;
  careerText: string;
  careerTable: ReturnType<typeof careerRows>;
  bioText: string;
  hub: ReturnType<typeof hubLines>;
  honoursText: string;
}

function safeCells(json: string): Record<string, string> {
  try { return JSON.parse(json) as Record<string, string>; } catch { return {}; }
}

export function buildProfileProse({ athlete, seasonStats, career, events, records, lang }: ProfileProseInput): ProfileProse {
  // The records lines are English with English sources: the English site only.
  // «0 goals and 0 assists in 13 games» says less than the table beside it:
  // the sentence only when it opens with something scored.
  const statsLineRaw = lang === "en" && seasonStats?.line ? seasonHubLine(seasonStats.line) : null;
  const statsLine = statsLineRaw && !/^0 goals\b/.test(statsLineRaw.text) ? statsLineRaw : null;
  const statsTable = seasonStats ? statColumns(seasonStats.kind, seasonStats.cells, lang) : [];
  const cells = seasonStats ? safeCells(seasonStats.cells) : {};
  const ball = seasonStats && seasonStats.kind !== "tennis" ? seasonStats : null;
  const teamCtx = ball ? readTeamContext(ball.team) : null;
  const teamText = teamCtx && ball ? teamParagraphs(teamCtx, { name: athlete.name, kind: ball.kind, cells }, lang) : [];
  const standing = seasonStats ? readStanding(seasonStats.standing) : null;
  const standingText = standing ? standingSentences(standing, athlete.name, lang).join(" ") : "";
  const careerText = careerParagraph(career, ball ? { kind: ball.kind, games: ball.games, cells, school: ball.school } : null, athlete.name, lang);
  const careerTable = careerText ? careerRows(career, lang) : [];
  const bio = readBioFacts(athlete.bio_facts);
  const bioSchool = seasonStats?.school ?? athlete.university ?? "";
  const bioText = bio && bioSchool ? bioParagraph(bio, athlete.name, bioSchool, athlete.previous_school ?? null, lang) : "";
  // A fact sheet's season line is older than the table: keep only its ranking line then.
  const hub = lang === "en" ? hubLines(records).filter((h) => !(seasonStats && h.source.includes("stats page"))) : [];
  const honoursText = honoursParagraph(events, athlete.name, seasonFromDate(null), lang);
  return { statsLine, statsTable, teamText, standingText, careerText, careerTable, bioText, hub, honoursText };
}

/** Words as site-check counts them: whitespace-separated tokens. */
export const words = (t: string | null | undefined) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);

/**
 * The profile's prose words: the computed paragraphs, the approved summary,
 * and the titles of our articles listed on it. The page's fixed text
 * (headings, labels, breadcrumb) comes on top; `INDEX_OVERHEAD` in the index
 * job accounts for it, calibrated against site-check.
 */
export function profileWords(p: ProfileProse, summary: string | null, articleTitles: string[]): number {
  return (
    words(p.statsLine?.text) + words(p.statsLine?.source) +
    p.teamText.reduce((t, x) => t + words(x), 0) +
    words(p.standingText) + words(p.careerText) + words(p.bioText) + words(p.honoursText) +
    p.hub.reduce((t, h) => t + words(h.text) + words(h.source), 0) +
    words(summary) +
    articleTitles.reduce((t, x) => t + words(x), 0)
  );
}

export interface ProfilePageFacts {
  name: string;
  sport: string;
  university: string;
  hasBioUrl: boolean;
  summary: string | null;
  statsSchool: string | null;      // the season row's school, when the stats table shows
  statsDate: string | null;
  careerSchool: string | null;     // the earlier seasons' school, when that block shows
  schoolmates: Array<{ name: string; sport: string }>;
  articles: Array<{ title: string; article_type: string; published_at: string | null }>;
  timelineTexts: string[];         // the timeline rows' text cells
}

/** A table cell counts only as prose (site-check's floor rule): 10+ words, or 5+ ending a sentence. */
const proseCell = (t: string) => { const n = words(t); return n >= 10 || (n >= 5 && /[.!?]$/.test(t.trim())) ? n : 0; };

/**
 * Every word site-check counts on a profile, not only the computed prose:
 * the document title, headings, the school-mates list, the source lines,
 * the timeline note and long timeline lines, the articles with their type and
 * date. Built from the page's own labels (t()), so a reworded label is counted
 * as it reads. Calibrated against site-check (index-words.ts --calibrate).
 */
export function profilePageWords(p: ProfileProse, f: ProfilePageFacts, lang: string): number {
  let n = words(f.name) + 1 + words(sportLabel(f.sport, lang));            // «Name – Sport» (the title)
  n += words(t("profile.facts", lang));
  if (f.schoolmates.length) {
    n += words(t("profile.schoolmates", lang, { school: f.university }));
    n += f.schoolmates.reduce((s, m) => s + words(m.name) + 1 + words(sportLabel(m.sport, lang)), 0);
  }
  if (f.hasBioUrl) n += words(t("profile.official_bio", lang, { school: f.university }));
  if (f.summary) n += words(t("profile.about", lang, { name: f.name })) + words(f.summary);
  if (f.statsSchool && p.statsTable.length) {
    n += words(t("profile.season_so_far", lang)) + 1 +
      words(t("profile.stats_source", lang, { school: f.statsSchool, date: formatDateShort(f.statsDate, lang) }));
    n += words(p.statsLine?.text) + p.teamText.reduce((s, x) => s + words(x), 0) + words(p.standingText);
  }
  if (p.hub.length) n += words(t("profile.season_so_far", lang)) + p.hub.reduce((s, h) => s + words(h.text) + words(h.source), 0);
  if (p.bioText) n += words(t("profile.background", lang)) + words(p.bioText);
  if (p.careerText && f.careerSchool) n += words(t("profile.career", lang)) + words(p.careerText) + words(t("profile.career_source", lang, { school: f.careerSchool }));
  if (f.timelineTexts.length) {
    n += words(t("profile.timeline", lang)) + words(p.honoursText) + words(t("profile.timeline_note", lang));
    n += f.timelineTexts.reduce((s, x) => s + proseCell(x), 0);
  }
  if (f.articles.length) {
    n += words(t("profile.articles", lang));
    n += f.articles.reduce((s, a) => s + words(articleTypeLabel(a.article_type, lang)) + words(a.title) + words(formatDateShort(a.published_at, lang)), 0);
  } else if (!f.statsSchool) {
    n += words(t("profile.no_articles", lang));
  }
  return n;
}
