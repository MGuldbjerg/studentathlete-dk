-- Migration 012: To-fase artikelgenerering — faktaark + hallucinationskontrol
-- stories.fact_sheet:  struktureret JSON-faktaark (stats + kvalitative fakta, kilde-tagget)
-- stories.fact_status: NULL | 'built' | 'no_substance' | 'failed' — gate for skrivefasen
-- articles.fabrication_risk: 'low' | 'medium' | 'high' — resultat af verifikation (fase 3)
-- articles.fact_flags: JSON-array af påstande i artiklen uden kildebelæg

ALTER TABLE stories ADD COLUMN fact_sheet TEXT;
ALTER TABLE stories ADD COLUMN fact_status TEXT;

ALTER TABLE articles ADD COLUMN fabrication_risk TEXT;
ALTER TABLE articles ADD COLUMN fact_flags TEXT;

CREATE INDEX IF NOT EXISTS idx_stories_fact_status ON stories(fact_status);
