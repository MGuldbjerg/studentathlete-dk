-- Skolefarver til genererede kampkort (IDEA-billeder.md niveau 1).
-- primary_color sættes af pipeline/scrape/school-colors.ts (regelbaseret backfill)
-- og kan rettes manuelt i admin → Skoler. secondary_color er altid manuel.
ALTER TABLE schools ADD COLUMN primary_color TEXT;
ALTER TABLE schools ADD COLUMN secondary_color TEXT;
