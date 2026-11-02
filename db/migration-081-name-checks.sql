-- Nordic name check (2026-11-02), pipeline/checks/name-check.ts.
-- US rosters drop ø/æ/å, and the scraper copies the plain spelling («Thogersen» for
-- Thøgersen). The check looks at each Nordic athlete once, when they first appear, and
-- records the verdict here so the nightly run reads nothing it has already judged.
-- Additive only, so scripts/migrate-live.sh accepts it.
CREATE TABLE IF NOT EXISTS name_checks (
  athlete_id    INTEGER PRIMARY KEY REFERENCES athletes(id),
  verdict       TEXT NOT NULL,       -- ok | suspect | fixed | dismissed
  suggested     TEXT,                -- the spelling the check proposes (suspect/fixed only)
  confidence    TEXT,                -- high | medium
  source        TEXT NOT NULL,       -- has-diacritics | llm
  name_at_check TEXT NOT NULL,       -- the spelling that was judged
  checked_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_name_checks_verdict ON name_checks(verdict);
