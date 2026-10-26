-- The word floor on indexable pages (PLAN-content-floor-uk.md, step 6, 2026-10-26):
-- each page's words as site-check counts them, written daily by
-- pipeline/report/index-words.ts. Pages under CountryProfile.indexMinWords are
-- noindex and left out of the sitemap and the listings. NULL = not counted yet.
ALTER TABLE athletes ADD COLUMN index_words INTEGER;
ALTER TABLE articles ADD COLUMN index_words INTEGER;
CREATE TABLE IF NOT EXISTS school_index (
  country     TEXT    NOT NULL,
  school_id   INTEGER NOT NULL,
  words       INTEGER NOT NULL,
  computed_at TEXT    NOT NULL,
  PRIMARY KEY (country, school_id)
);
