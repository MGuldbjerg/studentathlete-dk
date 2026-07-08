-- Migration 031: profiludkast på athletes — sommer-jobbet (pipeline/profiles/
-- expand-profiles.ts) skriver LLM-udkast hertil; en godkendelse i /admin/profiler
-- flytter udkastet til profile_summary (live) og nulstiller draft-felterne.
-- INGEN auto-publish: profile_summary skrives KUN af admin-godkendelsen.
ALTER TABLE athletes ADD COLUMN profile_draft TEXT;
ALTER TABLE athletes ADD COLUMN profile_draft_at TEXT;
