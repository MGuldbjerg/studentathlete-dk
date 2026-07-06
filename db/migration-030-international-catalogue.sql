-- Migration 030: international_athletes — ekspansions-katalog (prep, IKKE live)
-- Adskilt fra site-tabellerne: INGEN kode på websitet læser den. Formålet er at lade
-- det månedlige job akkumulere ALLE internationale NCAA-atleter (ikke kun danskere)
-- over tid, så vi ved launch af et sprogmarked har (a) empiriske land-tal til
-- pool-vs-eget-site-beslutningstræet og (b) en fyldt inventar-DB fra dag ét.
-- Nationalitets-PRÆCISION per land er BEVIDST udskudt til launch (jf. expansion-playbook);
-- her lagres grov land-tag + sprog/region fra classifyHometown + country-language-mappet.
CREATE TABLE IF NOT EXISTS international_athletes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL,        -- normaliseret navn til dedup (lowercase, samlet whitespace)
  home_country TEXT NOT NULL,        -- fra classifyHometown (grov; forfines per marked ved launch)
  language     TEXT,                 -- redaktionel enhed (én redaktør pr. sprog) — kan spænde flere regioner
  region       TEXT,                 -- vejledende pool-markedsenhed (Nordics, Latin America, ...)
  hometown     TEXT,                 -- rå hometown-streng
  school       TEXT,
  school_id    INTEGER,
  division     TEXT,
  sport        TEXT,
  position     TEXT,
  bio_url      TEXT,                 -- officiel roster-bio (absolut URL) hvis fundet
  roster_url   TEXT,                 -- kilde-roster
  first_seen   TEXT DEFAULT (datetime('now')),
  last_seen    TEXT DEFAULT (datetime('now')),
  active       INTEGER DEFAULT 1,
  UNIQUE(name_key, school, sport)     -- upsert-nøgle: samme person, samme skole/sport
);

CREATE INDEX IF NOT EXISTS idx_intl_country  ON international_athletes(home_country);
CREATE INDEX IF NOT EXISTS idx_intl_region   ON international_athletes(region);
CREATE INDEX IF NOT EXISTS idx_intl_language ON international_athletes(language);
