-- A daily copy of each athlete's season numbers (2026-10-22). The leaderboard
-- shows movement against a week ago, and a milestone (5th, 10th goal of the
-- season) is the day the number crosses it — both need yesterday's figures,
-- which athlete_season_stats overwrites. Written by fill-season-stats.ts, one
-- row per athlete with stats per day (~1,000 rows a day).
CREATE TABLE IF NOT EXISTS athlete_season_stats_history (
  athlete_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  day TEXT NOT NULL,           -- YYYY-MM-DD, the fill's date
  games INTEGER NOT NULL,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  shutouts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (athlete_id, season, day)
);
CREATE INDEX IF NOT EXISTS idx_stats_history_day ON athlete_season_stats_history(season, day);
