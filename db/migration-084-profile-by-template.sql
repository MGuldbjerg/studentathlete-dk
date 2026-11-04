-- Migration 084: which profile texts did the template write?
-- UK profiles are approved on the template level (Mikkel 2026-11-04):
-- pipeline/profiles/apply-template-profiles.ts may replace a text only when the
-- template wrote it (1). A text a person approved or edited in /admin/profiler
-- is 0; NULL = unknown, treated as a person's. Backfilled separately for the
-- UK texts that were identical to the template output on 2026-11-04.
ALTER TABLE athletes ADD COLUMN profile_by_template INTEGER;
