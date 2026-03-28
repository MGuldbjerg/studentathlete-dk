-- Migration 003: URL-probe-log
-- Tracker alle URL-forsøg så vi aldrig gentager fejlede requests.
-- Kør med: wrangler d1 execute studentathlete-dk --file=db/migration-003-url-probes.sql --remote

CREATE TABLE IF NOT EXISTS url_probes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  url TEXT NOT NULL,
  purpose TEXT NOT NULL, -- 'platform_detect' | 'roster_scrape'
  http_status INTEGER,   -- 200, 404, 0 (timeout/fejl)
  result TEXT,           -- 'ok' | 'not_found' | 'timeout' | 'error' | 'redirect_404'
  response_size INTEGER,
  tried_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(school_id, url, purpose)
);

CREATE INDEX IF NOT EXISTS idx_url_probes_school ON url_probes(school_id);
CREATE INDEX IF NOT EXISTS idx_url_probes_result ON url_probes(result);
