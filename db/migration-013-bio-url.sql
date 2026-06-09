-- Migration 013: officielt team-bio-link pr. atlet.
-- Udfyldes af roster-scraperen (href fra spillerens navn på roster-siden, opløst
-- til absolut URL) og vises på atletprofilen som link til den officielle skole-bio.
ALTER TABLE athletes ADD COLUMN bio_url TEXT;
