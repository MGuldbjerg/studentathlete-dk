-- Photo permission requests (2026-10-21, Mikkel: send them through Brevo from info@studentathlete.dk).
-- Photos that accompany articles belong to the school (or its photographers); one school-wide
-- permission request per school, covering all international athletes and all sports.
--
-- schools.photo_permission is the CURRENT state:
--   NULL (never contacted) | asked | granted | conditional | declined | do_not_contact
-- photo_events is the full history: every send, reply, bounce and note, so we always know
-- who we contacted, when, and what they said, and never contact anyone twice by accident.
ALTER TABLE schools ADD COLUMN sid_email TEXT;            -- contact; the column name predates the broader "communications office" target
ALTER TABLE schools ADD COLUMN sid_name TEXT;
ALTER TABLE schools ADD COLUMN photo_permission TEXT;
ALTER TABLE schools ADD COLUMN photo_permission_at TEXT;  -- when the state last changed
ALTER TABLE schools ADD COLUMN photo_permission_note TEXT; -- conditions, preferred credit line, who replied

CREATE TABLE IF NOT EXISTS photo_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id   INTEGER NOT NULL REFERENCES schools(id),
  event       TEXT NOT NULL,    -- sent | failed | reply_granted | reply_conditional | reply_declined | forwarded | bounced | do_not_contact | note
  to_email    TEXT,
  subject     TEXT,
  message_id  TEXT,             -- Brevo messageId, for sent
  detail      TEXT,             -- error text, or free-text note
  at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_photo_events_school ON photo_events(school_id, id);
CREATE INDEX IF NOT EXISTS idx_photo_events_email ON photo_events(to_email, event, at);
