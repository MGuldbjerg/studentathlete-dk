# Motoren: kerne / sprog / land

**Skrevet**: 2026-08-03. Status: **implementeret** (migration 034 + 035 kørt, deployet).
**Opdateret 2026-08-04**: UK er nu **registreret og aktivt** — motoren serverer
to lande. Se "Status: to lande" nederst.

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
6. **Sproget er PÅKRÆVET i alt læservendt** (tilføjet 2026-08-21). `t()`,
   `sportLabel()`, `sportSlug()`, `articleTypeLabel()`, `getArticleUrl()`,
   `formatDate()`, `getSportContent()`, guides — ingen af dem har et valgfrit
   `lang` længere. Grunden er at et valgfrit sprog ALTID falder tilbage til
   standardsitet, og fejlen viser sig kun på det andet site, tit et sted et
   menneske ikke kigger: sitemap, JSON-LD, delekort, RSS. Compileren fandt 18
   sådanne steder den dag spærren blev sat. `src/lib/_no-danish-default-test.ts`
   (i CI) håndhæver reglen — og forbyder hardkodet `da-DK`, `inLanguage: "da"`,
   `Denmark` og brandet som streng uden for sprogpakker og landeprofiler.
   Admin er dansk med VILJE og skriver `ADMIN_LANG` for at sige det højt.

## Sådan tilføjer du et sprog

1. Kopiér `src/lib/i18n/da.ts` → `de.ts`, oversæt værdierne.
2. Skriv grammatikken (`profile-baseline.ts`-pendant) og registrér den i
   `profile-builders.ts`. Det er kode, ikke strenge — tysk bøjer anderledes.
3. Én linje i `LANGUAGES` i `i18n/index.ts`.

`_positions-test.ts` fejler hvis et begreb mangler en formulering, så du kan ikke
glemme halvdelen.

## Sådan tilføjer du et land

> 📘 **Skal du faktisk lancere et land? Læs `PLAYBOOK-nyt-land.md` først.**
> Den har den bindende rækkefølge, fælderne med deres symptomer, og de
> verifikationskommandoer der rent faktisk virker. Afsnittet her er kun
> arkitekturen; playbooken er processen.

> ⚠️ **Denne liste stod tidligere som tre trin — og det var forkert.** Ved
> UK-launch (2026-08-04) viste det sig, at linjen i `COUNTRIES` er det FARLIGSTE
> trin, ikke det nemmeste: i samme sekund et land er registreret, begynder
> scraperen at indsætte dets atleter, og alt nedstrøms der IKKE filtrerer på
> land, begynder at behandle dem som om de var danske. Rækkefølgen nedenfor er
> bindende.

**Registrér FØRST landet i `COUNTRIES`, når 1–4 er på plads.**

1. **Landeprofil**: kopiér `src/lib/countries/dk.ts`. Byer, markører,
   false positives, vært, brand, kontakt.
2. **Sprogpakke** (hvis sproget er nyt): `src/lib/i18n/<kode>.ts` + profil-
   grammatik i `profile-builders.ts` + linje i `LANGUAGES`.
3. **Prompts på sproget**: `pipeline/generate/prompts/<kode>.ts` + linje i
   `prompts/index.ts`. Uden dette skrives artikler om landets atleter på
   standardsitets sprog.
4. **Læservendte strenge**: sprogpakkens `ui`-tabel + `site_content` for det nye
   land (sidetitel, meta-beskrivelse, footer-tekst er PR. LAND, ikke globale).
5. **Så**: én linje i `COUNTRIES` i `countries/index.ts`.
6. Zone + DNS + route i `wrangler.toml`, og deploy.

### Tjeklisten der fangede fejlen

Før du registrerer et land: **find alt der læser `athletes` eller `articles`
uden at filtrere på land.** Det er dér lækagen sker.

```bash
grep -rn "FROM athletes\|FROM articles" pipeline/ src/ --include=*.ts \
  | grep -v "home_country\|a.country\|articles.country"
```

Ved UK-launch fandt netop dén kommando `pipeline/discover/check-sources.ts`,
som vælger atleter på `active = 1` uden landefilter. Havde vi registreret UK
først, ville discovery have fundet historier om briter, og genereringen — der
dengang havde dansk prompt hardkodet — ville have lagt DANSKE artikler om
britiske atleter i den danske kladdekø.

**Konklusionen blev ikke at filtrere discovery.** Den skal være landeagnostisk:
den overvåger skolefeeds, og en skole er interessant så snart den har én aktiv
atlet, uanset nationalitet. Det er GENERERINGEN der skal kende landet, fordi
det er dér sproget og sitet vælges. Samme skelnen gælder næste land: spørg for
hvert sted i pipelinen "skal det her vide hvilket land, eller er det ligegyldigt?"
— og filtrér kun dér hvor svaret er ja.

Scraperen indsamler derefter for alle registrerede lande i samme kørsel —
skolerne er de samme, kun klassifikationen adskiller sig.

## Hvad der bevidst IKKE er gjort endnu

- **Rute-navnene er danske mapper**: `/atleter`, `/viden`, `/skoler`, `/artikler`
  gælder alle sites. Sport-sluggene er derimod sprogstyrede og virker
  (`/football` vs `/american-football`). Engelske alias-ruter er ikke lavet.
- **Admin er dansk** og redigerer det site den tilgås FRA. Bevidst — én bruger —
  men UK-tekster kan derfor kun redigeres på UK-værten.
- **Redaktør-roller** — se `IDEA-payload.md`: `admin_users(email, role, country)`
  oven på Cloudflare Access, ikke et nyt CMS.

## Status: to lande (2026-08-04)

**DK** (standard) og **UK** er begge registreret i `COUNTRIES`. Motoren kører
altså reelt flersproget, ikke bare teoretisk.

Sprog: `i18n/da.ts` + `i18n/en.ts` (britisk — soccer hedder "Football" på
slugget `/football`, amerikansk fodbold ligger på `/american-football`,
atletik hedder "Athletics"). Begge har `ui`-tabel typet af `UiKey`, så en
manglende oversættelse er en TYPEFEJL, ikke et hul på siden.

Pr. land i D1: `site_content` (migration 037, nøgle `(key, country)`, plus
scope `global` under `'*'` til fx AdSense-kontoen) og `pages` (migration 038,
nøgle `(slug, country)`).

Pr. sprog i kode: sport-pillartekster (`sport-content-en.ts`), viden-guider
(`viden-content-en.ts`), genererings-prompts (`prompts/en.ts`), profil-grammatik
(`profile-baseline-en.ts`).

Vært → land → sprog opslås pr. request via `src/lib/site-server.ts`
(`currentSite`, `currentLanguage`, `currentBaseUrl`). **Brug `currentBaseUrl()`
til alt der udsender absolutte URL'er** — `BASE_URL` i `seo.ts` er en
modul-konstant og peger altid på standardsitet.

## Datamodellen efter migration 034/035

- `athletes.home_country` = ISO-kode ('DK'), indekseret.
- `articles.country` = sitets kode (en artikel kan findes uden atlet-kobling).
- `athletes.sport` = kanonisk NCAA-slug. `idx_athletes_sport` tilføjet.
- Delt på tværs af alle lande: `schools`, `roster_checks`, `url_probes`,
  `international_athletes`. Skolerne scrapes ÉN gang, uanset hvor mange sites
  der findes — det er hele pointen med at partitionere på nationalitet i stedet
  for at klone pipelinen.
