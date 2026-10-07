-- Migration 062: weekly awards from conference releases are told apart by date.
--
-- Migration 060's key separates repeated weekly awards by ARTICLE: one row per
-- (athlete, award, season, article). The conference-honours harvest
-- (pipeline/scrape/scrape-conference-honors.ts, 2026-10-07) records weekly
-- awards with no article — they come from the conference's own release, dated
-- by the week. Under 060's key every such row in a season collides, so three
-- Player of the Week wins in one season would be stored as one.
--
-- New key, weekly awards only: the article when there is one, else the date.
-- The weekly list gains the two names conference releases use ("Honor Roll",
-- "Crew of the Week"; src/lib/athlete-events.ts WEEKLY_AWARDS).
--
-- No rows change. The new key is strictly finer than 060's (it never puts two
-- rows that 060 kept apart into one group), so building it cannot fail on
-- existing data. It is still NOT additive — it drops an index — so it runs by
-- hand with Mikkel's go-ahead, not through migrate-live.sh.

DROP INDEX IF EXISTS idx_athlete_events_dedup2;
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_events_dedup3 ON athlete_events(
  athlete_id, award_name, COALESCE(season, ''),
  (CASE WHEN award_name IN ('Player of the Week', 'Rookie of the Week/Month', 'Ugens spiller',
                            'Honor Roll', 'Crew of the Week')
        THEN COALESCE(CAST(article_id AS TEXT), occurred_on, '-1') ELSE '-1' END)
);
