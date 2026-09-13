-- Migration 052: a generation failure must be counted, not repeated forever.
--
-- 13 September 2026 the same two stories — 5153 (Luca Rosen) and 4914 (Filippa
-- Mortensen) — failed in all three runs of the day. The cause was the empty
-- slug (see the "Afbrudt JSON" commit), but the SYMPTOM outlived the cause:
-- a technical failure sets the story back to 'new', so the next run picks it
-- up, spends a model call on it, and fails again. Nothing in the run said
-- "this one has been here before", and nothing ever stopped.
--
-- Same reasoning as fact_attempts (050): one failed attempt is not evidence
-- about the story — a truncated answer is the weather. Repetition is evidence.
-- Three attempts, then the story gets status 'gen_failed' and stops competing
-- for a slot with stories that have never been tried.
--
-- Counted ONLY on technical failure (truncated JSON, unusable headline, a
-- thrown error). A story the quote or identity guard rejects is already
-- terminal at 'rejected' — that is a verdict, not a retry.
ALTER TABLE stories ADD COLUMN gen_attempts INTEGER NOT NULL DEFAULT 0;

-- The generator selects on (status, fact_status) and now orders by attempts.
CREATE INDEX IF NOT EXISTS idx_stories_gen_attempts ON stories(status, fact_status, gen_attempts);
