-- Migration 018: social media-kø (modul 7)
-- Én række pr. (artikel, kanal). Artikler enqueues ved publicering og drænes
-- af social-post-workflowen med adaptiv pacing (se pipeline/social/pacing.ts).

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id),
  channel TEXT NOT NULL,                    -- 'bluesky' | 'x' | 'facebook'
  status TEXT NOT NULL DEFAULT 'queued',    -- queued | posted | failed | expired
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  posted_at TEXT,
  post_url TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  UNIQUE(article_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_channel_status
  ON social_posts(channel, status);
