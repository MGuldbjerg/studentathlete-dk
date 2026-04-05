-- Migration 007: Tilføj class_year og expected_graduation til athletes
-- class_year: Rå streng fra roster ("Jr.", "R-So.", "Gr." osv.)
-- expected_graduation: Fire-cifret årstal (2027, 2028 osv.)

ALTER TABLE athletes ADD COLUMN class_year TEXT;
ALTER TABLE athletes ADD COLUMN expected_graduation INTEGER;
