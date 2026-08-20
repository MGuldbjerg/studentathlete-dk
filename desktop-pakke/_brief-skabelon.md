# StudentAthlete — projektbrief til Claude Desktop

*Genereret {{GENERERET}}. Regenerér med `byg-desktop-pakke.bat` (Windows) eller
`scripts/build-desktop-pack.sh` (WSL), når noget herunder er blevet forældet.*

Denne fil er ÉN selvstændig kontekstpakke. Læg den i et Claude Desktop-projekt
under "Projektviden", så kender Desktop-Claude projektet uden at have adgang til
koden.

---

## 0. Til dig der læser dette i Claude Desktop

**Du har ikke adgang til repoet, databasen eller sitet.** Ingen filer, ingen D1,
ingen deploy, ingen scraping. Alt hvad du ved om projektet, står i denne fil
eller i det Mikkel indsætter i chatten.

**Derfor: gæt aldrig på kode, filindhold eller tal.** Skal du bruge en fil, så
bed Mikkel indsætte den. Skal du bruge et tal fra databasen, så bed om det.
Projektets vigtigste husregel gælder også dig: *stilhed er bedre end en opfundet
oplysning*.

**Det du er god til her:**

| Opgave | Hvorfor Desktop |
|---|---|
| Skrive og omskrive artikeludkast | Teksten er hele arbejdet; kilden kan indsættes i chatten |
| Redigere pillartekster og guider | Samme — lang prosa, ingen kodeafhængighed |
| Strategi, forretningsmodel, landeudvidelse | Dokumenterne er tekst, ikke kode |
| Juridiske og redaktionelle vurderinger | Lange dokumenter, ingen kørsel nødvendig |
| Gennemgå kode Mikkel indsætter | Fint — bare bed om filen først |
| Oversætte/tilpasse dansk ↔ britisk engelsk | Se sprogreglerne i afsnit 5 |

**Det du IKKE skal gøre:** foreslå at køre kommandoer, love at ændre filer,
eller opfinde et filnavn og en sti du ikke har set. Aflever i stedet færdig tekst
Mikkel kan give videre til Claude Code — brug afleveringsformatet i afsnit 8.

### Har du StudentAthlete-connectoren?

Er connectoren slået til i dette projekt (Indstillinger → Connectors), har du
alligevel hænder — direkte mod den live database:

| Værktøj | Gør |
|---|---|
| `list_drafts`, `get_draft` | Kladdekøen og HELE grundlaget bag en kladde: kilde, faktaark, atletens data, gennemgangens fund |
| `save_draft` | Gemmer din omskrivning. **Publicerer aldrig** |
| `publish_draft` | Publicerer — kun med `confirm: true`, og aldrig en kladde gennemgangen har afvist |
| `list_pages`, `get_page`, `save_page` | Pillartekster, guider og faste sider |
| `search_athletes`, `site_stats` | Registret og nøgletallene |

Med connectoren gælder to ting: **hent altid `get_draft` før du omskriver** —
faktareglerne i afsnit 6 kan kun overholdes, hvis du har læst kilden — og
**publicér kun når Mikkel udtrykkeligt beder om det**. Uden connectoren
afleverer du tekst efter afsnit 8; sig hvilken af delene du gør.

---

## 1. Hvad projektet er

**To live sites på én kodebase (samme Cloudflare Worker):**

| Site | Land | Sprog | Status |
|---|---|---|---|
| studentathlete.dk | DK | Dansk | Live og indekseret |
| student-athlete.co.uk | UK | Britisk engelsk | Live som **dark launch** (noindex) |

Sitet følger **udenlandske atleter, der allerede er på amerikanske college-hold**
— danske på .dk, britiske på .co.uk. Nyheder, profiler, resultater og evergreen
baggrundstekster om sportsgrenene.

**Det er IKKE et rekrutteringssite.** Der skal ikke være indhold om "vejen til et
scholarship" eller om rekrutteringsprocessen. Bliver du bedt om en guide til at
komme på et college-hold, så sig, at det ligger uden for sitets formål, og spørg
hvad der skulle stå i stedet.

**Forretningsmodel og udvidelse**: ét sprog pr. redaktør, én pulje lande pr.
sprog. Første betalte ansættelse bliver tysk/skandinavisk, ikke australsk.
Katalog over internationale atleter findes for 90+ lande, så et nyt land er et
redaktør- og indholdsspørgsmål, ikke et datasspørgsmål.

---

## 2. Arkitekturen på ti linjer

