-- A school's own credit for its roster headshots (2026-11-18). Barry granted photo
-- permission on the condition: «Credit all head shots to Michelle Murch/Barry Athletic
-- Communications». NULL = the default "{School} Athletics", no photographer.
-- Set by pipeline/photos/request-permission.ts --headshot-credit (which also rewrites the
-- school's existing headshots); read by pipeline/scrape/suggest-photos.ts for new ones.
ALTER TABLE schools ADD COLUMN photo_headshot_credit TEXT;
ALTER TABLE schools ADD COLUMN photo_headshot_photographer TEXT;
