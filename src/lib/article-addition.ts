/**
 * An award, added to the match report it honours (PLAN-richer-articles.md, step 2).
 * ================================================================================
 *
 * Weekly awards go up Monday or Tuesday (83 % of 146 measured, 2026-10-07),
 * two or three days after the weekend match they honour — too long to hold a
 * match report for. So the award does not become an article of its own when
 * the report already exists. It becomes a short ADDITION to that report:
 *
 *   · report still a draft  → the text is appended to the draft directly;
 *   · report already live   → a pending row (article_type 'addition',
 *     parent_article_id → the report) waits in the draft queue, is reviewed
 *     like any draft, and is appended only when it is published.
 *
 * This file holds what the Worker (admin «Udgiv») and the pipeline
 * (apply-draft-decisions.ts) must do identically when an addition is
 * published. Pure strings and SQL, no I/O.
 */

export const ADDITION_TYPE = "addition";

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const MONTHS_DA = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august",
  "september", "oktober", "november", "december"];

/** «Update, 7 October:» / «Opdatering 7. oktober:» — the day it goes live. */
export function updateLabel(lang: "da" | "en", when: Date): string {
  const d = when.getUTCDate();
  const m = when.getUTCMonth();
  return lang === "da" ? `Opdatering ${d}. ${MONTHS_DA[m]}:` : `Update, ${d} ${MONTHS_EN[m]}:`;
}

/**
 * The parent's content with the addition appended. A live article gets the
 * dated label, so a reader who saw it before can tell what is new; a draft
 * gets the text plainly — it has not been read by anyone yet.
 */
export function appendAddition(
  parentContent: string,
  addition: string,
  opts: { live: boolean; lang: "da" | "en"; when: Date },
): string {
  const text = addition.trim();
  if (!text) return parentContent;
  const body = opts.live ? `*${updateLabel(opts.lang, opts.when)}* ${text}` : text;
  return `${parentContent.trimEnd()}\n\n${body}`;
}

/** The parent of a pending addition, and what applying it needs to know. */
export const ADDITION_PARENT_SQL = `
  SELECT p.id, p.content, p.published, p.country
    FROM articles a JOIN articles p ON p.id = a.parent_article_id
   WHERE a.id = ? AND a.article_type = '${ADDITION_TYPE}'`;

/** Applying an addition: the parent changes, the award story points at it. */
export const APPLY_ADDITION_PARENT_SQL =
  "UPDATE articles SET content = ?, updated_at = datetime('now') WHERE id = ?";
export const APPLY_ADDITION_STORY_SQL =
  "UPDATE stories SET merged_into = ?, status = 'merged' WHERE id = (SELECT story_id FROM articles WHERE id = ?)";
/**
 * The addition row itself goes once it is part of the parent — children first,
 * as REJECT_DELETE_SQL does. Run AFTER the story update, which reads the row.
 */
export const APPLY_ADDITION_DELETE_SQL = [
  "DELETE FROM draft_reviews WHERE article_id = ?",
  "DELETE FROM social_posts WHERE article_id = ?",
  "DELETE FROM article_athletes WHERE article_id = ?",
  `DELETE FROM articles WHERE id = ? AND article_type = '${ADDITION_TYPE}'`,
] as const;

export const langOf = (country: string | null): "da" | "en" => (country === "DK" ? "da" : "en");
