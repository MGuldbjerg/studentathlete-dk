-- Team context per athlete (PLAN-content-floor-uk.md, P2, 2026-10-26): the team's
-- record, totals and latest game, the athlete's rank on the team and the games they
-- scored in — JSON, read by src/lib/team-context.ts. Written by the daily stats fill
-- from the stats page it already fetches. Additive; NULL until the next fill.
ALTER TABLE athlete_season_stats ADD COLUMN team TEXT;
