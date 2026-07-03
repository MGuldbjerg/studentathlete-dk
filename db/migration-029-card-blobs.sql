-- Migration 029: pre-rendrede kampkort (1200×630 PNG) som D1-blobs
-- Pipeline (pipeline/render/render-cards.ts) renderer kortene i Node (satori+
-- resvg — ingen Worker-CPU-grænse) og gemmer dem her som base64-TEXT (REST-API
-- kan ikke sende binært; decode i Worker er billig). /api/og serverer blob'en
-- før on-the-fly-fallbacket. R2 var førstevalget men kræver dashboard-
-- aktivering på kontoen (API-fejl 10042); D1 giver samme resultat på $0.
-- Nøgle: card-{articleId}-v{CARD_VERSION} (se src/lib/seo.ts cardBlobKey).
CREATE TABLE IF NOT EXISTS card_blobs (
  key        TEXT PRIMARY KEY,
  png_base64 TEXT NOT NULL,
  width      INTEGER NOT NULL,
  height     INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
