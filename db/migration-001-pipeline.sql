-- Migration 001: Pipeline-tabeller for content pipeline
-- Kør med: bash scripts/migrate.sh

-- Tilføj pipeline-kolonner til articles
ALTER TABLE articles ADD COLUMN source_url TEXT;
ALTER TABLE articles ADD COLUMN story_id INTEGER REFERENCES stories(id);
ALTER TABLE articles ADD COLUMN model_used TEXT;
ALTER TABLE articles ADD COLUMN tokens_input INTEGER;
ALTER TABLE articles ADD COLUMN tokens_output INTEGER;

-- Kilder der overvåges per atlet/skole
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER REFERENCES athletes(id),
  school_id INTEGER REFERENCES schools(id),
  url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'athletics_page',
  check_interval_hours INTEGER NOT NULL DEFAULT 6,
  last_checked_at TEXT,
  last_found_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fundne historier (kandidater til artikler)
CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER REFERENCES athletes(id),
  source_id INTEGER REFERENCES sources(id),
  source_url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,
  headline TEXT,
  summary TEXT,
  content_raw TEXT,
  source_type TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

-- Pipeline-kørselspor
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_type TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  items_processed INTEGER DEFAULT 0,
  items_found INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sources_athlete ON sources(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sources_school ON sources(school_id);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources(active);
CREATE INDEX IF NOT EXISTS idx_stories_athlete ON stories(athlete_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_url_hash ON stories(url_hash);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_type ON pipeline_runs(run_type);
