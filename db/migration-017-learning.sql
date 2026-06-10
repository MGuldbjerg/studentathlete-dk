-- Læringsloop (IDEA-laering.md): pipeline-minede stilforslag fra diffen
-- original_content (rå LLM-kladde) ↔ content (efter redaktøren).
--
-- style_corrections.status: 'active' (godkendt, i prompten når active=1)
--   | 'suggested' (foreslået af mine-edits, afventer redaktøren, active=0)
--   | 'rejected' (afvist — genforeslås ALDRIG, evidence_count tæller dog videre)
-- rule_type: 'phrase' (forkert→korrekt-par) | 'house_rule' (prosaregel i
--   correct_phrase, wrong_phrase tom)
-- evidence_count: antal gange mønstret er set på tværs af redigeringer
-- articles.edits_mined_at: artiklen er behandlet af mine-edits (kør aldrig dobbelt)
ALTER TABLE style_corrections ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE style_corrections ADD COLUMN rule_type TEXT NOT NULL DEFAULT 'phrase';
ALTER TABLE style_corrections ADD COLUMN evidence_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE articles ADD COLUMN edits_mined_at TEXT;
CREATE INDEX IF NOT EXISTS idx_style_corrections_status ON style_corrections(status);
