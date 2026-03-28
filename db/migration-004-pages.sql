-- Statiske sider (om, kontakt, viden) — redigerbare fra admin
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
