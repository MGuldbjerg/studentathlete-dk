-- Weekly email digest subscribers (growth plan, Mikkel 2026-11-03).
-- One row per (email, site). `sports` is a comma-separated list of sport keys
-- (SPORT_KEYS); the subscriber gets only those sections. Double opt-in: nothing
-- is sent while status = 'pending'. `token` is the secret in the confirm /
-- manage / unsubscribe links. Retention (privacy pages): unconfirmed rows are
-- deleted after 7 days, unsubscribed rows 30 days after unsubscribing
-- (pipeline/digest/send-digest.ts does both).
CREATE TABLE IF NOT EXISTS digest_subscribers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  email            TEXT NOT NULL,
  site             TEXT NOT NULL,                -- country code of the site: DK | UK
  sports           TEXT NOT NULL,                -- comma-separated sport keys
  status           TEXT NOT NULL DEFAULT 'pending', -- pending | active | unsubscribed
  token            TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  confirm_sent_at  TEXT,
  confirmed_at     TEXT,
  unsubscribed_at  TEXT,
  last_sent_at     TEXT,                         -- last digest, guards against a double send
  UNIQUE (email, site)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_token ON digest_subscribers(token);
CREATE INDEX IF NOT EXISTS idx_digest_site_status ON digest_subscribers(site, status);
