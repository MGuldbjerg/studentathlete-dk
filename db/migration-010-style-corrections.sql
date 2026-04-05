-- Migration 010: Stilguide — redaktionelle rettelser
-- Opsamler forkert→korrekt-par der injiceres i system-prompten ved artikelgenerering.

CREATE TABLE IF NOT EXISTS style_corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wrong_phrase TEXT NOT NULL,
  correct_phrase TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'oversaettelse',
  note TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_style_corrections_active ON style_corrections(active);

ALTER TABLE articles ADD COLUMN original_content TEXT;