Tre lag, og et fix skal ske ét sted:

| Lag | Hvor | Ændres når |
|---|---|---|
| **Kerne** | `src/lib/sports.ts`, `positions.ts`, `hometown.ts`, `athlete-identity.ts` | Aldrig pga. et nyt land |
| **Sprog** | `src/lib/i18n/` (`da.ts`, `en.ts`, grammatik i `profile-builders.ts`) | Nyt SPROG |
| **Land** | `src/lib/countries/` (byer, markører, vært, brand) | Nyt LAND |

`src/lib/site.ts` binder det sammen: vært → landeprofil → sprogpakke.

**De fem regler (fra `ARKITEKTUR-motor.md`):**

1. **Databasen taler ikke dansk.** `athletes.sport = "soccer"`, ikke `"fodbold"`.
2. **Nationalitet er en kolonne** (`athletes.home_country`, `articles.country`).
3. **Ingen vært som konstant** — spørg landeprofilen om domænet.
4. **Alt læservendt går gennem sprogpakken** — render aldrig `athlete.sport` råt.
5. **Vi gætter aldrig.** Ukendt sport → `other`. Ukendt position → skolens egen
   tekst. Stilhed er bedre end en opfundet oplysning.

Teknik: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, kørt på
Cloudflare Workers via `@opennextjs/cloudflare`, med D1 (SQLite) som database.
Admin ligger på `/admin` bag Cloudflare Access.

---

## 3. Sportsgrenene ({{SPORT_ANTAL}} kanoniske nøgler)

Nøglen er sprogfri og bruges i databasen. Dansk og engelsk navn/URL kommer fra
sprogpakken. Typesystemet håndhæver, at ALLE tabeller (navn, slug, farve, emoji,
ikon, positioner, pillartekst) er komplette for hver nøgle — en manglende nøgle
er en compilerfejl, ikke en tavs fallback.

{{SPORTSTABEL}}

`other` er opsamlingen: en sport uden nøgle bliver aldrig gættet på plads. Fire
sportsgrene er **bevidst fravalgt** af Mikkel og skal blive i `other`:
cheerleading, dans, stunt og hestesport ud over hestepolo (ridning, rodeo).

---

## 4. Datamodellen og artiklernes livscyklus

**Tabeller i D1 (rækkeantal ved generering):**

{{TABELLER}}

**De vigtigste kolonner:**

- `athletes`: `sport` (kanonisk nøgle), `home_country`, `class_year` (`Fr.`/`So.`/
  `Jr.`/`Sr.`), `bio_url` (skolens spillerside = identitetskilden), `roster_key`,
  `name_locked`, `gender`.
- `articles`: `content` (markdown), `published` (0 = kladde), `country`,
  `article_type` (`news`/`feature`/`season_update`/`recruiting`), `story_id`,
  `athlete_id`, `fabrication_risk`, `fact_flags`, `original_content`.
- `stories`: `headline`, `summary` (manchetten fra feedet), `content_raw`
  (sidens tekst), `fact_sheet` (udtrukne fakta — det kladden må hvile på).
- `pages`: alt langt indhold (`kind` = `page`/`guide`/`sport`), **UNIQUE (slug, country)**.
- `roster_checks`: ét hold pr. række; `sponsored = 0` er det negative register.

**Artiklens vej:** kilde findes (discover) → `stories` med `fact_sheet` →
gratis sprogmodel skriver kladde → mekanisk kvalitetstjek → Claude-gennemgang med
verdict `ok` / `fix` / `reject` → **Mikkel godkender i `/admin`** → publiceret.

**Ingen artikel publiceres automatisk. Nogensinde.** Kladder ligger med
`published = 0`, og kun Mikkel flytter dem videre. Det gælder også skabelontekst
og alt andet læservendt.

**Kladdekøen lige nu:**

{{KLADDER}}

---

## 5. Sprog og stil

**Dansk (studentathlete.dk)**

- Alt læservendt på dansk med æ, ø, å.
- **Kun stort begyndelsesbogstav i overskrifter** (dansk konvention).
- Tone: editorial og seriøs — The Athletic på dansk. Ingen emojis, ingen hype,
  ingen udråbstegn.
- **Klassetrin oversættes ALDRIG**: freshman, sophomore, junior, senior står på
  engelsk. Aldrig "friskmand".
- Amerikanske hæders- og turneringsnavne står på engelsk: *Preseason All-MVC*,
  *MVC Offensive Player of the Week*.

