-- Migration 028: leads fra "Spil i USA"-kontaktformularen (NSSA-forberedelse)
-- Attribution indbygget fra dag ét: source_path + referrer bevises pr. lead, så en
-- fremtidig 15%-af-fee-aftale (jf. første sites NSSA-aftale) kan afregnes uden
-- diskussion om "kom de gennem os?". Ingen videresendelse endnu — aftalen er ikke
-- gen-pitchet; leads ligger i admin → Leads.
CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  sport       TEXT,
  message     TEXT,
  source_path TEXT,                  -- siden formularen blev udfyldt fra (attribution)
  referrer    TEXT,                  -- ekstern referrer-host, hvis nogen
  status      TEXT DEFAULT 'new',    -- new | contacted | forwarded | closed
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
