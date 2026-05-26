-- Migration 011: Pageview-tracking til server-side analytics
CREATE TABLE IF NOT EXISTS pageviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  path         TEXT NOT NULL,
  referrer     TEXT,
  country      TEXT,       -- CF-IPCountry header (gratis på alle CF-planer)
  device_type  TEXT,       -- 'mobile' | 'tablet' | 'desktop'
  page_type    TEXT,       -- 'home' | 'article' | 'athlete' | 'school' | 'sport' | 'other'
  sport        TEXT,       -- Udfyldt for article- og sport-sider
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pv_created   ON pageviews(created_at);
CREATE INDEX IF NOT EXISTS idx_pv_path      ON pageviews(path);
CREATE INDEX IF NOT EXISTS idx_pv_page_type ON pageviews(page_type);
