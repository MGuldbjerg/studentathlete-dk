/**
 * Article LIST rows: the columns a card, the carousel, a related list or the
 * feed needs, without the bodies. Kept apart from db.ts (no Cloudflare import)
 * so `_word-count-sql-test.ts` can run the SQL against a real SQLite.
 */
import type { Article, ArticleListItem } from "./types";
import { countWords } from "./seo";

/**
 * `countWords(content)` (seo.ts) in SQL: whitespace becomes spaces, runs of up
 * to eight collapse to one, and the spaces left are the gaps between words.
 * `_word-count-sql-test.ts` holds it to the JS version.
 */
const collapseSpaces = (x: string) => `REPLACE(REPLACE(REPLACE(${x}, '  ', ' '), '  ', ' '), '  ', ' ')`;
const ARTICLE_WORDS_TEXT = collapseSpaces(
  `REPLACE(REPLACE(REPLACE(TRIM(a.content, ' ' || char(9, 10, 13)), char(13), ' '), char(10), ' '), char(9), ' ')`,
);
export const ARTICLE_WORD_COUNT_SQL =
  `(LENGTH(${ARTICLE_WORDS_TEXT}) - LENGTH(REPLACE(${ARTICLE_WORDS_TEXT}, ' ', '')) + 1)`;

/**
 * The columns a LIST needs (`ArticleListItem`): everything a card, the
 * carousel or the feed shows, and a word count instead of the body. Measured
 * 2026-10-28: the article bodies averaged ~1.2k chars plus ~1.5k of
 * `original_content`, and the home page alone pulled 60 + 18 + 5 of them per
 * render — parsed, held and serialized by the Worker for a reading time.
 * The article page keeps `ARTICLE_SELECT`.
 */
export const ARTICLE_LIST_SELECT = `
  a.id, a.title, a.slug, a.summary, a.article_type, a.index_words,
  a.author, a.author_role, a.cover_image_url, a.published, a.published_at,
  a.created_at, a.updated_at, a.athlete_id, a.source_url, a.featured,
  a.correction_note, a.corrected_at, a.story_id,
  ${ARTICLE_WORD_COUNT_SQL} AS word_count,
  at.name as athlete_name, at.sport, at.slug as athlete_slug
`;

/** A mock (or any full) article as a list row — for the no-DB paths. */
export function toListItem(a: Article): ArticleListItem {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, original_content, fact_flags, model_used, llm_provider, fabrication_risk, ...rest } = a;
  return { ...rest, word_count: countWords(content) };
}
