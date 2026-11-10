-- Conditional photo permissions (src/lib/photo-permission.ts).
--
-- athlete_list (McKendree, 2026-11-09): photos only of athletes the school approved
-- by name. 1 = approved; NULL = not (yet).
ALTER TABLE athletes ADD COLUMN photo_cleared INTEGER;
--
-- photographer_list (Rockhurst, 2026-11-10): photos only by approved photographers,
-- a ';'-list stored lower-case; photo_unnamed_ok = 1 lets photos without a named
-- photographer through (e.g. the school's own roster headshots).
ALTER TABLE schools ADD COLUMN photo_photographers TEXT;
ALTER TABLE schools ADD COLUMN photo_unnamed_ok INTEGER;
-- All three are set by pipeline/photos/request-permission.ts (--clear, --photographers).
