-- Migration 027: review-beslutningslog (plan-punkt 1.3, omformålet 2026-07-02:
-- IKKE en auto-publish-gate — Mikkel har besluttet at menneskelig slutgodkendelse
-- er permanent. Loggen er EVIDENS for review-omkostning pr. kladde (godkendt-som-er
-- vs. redigeret vs. afvist pr. artikeltype × risiko), som skal bære lands-redaktør-
-- modellen ved UK-ekspansion.)
-- Logges automatisk fra publishArticle (approved_as_is/edited via original_content-
-- sammenligning) og deleteArticle (rejected, kun for AI-kladder).
CREATE TABLE IF NOT EXISTS review_log (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id       INTEGER NOT NULL,
  decision         TEXT NOT NULL,     -- 'approved_as_is' | 'edited' | 'rejected'
  article_type     TEXT,
  fabrication_risk TEXT,              -- risiko-badge på beslutningstidspunktet
  sensitive        TEXT,              -- stories.sensitive (presseetik-flag), hvis sat
  decided_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_decided ON review_log(decided_at);
