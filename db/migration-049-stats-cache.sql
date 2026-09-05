-- Migration 049: a tiny cache for the aggregates the site renders on every page.
--
-- WHY. Measured 2026-09-05, the three aggregate scans over `athletes` were
-- 43 % of the day's D1 rows read (821k of 1.93M) in only 280 runs:
--
--   sport counts       396,126 rows / 108 runs = 3,667 per run
--   site totals        215,248 rows / 112 runs = 1,921 per run
--   A-Z initials       210,363 rows /  60 runs = 3,506 per run
--
-- There are 2,823 active athletes. Each of those runs walks nearly the whole
-- set to produce a handful of numbers. `idx_athletes_country_active_uni` is
-- used, but it covers neither `sport` nor `name`, so every matching row still
-- has to be visited — an index cannot fix this. The answer is not to ask the
-- question 280 times a day when it changes at most a few times a day.
--
-- The row is read on render (1 row) and rewritten by whoever first finds it
-- older than the TTL. That keeps it $0 and needs no cron: a stale cache heals
-- itself on the next page view. See `cachedStat()` in src/lib/db.ts.
--
-- Cache only. Nothing here is a source of truth, and dropping the table costs
-- nothing but a slow first render.

CREATE TABLE IF NOT EXISTS stats_cache (
  key         TEXT NOT NULL,          -- 'sport_counts' | 'site_counts' | 'initials'
  country     TEXT NOT NULL,          -- the site the number belongs to
  value       TEXT NOT NULL,          -- JSON, shaped by the caller
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (key, country)
);
