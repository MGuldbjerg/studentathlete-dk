INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('cookies', 'Cookiepolitik',
'StudentAthlete.dk respekterer dit privatliv. Her forklarer vi, hvilke cookies vi bruger.

## Vores statistik er cookieløs

Vi måler besøg uden cookies og uden at gemme din IP-adresse. I stedet bruges en daglig-skiftende, anonymiseret nøgle, der ikke kan føres tilbage til dig. Derfor kræver vores statistik ikke samtykke.

## Nødvendige cookies

Vores udbyder (Cloudflare) kan sætte tekniske sikkerhedscookies, der er strengt nødvendige for, at sitet fungerer og beskyttes mod misbrug. De kræver ikke samtykke.

## Cookies til annoncer

Når vi viser annoncer, kan vores annoncepartnere sætte cookies til at måle og målrette annoncer. Disse sættes kun, hvis du giver samtykke i vores cookieboks. Du kan til enhver tid ændre dit valg via "Cookieindstillinger" nederst på siden.

## Dit samtykke

Når cookieboksen er aktiv, kan du vælge "Accepter alle" eller "Kun nødvendige". Dit valg gemmes i en cookie (sa_consent) i op til 6 måneder, og du kan altid trække samtykket tilbage.

## Spørgsmål

Kontakt os via [kontakt-siden](/kontakt).',
'Cookiepolitik for StudentAthlete.dk — cookieløs statistik, nødvendige cookies og samtykke til annonce-cookies.',
1, 'page', NULL, datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title=excluded.title, content=excluded.content, meta_description=excluded.meta_description, published=1, kind='page', updated_at=datetime('now');
