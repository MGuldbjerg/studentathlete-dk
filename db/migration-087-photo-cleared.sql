-- Athlete-level photo permission (McKendree, 2026-11-09): a school in state
-- 'athlete_list' allows photos only of athletes it approved by name. 1 = approved;
-- NULL = not (yet). Read by src/lib/photo-permission.ts; set by
-- pipeline/photos/request-permission.ts --clear.
ALTER TABLE athletes ADD COLUMN photo_cleared INTEGER;
