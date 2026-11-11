-- Local press outlets per market (Mikkel 2026-11-11): when an athlete gets a major honour
-- or record, suggest which local outlets to ping, by the athlete's hometown.
-- Market-neutral: `country` is the athlete's market (DK | UK | future), same code as
-- athletes.home_country. Outlets are seeded UNVERIFIED (verified_at NULL); nothing is sent
-- anywhere by this table - it only feeds a suggestion Mikkel acts on himself.
CREATE TABLE IF NOT EXISTS local_outlets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  country       TEXT NOT NULL,                 -- market code: DK | UK | ...
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL,                 -- daily | weekly | regional_tv | online | sport | national
  publisher     TEXT,                          -- group, e.g. Reach, Newsquest, Sjællandske Medier
  website       TEXT,
  tip_contact   TEXT,                          -- tips/newsdesk email or URL, as found on the outlet's site
  social_handle TEXT,
  notes         TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  verified_at   TEXT,                          -- NULL = from memory, not checked against the outlet's site
  UNIQUE (country, name)
);
-- Which hometown areas an outlet covers. area_key = normaliseArea(town/county/nation).
CREATE TABLE IF NOT EXISTS outlet_areas (
  outlet_id INTEGER NOT NULL,
  area_key  TEXT NOT NULL,
  level     TEXT NOT NULL DEFAULT 'town',      -- town | county | region | nation
  PRIMARY KEY (outlet_id, area_key)
);
CREATE INDEX IF NOT EXISTS idx_outlet_areas_key ON outlet_areas(area_key);
