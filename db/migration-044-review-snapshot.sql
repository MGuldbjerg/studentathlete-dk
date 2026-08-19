-- Migration 044: gem den AFVISTE kladdes tekst, så afvisninger kan efterprøves.
--
-- PROBLEMET. Spørgsmålet «forudsiger kvalitetstjekket Mikkels faktiske
-- beslutninger?» kan i dag kun besvares halvt. Af 17 beslutninger i review_log er
-- 11 afvisninger — og `deleteArticle` sletter artiklen, så teksten er væk. De 11
-- er netop de VÆRSTE kladder, altså dem et tjek skal fanges på. Vi måler dermed
-- kun på de 6 redigerede.
--
-- `deleteArticle` læste allerede `original_content` for at afgøre om sletningen
-- var en afvisning. Den skal blot gemme den, plus nok kontekst til at kunne køre
-- tjekket igen bagefter: titel (tjekket læser den), samt story_id og athlete_id,
-- som overlever sletningen i deres egne tabeller (faktaark, kilde, køn, årgang).
--
-- Persondata: teksten er en upubliceret kladde om en navngivet atlet, og den
-- gemmes internt til kvalitetsmåling. Det hører under samme redaktionelle formål
-- som selve kladden — men den skal med i sletteoversigten (jf. LIA-udkastet), og
-- en atlet der gør indsigelse, skal også have sine afviste kladder slettet.

ALTER TABLE review_log ADD COLUMN content_snapshot TEXT;
ALTER TABLE review_log ADD COLUMN title_snapshot   TEXT;
ALTER TABLE review_log ADD COLUMN story_id         INTEGER;
ALTER TABLE review_log ADD COLUMN athlete_id       INTEGER;
