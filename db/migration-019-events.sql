-- Migration 019: First-party analytics-events (afløser bot-polluted pageviews-logning)
-- Én tabel for både sidevisninger og klik (event_type-diskriminator).
-- Privatliv: IP gemmes ALDRIG — kun en daglig-saltet hash (kan ikke vendes om eller
-- kobles på tværs af dage). Ingen samtykke-banner nødvendig (ingen PII).
CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type   TEXT NOT NULL,        -- 'pageview' | 'click'
  path         TEXT NOT NULL,        -- siden hvor hændelsen skete
  page_type    TEXT,                 -- home|article|athlete|school|sport|other (server-afledt)
  sport        TEXT,
  referrer     TEXT,                 -- ekstern referrer-host, kun pageviews
  country      TEXT,                 -- cf-ipcountry header
  device_type  TEXT,                 -- mobile|tablet|desktop
  visitor_hash TEXT,                 -- daglig-saltet SHA-256(salt:dato:ip:ua) → unikke mennesker/dag
  click_kind   TEXT,                 -- klik: 'bio_out'|'internal'|'search'|'ad'|'outbound'
  click_target TEXT,                 -- klik: destinations-URL eller søgeord (afkortet 300)
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ev_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_ev_type    ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_ev_path    ON events(path);
CREATE INDEX IF NOT EXISTS idx_ev_visitor ON events(visitor_hash, created_at);
