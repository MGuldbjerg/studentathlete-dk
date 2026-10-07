-- Awards as an added section on the match report (PLAN-richer-articles.md,
-- step 2, 2026-10-07). A pending addition is a draft row with
-- article_type 'addition' that points at the article it will be appended to.
-- See src/lib/article-addition.ts.
ALTER TABLE articles ADD COLUMN parent_article_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_articles_parent ON articles(parent_article_id);
