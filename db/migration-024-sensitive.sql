-- Migration 024: følsomheds-flag på stories (presseetik-værn)
-- Sat af detectSensitive() ved discovery: 'crime' | 'discipline' | 'eligibility'
-- | 'personal' | NULL (normal historie). Flagede historier får rød FØLSOM-badge
-- i admin-kladdelisten og en nøgternheds-instruks i genererings-prompten.
ALTER TABLE stories ADD COLUMN sensitive TEXT;
