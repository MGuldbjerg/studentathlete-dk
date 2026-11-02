-- Extra news feeds per school (2026-11-02), read by pipeline/discover/check-sources.ts
-- after the school's main feed (schools.news_feed_url).
-- Why: Illinois's main feed (fightingillini.com/rss) is CURATED — ~10 football /
-- basketball / volleyball stories. Cross country, track and golf only appear in the
-- sport feeds (?path=mcross …), so Frank Buchanan's Second-Team All-Big Ten (30/10)
-- and his Gans Creek top-10 (25/09) were never seen, nor were 4 other UK athletes.
-- Additive only, so scripts/migrate-live.sh accepts it.
CREATE TABLE IF NOT EXISTS school_feeds (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES schools(id),
  url        TEXT NOT NULL,
  feed_type  TEXT NOT NULL DEFAULT 'rss',  -- rss | html, as schools.news_feed_type
  note       TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, url)
);
CREATE INDEX IF NOT EXISTS idx_school_feeds_school ON school_feeds(school_id, active);

INSERT OR IGNORE INTO school_feeds (school_id, url, note) VALUES
  (44, 'https://fightingillini.com/rss?path=mcross', 'main feed curated; men''s XC'),
  (44, 'https://fightingillini.com/rss?path=wcross', 'main feed curated; women''s XC'),
  (44, 'https://fightingillini.com/rss?path=mtrack', 'main feed curated; men''s track'),
  (44, 'https://fightingillini.com/rss?path=wtrack', 'main feed curated; women''s track'),
  (44, 'https://fightingillini.com/rss?path=mgolf',  'main feed curated; men''s golf');
