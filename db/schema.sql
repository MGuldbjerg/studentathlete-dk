-- StudentAthlete.dk database schema

CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sport TEXT NOT NULL,
  position TEXT,
  hometown TEXT,
  university TEXT NOT NULL,
  university_state TEXT,
  division TEXT NOT NULL DEFAULT 'NCAA D1', -- NCAA D1, NCAA D2, NCAA D3, NAIA, NJCAA
  year_enrolled INTEGER,
  active INTEGER NOT NULL DEFAULT 1, -- 1 = aktiv, 0 = færdig
  photo_url TEXT,
  profile_summary TEXT, -- AI-genereret kort profil
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER REFERENCES athletes(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT, -- til SEO meta description
  article_type TEXT NOT NULL DEFAULT 'profile', -- profile, news, season_update
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  state TEXT,
  division TEXT NOT NULL,
  conference TEXT,
  website TEXT
);

CREATE INDEX IF NOT EXISTS idx_athletes_sport ON athletes(sport);
CREATE INDEX IF NOT EXISTS idx_athletes_university ON athletes(university);
CREATE INDEX IF NOT EXISTS idx_athletes_active ON athletes(active);
CREATE INDEX IF NOT EXISTS idx_articles_athlete ON articles(athlete_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(article_type);
