-- Multi-day tournaments (PLAN-richer-articles.md, step 2, 2026-10-07).
-- A golf or tennis day report folded into another story's article points at
-- that article, so the review tools (draft dossier, /admin/tjek) show its
-- source next to the main one instead of calling its facts unsourced.
ALTER TABLE stories ADD COLUMN merged_into INTEGER;
CREATE INDEX IF NOT EXISTS idx_stories_merged_into ON stories(merged_into);

-- Cost rule (Mikkel, 2026-10-07): generate-articles looks articles up by
-- story_id and by source_url once per story per run, and both read the whole
-- table. D1 bills rows scanned.
CREATE INDEX IF NOT EXISTS idx_articles_story ON articles(story_id);
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON articles(source_url);
