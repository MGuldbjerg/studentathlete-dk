-- Migration 002: Fuld dækning — skoler, roster-tracking, platform-detektion
-- Kør med: wrangler d1 execute studentathlete-dk --file=db/migration-002-fullscan.sql --remote

-- Udvid schools med metadata
ALTER TABLE schools ADD COLUMN common_name TEXT;
ALTER TABLE schools ADD COLUMN nickname TEXT;
ALTER TABLE schools ADD COLUMN city TEXT;
ALTER TABLE schools ADD COLUMN platform_type TEXT DEFAULT 'unknown';
  -- sidearm | wmt_digital | wordpress | prestosports | custom | unknown
ALTER TABLE schools ADD COLUMN platform_detected_at TEXT;

-- Tracking af roster-scraping per skole/sport
CREATE TABLE IF NOT EXISTS roster_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  sport TEXT NOT NULL,
  roster_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | success | empty | error | js_required
  athletes_found INTEGER DEFAULT 0,
  checked_at TEXT,
  error_message TEXT,
  UNIQUE(school_id, sport)
);

CREATE INDEX IF NOT EXISTS idx_rc_status ON roster_checks(status);
CREATE INDEX IF NOT EXISTS idx_rc_checked ON roster_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_rc_school ON roster_checks(school_id);
