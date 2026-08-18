-- Migration 042: skolens ATLETIKSITE, adskilt fra dens hovedside.
--
-- BAGGRUND. Sport-inventaret (migration 041) kunne ikke finde holdlisten på 435
-- skoler — 258 af dem i D3 alene. Årsagen er ikke deres platform: `schools.website`
-- peger på universitetets hovedside (`https://www.kzoo.edu`), og rosters ligger på
-- et helt andet værtsnavn (`https://hornetathletics.com`). Vi spurgte altså den
-- rigtige skole på den forkerte adresse.
--
-- HVORFOR EN NY KOLONNE, IKKE EN RETTELSE AF `website`:
-- `website` vises på skoleprofilen og bruges i JSON-LD (`seo.ts`) som skolens
-- officielle hjemmeside. Den skal blive ved med at være universitetets adresse —
-- en læser der klikker, skal ikke ende på et roster-arkiv. Atletiksitet er en
-- pipeline-oplysning, ikke en læservendt.
--
-- Feltet sættes KUN når adressen er bekræftet: kandidaten skal selv have leveret
-- mindst ét hold (`/sports/<hold>/roster`) eller svaret på roster-API'et. Et gæt
-- gemmes aldrig — samme regel som resten af motoren.

ALTER TABLE schools ADD COLUMN athletics_url TEXT;

-- Hvornår vi sidst ledte, uanset udfald. Uden det ville hver kørsel lede forgæves
-- efter de samme skoler, der ikke HAR et selvstændigt atletiksite.
ALTER TABLE schools ADD COLUMN athletics_checked_at TEXT;
