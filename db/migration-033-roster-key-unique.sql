-- Migration 033: gør skolens spiller-id til en HÅRD garanti mod dubletter.
--
-- KØR FØRST migration 032 + flet eksisterende dubletter:
--   npx tsx pipeline/report/backfill-roster-keys.ts --apply
--   npx tsx pipeline/report/dedup-athletes.ts --apply
-- Ellers fejler indeks-oprettelsen på de eksisterende kollisioner (det er
-- meningen — en fejl her betyder "der er stadig dubletter").
--
-- NULL'er er distinkte i SQLite, så de ~45% atleter uden numerisk spiller-id
-- i bio_url'en rammes ikke af begrænsningen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_roster_key_unique
  ON athletes(roster_key) WHERE roster_key IS NOT NULL;
