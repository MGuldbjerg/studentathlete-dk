-- Migration 006: Tilføj photo_credit-kolonnen til athletes
-- Bruges af updateAthletePhoto() i admin.ts

ALTER TABLE athletes ADD COLUMN photo_credit TEXT;
