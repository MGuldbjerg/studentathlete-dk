-- Foto-forslag-kø (IDEA-billeder.md niveau 2): pipeline foreslår officielle
-- roster-headshots fra atletens bio-side; Mikkel godkender/afviser i admin →
-- Fotos. Identitet er sikker by construction (fotoet sidder på atletens egen
-- bio-side). Aldrig auto-publiceret.
CREATE TABLE IF NOT EXISTS photo_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id),
  image_url TEXT NOT NULL,
  credit TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT,
  UNIQUE(athlete_id, image_url)
);
CREATE INDEX IF NOT EXISTS idx_photo_suggestions_status ON photo_suggestions(status);
