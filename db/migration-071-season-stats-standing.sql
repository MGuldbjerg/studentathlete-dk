-- Where the player stands among the site's players (PLAN-content-floor-uk.md, P3,
-- 2026-10-26): national and division rank in goals/assists/clean sheets among
-- everyone with stats on file — JSON, read by src/lib/standing.ts. Written daily by
-- the stats fill after the leaderboard. Additive; NULL until the next fill.
ALTER TABLE athlete_season_stats ADD COLUMN standing TEXT;
