-- Migration 075: the assignment desk's decisions (2026-10-27, Mikkel: «Yes» to
-- the editor in shadow mode). pipeline/editor/assignment-desk.ts decides what
-- each incoming story becomes (article / line / fold / skip / hold) before a
-- draft is written. In shadow mode nothing reads these rows but the report:
-- drafting goes on as before, and the desk is measured against what happened.
-- Additive.
-- mode: 'shadow' (the scheduled run) or 'backtest' (past stories, decided as of
-- their discovery). A story can carry one of each.
CREATE TABLE IF NOT EXISTS desk_decisions (
  story_id     INTEGER NOT NULL,
  decision     TEXT    NOT NULL,     -- article | line | fold | skip | hold
  article_type TEXT,                 -- article only
  priority     INTEGER,              -- article only, 1-5
  angle        TEXT,                 -- article only
  line         TEXT,                 -- line only: the profile sentence
  fold_into    TEXT,                 -- fold only: "story:<id>" or "article:<id>"
  reason       TEXT,
  model        TEXT,
  mode         TEXT    NOT NULL DEFAULT 'shadow',
  decided_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (story_id, mode)
);
CREATE INDEX IF NOT EXISTS idx_desk_decided_at ON desk_decisions(decided_at);

-- The desk reads the last days' stories; without this every run scans the table.
CREATE INDEX IF NOT EXISTS idx_stories_discovered ON stories(discovered_at);
