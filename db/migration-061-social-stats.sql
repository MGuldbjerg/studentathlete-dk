-- Migration 061: what the statistics dashboard needs (2026-10-05).
--
-- 1. events.site — which SITE a visit landed on (DK/UK). Both sites share one
--    D1, and `country` is the VISITOR's country (cf-ipcountry), so until now a
--    visit to .co.uk from Denmark and one to .dk from Denmark looked the same.
--    Recorded by /api/track from the host; older rows are backfilled
--    separately (pipeline/report/backfill-event-site.ts — an UPDATE, so not
--    in this additive migration).
-- 2. follower_counts — one row per account per day, written by
--    pipeline/social/collect-followers.ts (follower-counts.yml). The channel
--    name is the social_posts.channel name, so posts and followers join.

ALTER TABLE events ADD COLUMN site TEXT;
CREATE INDEX IF NOT EXISTS idx_ev_site ON events(site, created_at);

CREATE TABLE IF NOT EXISTS follower_counts (
  channel    TEXT NOT NULL,
  day        TEXT NOT NULL,          -- YYYY-MM-DD (UTC)
  followers  INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (channel, day)
);
