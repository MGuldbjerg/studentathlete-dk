-- Migration 041: ét hold pr. række — og et register over hold skolen IKKE har.
--
-- HVORFOR TABELLEN GENOPBYGGES. `roster_checks` blev oprettet med
-- UNIQUE(school_id, sport) (migration 002). Den ene linje betød at en skole kun
-- kunne have ÉN tennis-række — og scraperens gætte-løkke brød ved første URL der
-- svarede, altså typisk herreholdet. Konsekvensen stod i basen: 32 mandlige
-- basketballspillere og NUL kvindelige, 165 mandlige fodboldspillere mod 22
-- kvindelige. Kvindeholdene blev aldrig hentet, fordi der ikke var plads til dem.
-- SQLite kan ikke droppe en tabel-constraint, så tabellen skal bygges om.
--
-- HVAD DER ER NYT
--   team_slug         skolens eget holdnavn ("womens-rowing") — nu unikhedsnøglen
--   gender            'm' | 'f' | NULL, udledt af holdnavnet (kvinde-mønster først)
--   sponsored         0 = skolen har ikke sporten. DET NEGATIVE REGISTER: i stedet
--                     for at fejle på gymnastik hvert kvartal, står det ét sted at
--                     Loyola ikke har gymnastik. 65% af alle 'error'-rækker var
--                     præcis dette (stikprøve, 14 skoler, 2026-08-17).
--   inventory_source  'sitemap' | 'api' | 'guess' | 'legacy' — hvor holdlisten kom fra
--   inventory_at      hvornår inventaret sidst blev bekræftet (årlig genkontrol)
--
-- STATUS-VÆRDIER efter denne migration:
--   pending | success | empty | error | js_required   (som før)
--   not_sponsored                                    (nyt: holdet findes ikke)
--
-- Rækkefølge: kør HELE filen i én batch. Gamle rækker bevares med
-- inventory_source='legacy'; sport-inventaret sletter dem for en skole, når den
-- har fået en rigtig holdliste (kørslens egen kommentar forklarer hvorfor).

CREATE TABLE IF NOT EXISTS roster_checks_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id      INTEGER NOT NULL REFERENCES schools(id),
  sport          TEXT NOT NULL,
  team_slug      TEXT NOT NULL,
  gender         TEXT,
  roster_url     TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  athletes_found INTEGER DEFAULT 0,
  checked_at     TEXT,
  error_message  TEXT,
  sponsored      INTEGER NOT NULL DEFAULT 1,
  inventory_source TEXT,
  inventory_at   TEXT,
  -- Kun den nye Sidearm-platform: holdets `sportId` i skolens eget API. Uden det
  -- skulle scraperen enumerere id'er igen ved hver kørsel for at finde holdet.
  api_sport_id   INTEGER,
  UNIQUE(school_id, team_slug)
);

-- team_slug hentes ud af den roster-URL der virkede, når den findes: dér står
-- skolens rigtige holdnavn ("mens-tennis"), som gættet aldrig gemte andet sted.
-- Ellers falder vi tilbage på sportsnøglen.
INSERT OR IGNORE INTO roster_checks_new
  (id, school_id, sport, team_slug, roster_url, status, athletes_found, checked_at,
   error_message, sponsored, inventory_source, inventory_at, api_sport_id)
SELECT
  rc.id,
  rc.school_id,
  rc.sport,
  CASE
    WHEN rc.roster_url IS NOT NULL
     AND instr(rc.roster_url, '/sports/') > 0
     AND instr(substr(rc.roster_url, instr(rc.roster_url, '/sports/') + 8), '/roster') > 1
    THEN substr(
           substr(rc.roster_url, instr(rc.roster_url, '/sports/') + 8),
           1,
           instr(substr(rc.roster_url, instr(rc.roster_url, '/sports/') + 8), '/roster') - 1
         )
    ELSE rc.sport
  END,
  rc.roster_url,
  rc.status,
  rc.athletes_found,
  rc.checked_at,
  rc.error_message,
  1,
  'legacy',
  NULL,
  NULL
FROM roster_checks rc;

DROP TABLE roster_checks;

ALTER TABLE roster_checks_new RENAME TO roster_checks;

CREATE INDEX IF NOT EXISTS idx_rc_status    ON roster_checks(status);
CREATE INDEX IF NOT EXISTS idx_rc_checked   ON roster_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_rc_school    ON roster_checks(school_id);
CREATE INDEX IF NOT EXISTS idx_rc_sponsored ON roster_checks(sponsored, status);
CREATE INDEX IF NOT EXISTS idx_rc_inventory ON roster_checks(inventory_at);

-- Skolens platform kan nu være den nye Sidearm-generation, hvor rosteren ligger i
-- et JSON-API frem for i HTML. Det er IKKE det samme som 'sidearm', og forskellen
-- var usynlig indtil nu: 42% af D1-skolerne registreret som 'sidearm' kører den
-- nye platform, og hver eneste sportsgren på dem fejlede.
--   platform_type-værdier: sidearm | sidearm_api | prestosports | wordpress | custom | unknown
