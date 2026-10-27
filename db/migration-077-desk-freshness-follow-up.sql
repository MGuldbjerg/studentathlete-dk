-- Migration 077 (2026-10-27): what Mikkel's answers to the desk's hypotheticals
-- added to a decision (pipeline/editor/brief.md).
--   event_date: the day the event happened — a story is fresh for 1 day after a
--               goal/assist/placing, 3 days after bigger news (to the day it was found)
--   follow_up:  big news on thin material stays a line, with what a human could
--               ask the athlete or coach to make it an article
-- Additive.
ALTER TABLE desk_decisions ADD COLUMN event_date TEXT;
ALTER TABLE desk_decisions ADD COLUMN follow_up TEXT;
