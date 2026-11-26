-- Migration 090: admin_issues — the hand-kept half of /admin/sager (2026-11-26).
-- The page's other half is computed live from the queues and the photo ledger; this
-- table holds what no query can see: decisions waiting on Mikkel, follow-ups promised
-- by email, ideas parked for a quiet evening. Admin-only; nothing on the sites reads it.
CREATE TABLE IF NOT EXISTS admin_issues (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  note       TEXT,
  link       TEXT,                          -- optional: an admin path or an external URL
  country    TEXT,                          -- NULL = both sites; else 'DK' / 'UK'
  status     TEXT NOT NULL DEFAULT 'open',  -- open | done
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_issues_status ON admin_issues(status, id);

-- /admin/sager lists schools waiting on a photo-permission reply.
CREATE INDEX IF NOT EXISTS idx_schools_photo_permission ON schools(photo_permission);
