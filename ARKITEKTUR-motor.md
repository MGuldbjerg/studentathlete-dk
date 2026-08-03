# Motoren: kerne / sprog / land

**Skrevet**: 2026-08-03. Status: **implementeret** (migration 034 + 035 kørt, deployet).
**UK-forberedelse samme dag**: sprog nr. 2 (`i18n/en.ts` + engelsk profil-grammatik)
og land nr. 2 (`countries/uk.ts`) er skrevet og testet, men UK er **IKKE registreret
i `COUNTRIES`** — se afsnittet "UK: forberedt, ikke aktiveret" nederst.

Ét site i dag, men koden er skåret så et fix sker ÉT sted og gælder alle sites.
Læs dette før du tilføjer noget der handler om sprog, land eller sportsgrene.

## De tre lag

| Lag | Hvor | Indeholder | Ændres når |
|-----|------|-----------|-----------|
| **Kerne** | `src/lib/sports.ts`, `hometown.ts`, `positions.ts`, `athlete-identity.ts`, `athlete-merge.ts` | Alt der er sandt uanset land og sprog: sportsnøgler, farver, ikoner, emoji, spiller-id-logik, dublet-regler, "hvilke koder findes i baseball" | Aldrig pga. et nyt land |
| **Sprog** | `src/lib/i18n/` | Navne, URL-slugs, position-formuleringer, translitteration + profil-grammatik (`profile-builders.ts`) | Nyt SPROG |
| **Land** | `src/lib/countries/` | Byer, landemarkører, false positives, vært, brand, kontakt | Nyt LAND |

`src/lib/site.ts` binder det sammen: vært → landeprofil → sprogpakke.

## Reglerne

1. **Databasen taler ikke dansk.** `athletes.sport` = `"soccer"`, ikke `"fodbold"`.
   Samme vokabular som `roster_checks` og `international_athletes` altid har brugt.
2. **Nationalitet er en kolonne** (`athletes.home_country`, `articles.country`),
   ikke en konsekvens af at rækken findes.
3. **Ingen vært som konstant.** Skal du bruge domænet, så spørg landeprofilen.
4. **Alt læservendt går gennem sprogpakken.** Render aldrig `athlete.sport` råt —
   brug `sportLabel()`. Den rå nøgle slap ud i sidetitel, kampkort og JSON-LD
   første gang, netop fordi det er let at glemme.
5. **Vi gætter aldrig.** Ukendt position-kode → skolens egen tekst. Ukendt
   sportsnøgle → `other`. Stilhed er bedre end en opfundet oplysning.

## Sådan tilføjer du et sprog

1. Kopiér `src/lib/i18n/da.ts` → `de.ts`, oversæt værdierne.
2. Skriv grammatikken (`profile-baseline.ts`-pendant) og registrér den i
   `profile-builders.ts`. Det er kode, ikke strenge — tysk bøjer anderledes.
3. Én linje i `LANGUAGES` i `i18n/index.ts`.

`_positions-test.ts` fejler hvis et begreb mangler en formulering, så du kan ikke
glemme halvdelen.

## Sådan tilføjer du et land

1. Kopiér `src/lib/countries/dk.ts` → `de.ts`: byer, markører, vært, brand.
2. Én linje i `COUNTRIES` i `countries/index.ts`.
3. Route i `wrangler.toml`.

Scraperen indsamler derefter for begge lande i samme kørsel — skolerne er de
samme, kun klassifikationen adskiller sig.

## Hvad der bevidst IKKE er gjort endnu

- **UI-strenge i komponenter** er stadig dansk tekst i JSX (Header, Footer,
  skabeloner, hele /admin). Mekanismen findes, men at flytte ~400 strenge nu
  ville være en stor mekanisk ændring uden arkitektonisk gevinst. Gøres når
  sprog nummer to reelt skal bruges.
- **Sprog pr. request** i klientkomponenter kræver en context-provider.
  `sportLabel()` m.fl. tager allerede et valgfrit sprog-argument; i dag bruger
  de standardsitets sprog. Plumbingen er mekanisk når site nummer to lander.
- **Redaktør-roller** — se `IDEA-payload.md`: `admin_users(email, role, country)`
  oven på Cloudflare Access, ikke et nyt CMS.

## UK: forberedt, ikke aktiveret (2026-08-03)

Klart: `i18n/en.ts` (britisk konvention: soccer→"Football" på slugget /football,
amerikansk fodbold→/american-football, atletik→"Athletics") · engelsk
profil-grammatik (`profile-baseline-en.ts`, registreret i `PROFILE_BUILDERS`) ·
`countries/uk.ts` (markers-først-klassifikation — næsten alle britiske bynavne
har US-navnebrødre, så bylisten er kort og bar "London" klassificeres bevidst
ikke). Tests: `_hometown-uk-test.ts` (57) + `_profile-baseline-en-test.ts` (32)
+ sprogpakke-completeness i `_positions-test.ts` for ALLE registrerede sprog.

**Aktivering er med vilje udeladt** — én linje i `COUNTRIES` sætter UK i
`activeCountries()`, og så begynder næste scrape at indsætte ~1.000 UK-atleter
i den levende `athletes`-tabel. Før den linje skrives, mangler (se headeren i
`countries/uk.ts`): domæne købt + wrangler-route · ENGELSKE prompts
(`pipeline/generate/prompts/` er hardcodet dansk) · ~400 danske UI-strenge i
JSX + danske route-mapper (`/atleter`, `/viden`, `/skoler`) · Mikkels go efter
DK's in-season-validering.

## Datamodellen efter migration 034/035

- `athletes.home_country` = ISO-kode ('DK'), indekseret.
- `articles.country` = sitets kode (en artikel kan findes uden atlet-kobling).
- `athletes.sport` = kanonisk NCAA-slug. `idx_athletes_sport` tilføjet.
- Delt på tværs af alle lande: `schools`, `roster_checks`, `url_probes`,
  `international_athletes`. Skolerne scrapes ÉN gang, uanset hvor mange sites
  der findes — det er hele pointen med at partitionere på nationalitet i stedet
  for at klone pipelinen.
