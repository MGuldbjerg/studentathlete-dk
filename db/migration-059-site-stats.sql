-- Migration 059: the stats page's numbers, computed once a day.
--
-- /statistik and /statistics show active athletes by gender, sport, division
-- and (UK) home nation. Counting ~2,800 rows and resolving hometowns in the
-- page measured 15 ms of CPU on a cold start — over Workers' 10 ms ceiling —
-- so `pipeline/report/build-stats.ts` computes it daily (stats-daily.yml) and
-- the page reads one row. One row per site; `data` is the SiteStats JSON from
-- src/lib/athlete-stats.ts.

CREATE TABLE IF NOT EXISTS site_stats (
  country     TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  computed_at TEXT NOT NULL
);
