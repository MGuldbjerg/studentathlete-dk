-- Migration 009: Foretrukket navn til atleter (til konsistent brug i artikler)
ALTER TABLE athletes ADD COLUMN preferred_name TEXT;
