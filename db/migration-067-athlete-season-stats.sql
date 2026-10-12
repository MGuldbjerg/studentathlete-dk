-- Each athlete's current-season statistics from the school's own stats page
-- (PLAN-adsense-uk.md, 2026-10-12). pipeline/stats/fill-season-stats.ts fetches
-- each team's stats page once and writes a row for every athlete of ours on it;
-- the profile shows the row, and an athlete with one is a public, indexed
-- profile even before we have written about them (CountryProfile rules).
-- One row per athlete and season; each run replaces its own rows.
CREATE TABLE IF NOT EXISTS athlete_season_stats (
  athlete_id INTEGER NOT NULL,
  season TEXT NOT NULL,        -- "2026-27" (seasonFromDate)
  sport TEXT NOT NULL,
  kind TEXT NOT NULL,          -- outfield | keeper
  games INTEGER NOT NULL,      -- gp; rows are written only from 1 upwards
  cells TEXT NOT NULL,         -- JSON: the athlete's row, column header → value, as the page has it
  line TEXT,                   -- the English records sentence (season-stats.ts seasonLine)
  school TEXT NOT NULL,        -- the name the stats page goes by
  source_url TEXT NOT NULL,    -- the stats page
  fetched_on TEXT NOT NULL,    -- YYYY-MM-DD: what the numbers are true as of
  PRIMARY KEY (athlete_id, season)
);
