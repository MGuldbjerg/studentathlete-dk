-- Migration 078 (2026-10-27). Additive.
--
-- llm_usage: every Claude call on the subscription by the desk and the Opus
-- editor (pipeline/lib/claude-run.ts) — Mikkel: «keep track of usage and not
-- exhaust everything immediately». account = primary | fallback | local.
CREATE TABLE IF NOT EXISTS llm_usage (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  at            TEXT    NOT NULL DEFAULT (datetime('now')),
  job           TEXT    NOT NULL,
  account       TEXT    NOT NULL,
  model         TEXT,
  ok            INTEGER NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  error         TEXT
);
CREATE INDEX IF NOT EXISTS idx_llm_usage_at ON llm_usage(at);

-- The athlete's own merchandise store (Influxer), verified by name AND school
-- on the store page (pipeline/profiles/merch-stores.ts). Shown on the profile
-- with click tracking (click_kind 'merch').
ALTER TABLE athletes ADD COLUMN merch_url TEXT;
ALTER TABLE athletes ADD COLUMN merch_checked_at TEXT;
