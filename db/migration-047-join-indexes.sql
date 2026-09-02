-- Migration 047: indekser til de to joins der læste basen tom.
--
-- D1 læste 150–275 MILLIONER rækker i døgnet i en uge, på 13–45.000
-- forespørgsler — altså ~11.000 rækker pr. forespørgsel. Det var ikke trafik.
-- Det var to joins mellem `athletes` og `schools`, som begge foregår på en
-- STRENG (`athletes.university = schools.name`), og som ingen af de
-- eksisterende enkeltkolonne-indekser kunne bære:
--
--   1) SELECT DISTINCT s.slug FROM schools s JOIN athletes a
--        ON a.university = s.name AND a.active = 1 AND a.home_country = ?
--      → planen var «SEARCH a USING INDEX idx_athletes_active (active=?)»,
--        og active=1 matcher HVER eneste atlet. Derefter SCAN af alle skoler
--        pr. atlet: 437.768 læste rækker for at levere 171. 81 kald i døgnet
--        = 188 mio. rækker, den enkeltstørste post i hele basen.
--
--   2) FROM athletes a LEFT JOIN schools s ON s.name = a.university
--      → `schools.name` havde INTET indeks (kun slug er unik), så hver atlet
--        kostede en fuld skanning af 1.761 skoler: 4,7 mio. rækker pr. kald.
--
-- Begge er dækket herunder. Indekser ændrer ingen data og kan droppes igen.

-- Joinet drevet fra skolen: universitet + de to felter der altid står med.
CREATE INDEX IF NOT EXISTS idx_athletes_uni_active_country
  ON athletes(university, active, home_country);

-- Landesiderne og statistikkerne: «alle aktive i ét land», ofte pr. sport.
CREATE INDEX IF NOT EXISTS idx_athletes_country_active_sport
  ON athletes(home_country, active, sport);

-- Joinet den anden vej. Navnet er ikke unikt i skemaet, så det er et
-- almindeligt indeks — men det fjerner skanningen.
CREATE INDEX IF NOT EXISTS idx_schools_name
  ON schools(name);
