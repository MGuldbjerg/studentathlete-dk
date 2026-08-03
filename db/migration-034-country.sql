-- Migration 034: gør nationalitet til DATA i stedet for en antagelse.
--
-- Indtil nu har en atlet ligget i `athletes` FORDI isDanishHometown() sagde ja
-- ved scrapetidspunktet — landet stod ingen steder. Det virker så længe der er
-- ét land: "danske atleter" = "alle rækker". Med site nummer to kan filtret
-- ikke længere udledes, og historiske rækker kan ikke få landet tilbage uden at
-- gætte på hometown-strenge igen.
--
-- home_country/country er ISO 3166-1 alpha-2 ('DK'), samme vokabular som
-- international_athletes.home_country, der allerede gør det rigtigt.

-- Atletens nationalitet = hvilket sites redaktion han/hun hører til.
ALTER TABLE athletes ADD COLUMN home_country TEXT;
CREATE INDEX IF NOT EXISTS idx_athletes_home_country ON athletes(home_country);

-- Artiklens site. Udledes normalt af atleten, men står selvstændigt fordi en
-- artikel kan være skrevet uden atlet-kobling (fx en generel nyhed).
ALTER TABLE articles ADD COLUMN country TEXT;
CREATE INDEX IF NOT EXISTS idx_articles_country ON articles(country);

-- Backfill: alt eksisterende indhold ER dansk — det var betingelsen for at
-- blive indsamlet overhovedet.
UPDATE athletes SET home_country = 'DK' WHERE home_country IS NULL;
UPDATE articles SET country = 'DK' WHERE country IS NULL;
