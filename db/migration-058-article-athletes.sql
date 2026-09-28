-- Migration 058: an article can be about more than one athlete.
--
-- `articles.athlete_id` names ONE athlete, but one match report often covers
-- two British players, and generation writes one article per (source, site).
-- Mikkel 2026-09-28: those articles must also invite EVERY athlete as an
-- Instagram collaborator (max 3 per post, invite-first, 1/athlete/week,
-- decline ⇒ 6-month pause). This table is where the invite step finds them.
--
-- role: 'primary'  = the athlete the article was generated for (= articles.athlete_id)
--       'featured' = another athlete the same article covers
--
-- No foreign keys on purpose: D1 enforces them, and an article delete that
-- forgot this table would then fail. REJECT_DELETE_SQL clears it first.

CREATE TABLE IF NOT EXISTS article_athletes (
  article_id INTEGER NOT NULL,
  athlete_id INTEGER NOT NULL,
  role       TEXT NOT NULL DEFAULT 'featured',
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (article_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_article_athletes_athlete ON article_athletes(athlete_id);

-- Every existing article covers at least its own athlete.
INSERT OR IGNORE INTO article_athletes (article_id, athlete_id, role)
SELECT id, athlete_id, 'primary' FROM articles WHERE athlete_id IS NOT NULL;
