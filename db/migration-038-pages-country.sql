-- Migration 038: sider PR. LAND.
--
-- `pages` rummer tre slags læservendt prosa: statiske sider (om/kontakt/…),
-- viden-guider og sport-pillartekster. `slug` var UNIQUE på tværs af hele
-- tabellen, så der kunne kun findes ÉN /om — og UK-sitet ville have serveret
-- den danske. Nøglen er nu (slug, country), præcis som `site_content` blev det
-- i migration 037.
--
-- Alt eksisterende indhold er dansk og får country = 'DK'.
--
-- NB: `slug` alene må IKKE længere være unik — to sites skal kunne have hver
-- sin /om. Derfor bygges tabellen om; SQLite kan ikke fjerne en UNIQUE.

CREATE TABLE IF NOT EXISTS pages_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'DK',
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  meta_description TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  published       INTEGER NOT NULL DEFAULT 0,
  kind            TEXT NOT NULL DEFAULT 'page',
  category        TEXT,
  UNIQUE (slug, country)
);

INSERT INTO pages_new (id, slug, country, title, content, meta_description, updated_at, published, kind, category)
  SELECT id, slug, 'DK', title, content, meta_description, updated_at, published, kind, category FROM pages;

DROP TABLE pages;

ALTER TABLE pages_new RENAME TO pages;

CREATE INDEX IF NOT EXISTS idx_pages_country_kind ON pages(country, kind, published);
