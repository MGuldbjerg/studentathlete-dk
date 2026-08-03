-- Migration 032: robust atlet-identitet — skolens eget spiller-id, manuelt
-- navne-override og en dublet-kø.
--
-- BAGGRUND. To rækker for samme NMSU-spiller (#106 "Filucca Daugaard" og #299
-- "Filucca Andersen") havde begge bio_url'er der endte på skolens spiller-id
-- 11192. Sidearm serverer efter id og ignorerer navnedelen af URL'en, så id'et
-- er sand identitet mens navnet er flygtigt. Navne-match (athlete-identity.
-- normalizeIdentity) kan aldrig fange et ÆNDRET efternavn — derfor disse felter.

-- Skolens eget spiller-id, "vært#id" (se athlete-identity.rosterKey).
-- Ikke UNIQUE endnu: eksisterende dubletter skal flettes først
-- (pipeline/report/dedup-athletes.ts), derefter kører migration 033.
ALTER TABLE athletes ADD COLUMN roster_key TEXT;
CREATE INDEX IF NOT EXISTS idx_athletes_roster_key ON athletes(roster_key);

-- Skolens stavemåde af navnet. US-rosters strippper danske tegn (Bøgebjerg →
-- Bogebjerg, Nørgaard → Norgaard, Jæger → Jaeger), så `name` (det viste navn)
-- og skolens streng kan afvige. Scraperen MATCHER på roster_name og skriver
-- den altid; `name` er redaktionelt.
ALTER TABLE athletes ADD COLUMN roster_name TEXT;

-- 1 = navnet er rettet i hånden i /admin. Scraperen overskriver ALDRIG `name`
-- på en låst række, uanset hvad skolen kalder atleten.
ALTER TABLE athletes ADD COLUMN name_locked INTEGER DEFAULT 0;

-- Gamle slugs efter navneskift/fletning → 301 til atletens nuværende slug, så
-- publicerede links og indekserede URL'er ikke dør.
CREATE TABLE IF NOT EXISTS athlete_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT,
  reason TEXT,                          -- 'rename' | 'merge' | 'manual'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (athlete_id) REFERENCES athletes(id)
);
CREATE INDEX IF NOT EXISTS idx_athlete_aliases_athlete ON athlete_aliases(athlete_id);

-- Dublet-kø: par som reglerne IKKE kan afgøre alene (ingen fælles spiller-id).
-- Fletning sker først når du godkender i /admin/dubletter.
CREATE TABLE IF NOT EXISTS merge_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id_keep INTEGER NOT NULL,     -- foreslået keeper
  athlete_id_merge INTEGER NOT NULL,    -- foreslået taber
  score INTEGER NOT NULL,               -- antal sammenfaldende signaler
  reason TEXT NOT NULL,                 -- menneskelæsbar begrundelse
  status TEXT DEFAULT 'pending',        -- pending | merged | rejected
  created_at TEXT DEFAULT (datetime('now')),
  decided_at TEXT,
  UNIQUE (athlete_id_keep, athlete_id_merge),
  FOREIGN KEY (athlete_id_keep) REFERENCES athletes(id),
  FOREIGN KEY (athlete_id_merge) REFERENCES athletes(id)
);
CREATE INDEX IF NOT EXISTS idx_merge_candidates_status ON merge_candidates(status);
