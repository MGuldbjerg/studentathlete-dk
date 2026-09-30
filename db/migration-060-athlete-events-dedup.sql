-- Migration 060: one timeline row per real event.
--
-- The unique index from migration 023 was (athlete_id, award_name, season), and
-- SQLite treats NULLs as distinct — so every bio-page scrape with no season added
-- the same honours again. Measured 2026-09-30: 4,798 of ~5,730 rows were
-- duplicates (Nathan Woodham had "Player of the Year" 13 times). The same key
-- also collapsed recurring weekly awards: two Player of the Week wins in one
-- season became one row, so "his second this season" could never be counted.
--
-- New key: athlete + award + season (NULL counted as one value), plus the article
-- for WEEKLY awards only (src/lib/athlete-events.ts WEEKLY_AWARDS) — a season
-- honour mentioned in three articles is still one honour.
--
-- NOT additive (drops an index, deletes rows), so it runs by hand with
-- Mikkel's go-ahead (2026-09-30), not through migrate-live.sh.

-- 1. The Lamar "All-America Scholars" article became an athletic All-American
--    in 2026-27 for Woodham (#445). It is academic, for the season just ended.
UPDATE athlete_events SET award_name = 'Academic All-American', season = '2025-26'
 WHERE id = 19 AND source_url LIKE '%all-america-scholars%';
DELETE FROM athlete_events WHERE id = 20 AND source_url LIKE '%all-america-scholars%';

-- 2. Keep the oldest row of each group under the new key.
DELETE FROM athlete_events WHERE id NOT IN (
  SELECT MIN(id) FROM athlete_events
  GROUP BY athlete_id, award_name, COALESCE(season, ''),
    CASE WHEN award_name IN ('Player of the Week', 'Rookie of the Week/Month', 'Ugens spiller')
         THEN COALESCE(article_id, -1) ELSE -1 END
);

-- 3. Swap the index.
DROP INDEX IF EXISTS idx_athlete_events_dedup;
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_events_dedup2 ON athlete_events(
  athlete_id, award_name, COALESCE(season, ''),
  (CASE WHEN award_name IN ('Player of the Week', 'Rookie of the Week/Month', 'Ugens spiller')
        THEN COALESCE(article_id, -1) ELSE -1 END)
);
