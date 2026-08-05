-- Migration 040: spor for et opslag der er trukket tilbage.
--
-- 2026-08-05 postede den danske Facebook-side og Bluesky-konto en BRITISK
-- artikel midt i UK-sitets dark launch (kanalerne kendte ikke deres land).
-- Opslagene blev fjernet igen — og dét skal kunne ses. `expired` betyder
-- "nåede aldrig ud", `deleted` betyder "var ude, og blev trukket tilbage".
-- De to må ikke forveksles, hverken i statistik eller i en senere gennemgang.

ALTER TABLE social_posts ADD COLUMN deleted_at TEXT;
