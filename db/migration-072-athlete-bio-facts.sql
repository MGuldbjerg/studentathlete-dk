-- Background facts from the athlete's official bio page (PLAN-content-floor-uk.md,
-- P4, 2026-10-26): high school, previous school, major, height and the date read —
-- JSON, read by src/lib/bio-facts.ts, written by pipeline/profiles/bio-facts.ts.
-- Additive; NULL = not read yet.
ALTER TABLE athletes ADD COLUMN bio_facts TEXT;
