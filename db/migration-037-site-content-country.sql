-- Migration 037: site-tekster PR. LAND.
--
-- `site_content` havde `key` som primærnøgle, altså ÉN værdi delt af alle sites.
-- Med site nummer to (student-athlete.co.uk) ville UK-sitet arve dansk
-- sidetitel, dansk meta-beskrivelse og dansk footer-tekst, uanset hvor mange
-- JSX-strenge der blev oversat. Nøglen er nu (key, country).
--
-- Ikke alt er dog pr. land: AdSense-kontoen og samtykke-kontakten er de SAMME
-- for alle sites. De gemmes med country = '*' (se `scope` i site-content.ts),
-- så ét publisher-ID dækker begge domæner.
--
-- SQLite kan ikke ændre en primærnøgle, så tabellen bygges om. Eksisterende
-- rækker er pr. definition danske og får country = 'DK'; de globale flyttes
-- bagefter til '*' ud fra deres nøgle.

CREATE TABLE IF NOT EXISTS site_content_new (
  key        TEXT NOT NULL,
  country    TEXT NOT NULL DEFAULT 'DK',
  value      TEXT NOT NULL,
  updated_at TEXT,
  PRIMARY KEY (key, country)
);

INSERT OR REPLACE INTO site_content_new (key, country, value, updated_at)
  SELECT key, 'DK', value, updated_at FROM site_content;

DROP TABLE site_content;

ALTER TABLE site_content_new RENAME TO site_content;

-- Globale indstillinger: samme værdi for alle sites.
UPDATE site_content SET country = '*'
 WHERE key IN ('adsense.publisher_id', 'adsense.enabled', 'consent.enabled');
