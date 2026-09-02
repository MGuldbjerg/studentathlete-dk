-- Migration 048: statistik til planlæggeren, og de to indekser
-- omskrivningerne læner sig på.
--
-- 047 lagde de rigtige indekser, men et indeks er kun det halve svar. SQLite
-- vælger indgang ud fra GÆT, når der ikke findes statistik: uden `sqlite_stat1`
-- antager planlæggeren at ethvert indeks er lige selektivt, og valgte derfor
-- `idx_athletes_active` — hvor `active = 1` matcher hver eneste atlet — frem
-- for det sammensatte indeks, der ville have afgrænset opslaget.
--
-- `ANALYZE` skriver de faktiske fordelinger ned, så valget træffes på tal.
-- Den rører ingen af projektets egne tabeller: den fylder kun `sqlite_stat1`,
-- som planlæggeren læser, og kan køres igen når som helst. Kør den igen efter
-- store dataændringer — fx når et nyt land eller en ny division fylder
-- `athletes` op — ellers står statistikken og beskriver en base vi ikke har.

-- Landets aktive atleter MED universitetsnavnet i selve indekset. Så kan
-- underforespørgslen i `getAllSchoolSlugs` og grupperingen i
-- `getSchoolsWithAthletes` besvares uden at røre tabellen én gang.
CREATE INDEX IF NOT EXISTS idx_athletes_country_active_uni
  ON athletes(home_country, active, university);

-- Den afledte tabel i `scrape-js-rosters`: aktive atleter uden bio_url,
-- grupperet pr. universitet. Erstatter den korrelerede underforespørgsel,
-- der gennemgik athletes to gange pr. roster_check.
CREATE INDEX IF NOT EXISTS idx_athletes_active_uni_bio
  ON athletes(active, university, bio_url);

ANALYZE;
