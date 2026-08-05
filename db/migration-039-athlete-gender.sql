-- Migration 039: atletens køn.
--
-- Baggrund: den første britiske kladde omtalte en kvindelig atlet som "he" og
-- placerede hende på universitetets HERREhold, fordi kildeartiklen lå i skolens
-- herre-sektion. Modellen havde intet at gå efter — der stod ingen kønsoplysning
-- i basen — så den gættede ud fra kilden.
--
-- Oplysningen ER kendt: holdets URL siger det selv (/sports/womens-track-and-field/).
-- Den hører derfor i data, ikke i en promptregel.
--
-- 'f' | 'm' | NULL. NULL betyder "ved det ikke" (fx idrætter med ét hold), og
-- prompten beder da modellen undgå stedord helt frem for at gætte.

ALTER TABLE athletes ADD COLUMN gender TEXT;

CREATE INDEX IF NOT EXISTS idx_athletes_gender ON athletes(gender);
