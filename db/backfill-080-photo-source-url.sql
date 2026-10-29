-- Backfill for migration-080: copy the source page of each athlete's CURRENT approved photo
-- onto athletes.photo_source_url, so existing photos get their "Source" link too.
--
-- NOT for scripts/migrate-live.sh (it refuses UPDATE by design). Run it by hand, once,
-- AFTER migration-080, when Mikkel says so:
--   npx wrangler d1 execute studentathlete-dk --remote --file=db/backfill-080-photo-source-url.sql
--
-- Only rows where the approved suggestion's image IS the photo on the athlete now: a photo
-- replaced by hand in admin has another origin, and gets no link. Idempotent (fills NULLs only).
-- Touches at most one row per athlete with a photo: UNIQUE(athlete_id, image_url) on
-- photo_suggestions makes the match unique, and its autoindex serves the join.
UPDATE athletes
   SET photo_source_url = ps.source_url
  FROM (SELECT athlete_id, image_url, source_url
          FROM photo_suggestions
         WHERE status = 'approved' AND source_url IS NOT NULL AND source_url <> '') AS ps
 WHERE ps.athlete_id = athletes.id
   AND ps.image_url = athletes.photo_url
   AND athletes.photo_source_url IS NULL;
