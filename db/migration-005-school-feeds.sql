-- Migration 005: Skole-baserede nyhedsfeeds
-- Overvåg hver skoles nyhedsfeed i stedet for per-atlet kilder.
-- Kør med: wrangler d1 execute studentathlete-dk --file=db/migration-005-school-feeds.sql --remote

ALTER TABLE schools ADD COLUMN news_feed_url TEXT;
ALTER TABLE schools ADD COLUMN news_feed_type TEXT;  -- 'rss' | 'html'
ALTER TABLE schools ADD COLUMN news_last_checked_at TEXT;
