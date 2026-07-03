-- Migration 025: author_role på articles (forberedelse til frivillige/freelancere)
-- NULL = AI-genereret/redaktionen (default; Ai-disclaimer vises).
-- 'human' = menneskelig bidragyder (interview/feature) → Ai-disclaimeren vises IKKE,
-- og bylinen ("Af <author>") er personens navn.
ALTER TABLE articles ADD COLUMN author_role TEXT;
