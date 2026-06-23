-- Karriere-tidslinje pr. atlet: kildebelagte begivenheder (priser, mesterskaber,
-- rekorder) der kan berige fremtidige artikler ("anden sæson i træk som All-American").
CREATE TABLE IF NOT EXISTS athlete_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL,
  occurred_on TEXT,             -- ISO-dato
  season TEXT,                  -- "2025-26"
  kind TEXT NOT NULL,           -- award | championship | record | result | transfer | other
  award_name TEXT,              -- kanonisk, fx "All-American"
  summary TEXT NOT NULL,        -- kort menneske-læsbar
  significance TEXT NOT NULL,   -- routine | notable | honor
  source_url TEXT,
  article_id INTEGER,
  created_at TEXT
);
-- Dedup: samme pris i samme sæson tælles én gang (award_name=NULL → flere tilladt).
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_events_dedup
  ON athlete_events(athlete_id, award_name, season);
CREATE INDEX IF NOT EXISTS idx_athlete_events_athlete ON athlete_events(athlete_id);
