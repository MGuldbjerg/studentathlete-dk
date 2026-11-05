-- Migration 085: a real photo on an article (Mikkel, 2026-11-05).
--
-- Until now every article page showed the generated match card as its hero.
-- Schools that granted photo permission (photo_events, migration 068) allow the
-- photos that accompany their own articles, credited to the photographer, with
-- "{School} Athletics" and a link to the source article. These columns hold that.
--
-- photo_school is the school's official name (schools.name): the page reads its
-- photo_permission at render time, so a later decline removes the photo at once,
-- exactly like athlete photos (src/lib/photo-permission.ts).
--
-- Additive only (scripts/migrate-live.sh). The card stays the og:image and the
-- list thumbnail; only the article page's hero changes.
ALTER TABLE articles ADD COLUMN photo_url TEXT;           -- public URL (media bucket)
ALTER TABLE articles ADD COLUMN photo_photographer TEXT;  -- as the school's page names them
ALTER TABLE articles ADD COLUMN photo_school TEXT;        -- schools.name of the rights holder
ALTER TABLE articles ADD COLUMN photo_source_url TEXT;    -- the school article the photo came from
