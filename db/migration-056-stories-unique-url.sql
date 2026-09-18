-- Migration 056: afdubletteringen havde intet at ignorere.
--
-- `check-sources.ts` indsætter historier med INSERT OR IGNORE og en `url_hash`,
-- og kommentaren i koden gik ud fra, at dubletter dermed blev droppet i stilhed.
-- Det gjorde de aldrig: `idx_stories_url_hash` (migration 001) er et ALMINDELIGT
-- indeks. Uden en unik nøgle er der intet at bryde, og OR IGNORE ignorerer
-- ingenting.
--
-- Det viste sig 18. september 2026, hvor Nathan Hopley stod to gange i
-- kladdekøen med samme turnering fra samme kilde-artikel — den ene fundet som
-- http://, den anden som https://. To fejl på én gang: hashen lå over den RÅ
-- adresse (rettet i pipeline/lib/story-url.ts), og selv hvis den havde matchet,
-- ville indsættelsen være gået igennem.
--
-- Der var kun ÉN dubletgruppe i 1.169 historier, og den overskydende række
-- havde ingen artikel hængende. Den er fjernet, og hashene er regnet om til den
-- normaliserede form, før dette indeks blev lagt på — ellers ville det fejle.
DROP INDEX IF EXISTS idx_stories_url_hash;
CREATE UNIQUE INDEX idx_stories_url_hash ON stories(url_hash);
