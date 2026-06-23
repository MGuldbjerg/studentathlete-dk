INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('presseetik', 'Presseetik & henvendelser',
'StudentAthlete.dk tilstræber korrekt og fair omtale. Oplever du en fejl, eller ønsker du en rettelse eller fjernelse, hører vi gerne fra dig.

## Ret en fejl

Finder du en faktuel fejl i en artikel, så skriv til os via [kontakt](/kontakt) med et link til artiklen og en beskrivelse af fejlen. Vi retter væsentlige fejl på eget initiativ, så snart vi bliver opmærksomme på dem, og markerer rettelsen tydeligt.

## Rettelse eller svar

Er du omtalt og mener, at noget bør korrigeres eller suppleres med dit perspektiv, så kontakt os — vi bringer relevante svar.

## Fjernelse / afpublicering

Du kan bede om at få fjernet eller af-indekseret en artikel eller oplysninger om dig. Vi vurderer hver henvendelse konkret og hurtigst muligt.

## Sådan arbejder vi

Vores artikler skrives med hjælp fra kunstig intelligens ud fra offentlige kilder og gennemlæses af et menneske før udgivelse. Læs mere om [hvordan vi bruger Ai](/ai-brug).

## Kontakt

Skriv til os via [kontakt-siden](/kontakt).',
'Sådan retter, supplerer eller fjerner vi indhold på StudentAthlete.dk — meld fejl, bed om rettelse eller afpublicering.',
1, 'page', NULL, datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title=excluded.title, content=excluded.content, meta_description=excluded.meta_description, published=1, kind='page', updated_at=datetime('now');

UPDATE pages
SET content = content || char(10) || char(10) || '## Menneskelig gennemlæsning' || char(10) || char(10) || 'Hver artikel gennemlæses og godkendes af et menneske før udgivelse. Vi tjekker blandt andet, at rubrikken har dækning i artiklen, og at fakta og vurderinger holdes adskilt.',
    updated_at = datetime('now')
WHERE slug = 'ai-brug' AND content NOT LIKE '%Menneskelig gennemlæsning%';