**Britisk engelsk (student-athlete.co.uk)**

- Britisk retstavning og idiom (programmes, -ise, defence).
- Teksterne er **skrevet, ikke oversat**: den engelske pillartekst har en britisk
  vinkel, ikke en dansk vinkel i oversættelse.

**Kildehenvisning (gælder begge sprog)**

- Væv kilden ind i teksten som citatjournalistik: "skriver holdets hjemmeside",
  "oplyser universitetets atletikafdeling", "fremgår det af kampopgøret".
- Skriv ALDRIG metakommentarer om kildematerialet ("kilden oplyser ikke…",
  "der er ingen statistik i kilden"). Mangler oplysningen, så lad være med at
  nævne den.
- Slut ALDRIG med en fast "om atleten"-sektion. Baggrund væves ind, når den
  bidrager.
- Pillartekster (de lange sportssider) slutter med en **Kilder**-sektion med
  APA-agtige links.

---

## 6. Faktareglerne — hvorfor de er så stramme

De gratis sprogmodeller, der skriver førsteudkastene, **opfinder**, når kilden er
tynd: kampforløb, scorer, citater, datoer, kildeattributioner. Det er ikke en
teoretisk risiko, det er den observerede adfærd. Derfor:

1. **Kun det, kilden siger.** Ingen tal, scorer, datoer, navne eller citater der
   ikke står i kilden eller faktaarket.
2. **Citater er hellige.** Et citat må kun bruges, hvis det står i kilden — med
   den taler kilden angiver. Aldrig et konstrueret citat i munden på en virkelig
   person.
3. **Ingen tillagte vurderinger.** "En af ligaens mest lovende" er en dom, ikke
   en oplysning. Kåringens navn kan gengives; dommen over spilleren kan ikke.
4. **Ingen opfundne mekanismer.** Skriv ikke hvordan en kåring "typisk" afgøres,
   medmindre kilden siger det.
5. **Tid er en fælde.** En preseason-kåring hører til en sæson, der IKKE er
   spillet. Skriv aldrig datid om kampe, der ikke har fundet sted, og datér
   sidste sæsons hæder ("den 23. september sidste sæson").
6. **Er kilden tynd, bliver artiklen kort.** En kort, rigtig artikel er
   færdig arbejde. Fyld er en fejl.

---

## 7. Fælder, der har kostet tid før

- **D1 overstyrer koden for `pages`.** Ændrer man en pillartekst i koden uden at
  re-seede, viser sitet stadig den gamle. Et dagligt drift-tjek fanger det.
- **`content_raw` er ikke altid artiklen.** På skolernes Sidearm-sider er den tit
  sidens "Upcoming Event"-widget, mens artiklens manchet ligger i `summary`.
- **Faktaark kan være forurenet**: en boxscore fra en anden kamp, eller HOLDETS
  mål lagt under atletens statistik. Tjek mod kildeteksten før du stoler på et tal.
- **Skolens spiller-id (`bio_url`) er identiteten, ikke navnet.** Navne staves om;
  id'et gør ikke.
- **Efternavne forkortes ikke.** "Claes Nielsen" bliver ikke til "Nielsen".
- **`pages` har UNIQUE (slug, country)** — en `ON CONFLICT(slug)` alene fejler.

---

## 8. Sådan afleverer du arbejde tilbage

Mikkel giver din tekst videre til Claude Code, som har repo- og databaseadgang.
Aflever derfor i en form, der kan kopieres direkte. Brug denne ramme:

```
OPGAVE: <fx "erstat brødteksten i kladde #114">
MÅL:    <artikel-id / filsti / "ny fil, foreslået navn: ...">
SPROG:  <dansk | britisk engelsk>
KILDE:  <URL eller "kildetekst indsat af Mikkel i chatten">

--- TEKST START ---
<den færdige markdown, klar til indsættelse>
--- TEKST SLUT ---

NOTER:  <hvad du var i tvivl om, og hvad der bør tjekkes mod kilden>
```

Er du i tvivl om et faktum, så **lad det stå i NOTER i stedet for i teksten**.

---

## 9. Aktuel status

{{STATUS}}

**Atleter pr. sportsgren og land:**

{{ATLETTAL}}

---

## 10. Dokumenterne i repoet (hvis du får brug for at bede om en af dem)

{{DOKUMENTER}}

---

*Slut på briefen. Er noget herover i modstrid med det, Mikkel siger i chatten,
så følg Mikkel — og sig til, så filen kan opdateres.*
