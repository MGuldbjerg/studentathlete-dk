-- Feed items whose article BODY discovery has read (2026-10-26): a new item is
-- opened once, for the school's player tags and the full names in its text
-- (pipeline/discover/check-sources.ts). Additive.
CREATE TABLE IF NOT EXISTS feed_items_seen (
  url_hash  TEXT    PRIMARY KEY,
  school_id INTEGER NOT NULL,
  seen_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feed_items_seen_at ON feed_items_seen(seen_at);
