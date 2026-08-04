-- Migration 036: trafikkilde på events.
--
-- Baggrund: den separate /ig-landingsside blev nedlagt til fordel for arkivet
-- (/artikler). Den kanalmåling siden ANGIVELIGT gav, gav den aldrig — classify()
-- loggede /ig som en sportsside ved navn "ig". Kilden måles nu eksplicit i
-- stedet: delte links får ?kilde=… (fx Instagram-bio'ens /artikler?kilde=ig),
-- og værdien gemmes her.
--
-- Kun pageviews sætter source, og kun når parameteren faktisk er til stede.
-- Værdien saniteres i /api/track (små bogstaver, [a-z0-9_-], maks 40 tegn), så
-- kolonnen ikke kan bruges til at smugle vilkårlig tekst ind.
-- Ingen PII: dette er et kanalnavn, ikke en bruger.

ALTER TABLE events ADD COLUMN source TEXT;

CREATE INDEX IF NOT EXISTS idx_ev_source ON events(source, created_at);
