-- Migration 051: den maskinrettede kladde som sit eget udgangspunkt.
--
-- FORMÅL. Fra 2026-09-10 retter en natlig kørsel (01:00) hver kladde som
-- Claude-gennemgangen dømmer `fix`, og afviser dem den dømmer `reject` — «so I
-- only need to focus on what works» (Mikkel). Kladden bliver IKKE udgivet: det
-- er stadig et menneske der godkender hver artikel (beslutning 2026-07-02).
--
-- PROBLEMET DEN LØSER. `publishArticle` afgør `approved_as_is` vs `edited` ved
-- at sammenligne `content` med `original_content`. Retter maskinen kladden om
-- natten, afviger de to ALTID — og så ser hver udgivelse ud som om Mikkel
-- redigerede, uanset om han rørte et komma. Det ville stille og roligt ødelægge
-- det eneste mål vi har for om kladderne er gode nok.
--
-- Med `claude_fixed_content` som mellemled kan strækket deles i to:
--   original_content  → claude_fixed_content   hvad MASKINEN rettede
--   claude_fixed_content → content             hvad MIKKEL stadig måtte rette
-- Det er mere at vide end i dag, ikke mindre. `publishArticle` sammenligner
-- derfor mod `claude_fixed_content` når den findes, og logger beslutningen
-- `approved_after_fix` — så «godkendt som-er» fortsat kun betyder en kladde der
-- gik hele vejen uberørt.
--
-- `claude_fix_note` er JSON: {summary, changes:[{was,now,why}], unfixable:[...]}.
-- Den ligger på artiklen og IKKE i `draft_reviews`, fordi `mcp-server.ts` læser
-- den nyeste draft_reviews-række uden at filtrere på `reviewer` — en rettelse
-- lagt dér ville udgive sig for at være gennemgangen.
--
-- `review_log.fixed_snapshot`: afviser natkørslen en kladde den selv har rettet,
-- gemmer 044's `content_snapshot` stadig den OPRINDELIGE kladde (så backtesten
-- måler modellen, ikke maskinrettelsen). Den rettede tekst ville ellers være
-- tabt, og så kunne spørgsmålet «var afvisningen rimelig?» ikke efterprøves.

ALTER TABLE articles ADD COLUMN claude_fixed_content TEXT;
ALTER TABLE articles ADD COLUMN claude_fixed_at      TEXT;
ALTER TABLE articles ADD COLUMN claude_fix_note      TEXT;

ALTER TABLE review_log ADD COLUMN fixed_snapshot TEXT;
