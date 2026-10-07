-- National team rankings from NCAA.com (PLAN-richer-articles.md, step 5.1,
-- 2026-10-07). pipeline/stats/ncaa-rankings.ts keeps the top of each national
-- table here once a day; generate-articles reads a school's placings through
-- team_key. One snapshot: each run replaces its own (sport, division, stat).
CREATE TABLE IF NOT EXISTS team_rankings (
  sport TEXT NOT NULL,        -- NCAA.com slug: soccer-men, soccer-women, fieldhockey, volleyball-women, basketball-men, basketball-women
  division TEXT NOT NULL,     -- d1 | d2 | d3
  stat TEXT NOT NULL,         -- as NCAA.com names it: «Scoring Offense»
  rank INTEGER NOT NULL,      -- a tie («-» on the page) shares the rank above it
  tied INTEGER NOT NULL DEFAULT 0,
  team TEXT NOT NULL,         -- as NCAA.com writes it: «Missouri St.»
  team_key TEXT NOT NULL,     -- normalised for an exact match: «missouri state»
  value TEXT NOT NULL,        -- the table's last column
  value_label TEXT,           -- that column's header: «Per Game», «Pct», «GAA»
  games INTEGER,
  fetched_on TEXT NOT NULL,   -- YYYY-MM-DD: the table's «through games» date, what its numbers are true as of
  PRIMARY KEY (sport, division, stat, team)
);
CREATE INDEX IF NOT EXISTS idx_team_rankings_key ON team_rankings(team_key, sport, division);
