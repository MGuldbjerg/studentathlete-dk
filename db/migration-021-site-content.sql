-- Key-value-overrides for redigerbare site-tekster/indstillinger.
-- Defaults bor i koden (src/lib/site-content.ts); kun ændrede værdier gemmes her.
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT
);
