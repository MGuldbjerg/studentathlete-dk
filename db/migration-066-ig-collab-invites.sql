-- Instagram collab invites (2026-10-09, Mikkel: «start the collab invites now»).
-- An Instagram post on our account invites up to 3 athletes as collaborators;
-- accepted, it shows on their profile too. Guardrails (decided 2026-09-24):
-- only handles from the athlete's own school bio page (name_match), at most one
-- invite per athlete per 7 days, and a declined invite pauses that athlete for
-- 6 months. This table is the memory those rules read.
CREATE TABLE IF NOT EXISTS ig_collab_invites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id  INTEGER NOT NULL REFERENCES athletes(id),
  article_id  INTEGER,                 -- no FK: a rejected article may be deleted later
  channel     TEXT NOT NULL,           -- instagram_uk | instagram_dk
  handle      TEXT NOT NULL,
  media_id    TEXT,                    -- our post, for reading the invite's status
  status      TEXT NOT NULL DEFAULT 'sent',  -- sent | accepted | declined | unknown
  invited_at  TEXT NOT NULL DEFAULT (datetime('now')),
  checked_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_ig_collab_athlete ON ig_collab_invites(athlete_id, invited_at);
CREATE INDEX IF NOT EXISTS idx_ig_collab_status ON ig_collab_invites(status, invited_at);
