-- Photo credit with photographer and source link (2026-10-29).
-- The photo-permission email (pipeline/photos/permission-email.ts) promises schools that,
-- next to the photo, we name the photographer where their site gives one, along with
-- "{School} Athletics", and link to the source. Until now the source URL stayed on
-- photo_suggestions and never reached the athlete, so the profile could not link it.
--
-- Additive only, so scripts/migrate-live.sh accepts it. The backfill of the existing
-- approved photos is an UPDATE, which that script refuses by design: it lives in
-- db/backfill-080-photo-source-url.sql, to run by hand after this file (Mikkel's call).
ALTER TABLE athletes ADD COLUMN photo_source_url TEXT;    -- page the photo came from, linked as "Source"
ALTER TABLE athletes ADD COLUMN photo_photographer TEXT;  -- photographer, when the school's page names one
ALTER TABLE photo_suggestions ADD COLUMN photographer TEXT; -- filled by suggest-photos.ts later; copied on approval
