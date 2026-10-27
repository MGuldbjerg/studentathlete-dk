-- Migration 076 (2026-10-27, Mikkel: «Yes, add the reject reason»).
--
-- review_log: WHY a draft was rejected. 178 rejects so far carry no reason, so
-- the editorial brief (pipeline/editor/brief.md) had to guess them from titles.
-- reject_reason is a code from src/lib/reject-reasons.ts (the /admin dropdown;
-- 'claude_editor' when Claude rejected it), reject_note free text.
--
-- desk_decisions.est_words: the desk's estimate of how long an honest article
-- the story carries — Mikkel's rule: 250+ an article, 200-249 if big, else a line.
-- Additive.
ALTER TABLE review_log ADD COLUMN reject_reason TEXT;
ALTER TABLE review_log ADD COLUMN reject_note TEXT;
ALTER TABLE desk_decisions ADD COLUMN est_words INTEGER;
