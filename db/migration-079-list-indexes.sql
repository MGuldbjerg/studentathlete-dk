-- Migration 079: indexes for the article lists, the sport rosters and the
-- A–Z letter pages.
--
-- WHY. Measured 2026-10-28 (wrangler d1 insights, 1 day). Every article list
-- is «published = 1 AND country = ? ORDER BY published_at DESC LIMIT n», and
-- the only indexes were single-column `published` and `country`. The plan was
-- «SEARCH a USING INDEX idx_articles_published (published=?)» + «USE TEMP
-- B-TREE FOR ORDER BY»: read every published article, sort, keep 5–60.
--
--   home + archive list     776 runs × 1,334 rows = 1.04M
--   home sport bands        751 runs × 1,332 rows = 1.00M
--   sport landing articles  465 runs ×   969 rows = 0.45M
--   home carousel           644 runs ×   571 rows = 0.37M  (0 featured rows:
--                                                           it reads them all
--                                                           to find none)
--   new-this-week count     596 runs ×   570 rows = 0.34M
--
-- With (country, published, published_at) the lists walk the index in order
-- and stop at LIMIT; the count becomes an index range. The carousel gets its
-- own (…, featured, published_at), so it costs what it shows. (A partial index
-- WHERE featured = 1 was tried first: the planner passed it over and walked
-- the general index through every row looking for a featured one.)
--
-- `idx_athletes_country_active_sport` is in migration 047 but is NOT in the
-- live database (sqlite_master, 2026-10-28) — 047 was evidently applied only
-- in part. Without it the sport roster («sport = ? AND home_country = ? AND
-- active = 1», 371 runs × 362 rows) enters on home_country alone. IF NOT
-- EXISTS makes it a no-op wherever 047 did land.
--
-- The A–Z letter pages filter on «substr(name, 1, 1) = ? OR … = ?» after a
-- (home_country, active) range: 146 runs × 2,928 rows = 0.43M. An index on the
-- same expression lets SQLite seek straight to the letter (~190 rows for «S»
-- on .co.uk); the query already uses that exact form, so no code changes.
--
-- Indexes change no data and can be dropped again. ANALYZE refreshes
-- sqlite_stat1 for the two tables so the planner weighs the new indexes on
-- numbers rather than guesses (see migration 048).

CREATE INDEX IF NOT EXISTS idx_articles_country_published_at
  ON articles(country, published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_country_featured
  ON articles(country, published, featured, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_athletes_country_active_sport
  ON athletes(home_country, active, sport);

CREATE INDEX IF NOT EXISTS idx_athletes_country_active_initial
  ON athletes(home_country, active, substr(name, 1, 1));

ANALYZE articles;
ANALYZE athletes;
