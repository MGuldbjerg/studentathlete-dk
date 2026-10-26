-- The old seed rows that athletes still point at («University of Texas» …) had
-- lost the team name and city their approved profile texts show; the full-name
-- rows carry them. Mikkel 2026-10-26 («Clean up»).
UPDATE schools SET common_name = 'Texas', nickname = 'Longhorns', city = 'Austin' WHERE id = 36 AND name = 'University of Texas' AND nickname IS NULL;
UPDATE schools SET common_name = 'Illinois', nickname = 'Fighting Illini', city = 'Urbana' WHERE id = 44 AND name = 'University of Illinois' AND nickname IS NULL;
UPDATE schools SET nickname = 'Hoosiers', city = 'Bloomington' WHERE id = 21 AND name = 'Indiana University' AND nickname IS NULL;
