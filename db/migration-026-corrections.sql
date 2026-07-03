-- Migration 026: synlige rettelser på publicerede artikler (presseetik)
-- correction_note skrives af redaktøren i admin når en publiceret artikel rettes
-- væsentligt; corrected_at stemples automatisk. Vises som "Rettet <dato>: <note>"
-- -boks på artiklen — indfrier /presseetik-løftet om synlige rettelser.
ALTER TABLE articles ADD COLUMN correction_note TEXT;
ALTER TABLE articles ADD COLUMN corrected_at TEXT;
