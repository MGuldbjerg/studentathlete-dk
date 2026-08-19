-- Migration 043: gennemgange af kladder — både maskinens og Claudes.
--
-- FORMÅL. Mikkel: «for each draft, you quality check it … that should speed up the
-- learning». To slags gennemgang, samme tabel, så de kan sammenlignes med
-- hinanden OG med `review_log` (menneskets faktiske beslutning):
--
--   reviewer='mechanical'  De syv tjek i pipeline/generate/quality-check.ts. Gratis,
--                          deterministiske, kører automatisk. Fanger tal, navne,
--                          citater, identitet, stedord, tid og årgang.
--   reviewer='claude'      Læsningen et menneske ellers skulle lave: er vinklen
--                          ægte, står påstandene i kilden, er sproget dansk nok.
--
-- Hvorfor `content_hash`: en kladde må gennemgås igen NÅR DEN ÆNDRES, ikke hver
-- gang cron'en kører. Hashen gør kørslen idempotent og gratis at gentage.
--
-- Tabellen er et LOG, ikke en gate. Intet slettes automatisk på baggrund af den.
-- Det er stadig et menneske der godkender hver artikel (beslutning 2026-07-02).

CREATE TABLE IF NOT EXISTS draft_reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id   INTEGER NOT NULL REFERENCES articles(id),
  reviewer     TEXT NOT NULL,              -- 'mechanical' | 'claude'
  verdict      TEXT NOT NULL,              -- 'ok' | 'fix' | 'reject'
  severity     TEXT,                       -- 'low' | 'medium' | 'high'
  findings     TEXT,                       -- JSON: [{severity, category, claim, why}]
  summary      TEXT,                       -- én linje, til Discord og admin
  content_hash TEXT NOT NULL,              -- kladdens indhold da den blev gennemgået
  created_at   TEXT DEFAULT (datetime('now')),
  UNIQUE (article_id, reviewer, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_draft_reviews_article ON draft_reviews(article_id);
CREATE INDEX IF NOT EXISTS idx_draft_reviews_created ON draft_reviews(created_at);
