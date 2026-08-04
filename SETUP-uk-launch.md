# UK-launch: student-athlete.co.uk

**Skrevet 2026-08-04.** Domænet er købt. Dette er rækkefølgen fra "købt domæne" til
"site med rigtige artikler". Læs `ARKITEKTUR-motor.md` først — motoren er ét
kodebase, der serverer flere lande ud fra værten.

> **STATUS 2026-08-04: trin 1, 2 og 3 er GENNEMFØRT** (commit efter `faa801f9`).
> Pipelinen er landebevidst, de engelske prompts findes, UK er registreret, og
> roster-scrapen er sat i gang manuelt. **Tilbage: trin 4 (engelsk UI) — og den
> SKAL være færdig før domænet peger på sitet**, ellers møder britiske læsere
> en dansk menu. Trin 5 (DNS/zone) kan forberedes parallelt.

---

## Hvad UK arver GRATIS

Alt der er bygget i dag er delt kode og gælder automatisk for site nummer to,
uden en linje ekstra:

- Forsidens seks tæthedsbånd · arkivet (`/artikler`) med paginering og sportsfilter
- Kampkort, OG-billeder, RSS, sitemap, JSON-LD, analytics-beacon
- AdSense: `/ads.txt` + metatag + scriptet (samme publisher-ID dækker flere sites —
  men **tilføj student-athlete.co.uk som selvstændigt site i AdSense**)
- Cookieindstillinger-linket, samtykkehåndtering, admin i det hele taget
- `i18n/en.ts` (britisk sprogpakke), `profile-baseline-en.ts` (engelsk
  profilgrammatik), `countries/uk.ts` (UK-profil) — alle SKREVET og testet

## Hvad UK IKKE arver

1. **Genereringen taler dansk.** `pipeline/generate/prompts/` er hardkodet
   ("Skriv ALTID på dansk"). ~230 linjer fordelt på 5 filer.
2. **UI-strengene er danske.** ~100–200 strenge i JSX (Header, Footer, båndenes
   overskrifter, arkivsiden, skabeloner). Mekanismen findes (sprogpakken), men
   plumbingen er ikke lavet — se `ARKITEKTUR-motor.md`, "bevidst ikke gjort".
3. **Rute-navnene er danske mapper**: `/atleter`, `/viden`, `/skoler`, `/artikler`.
4. **De statiske sider** (om, kontakt, ai-brug, presseetik, cookies) findes kun på
   dansk i `pages`-tabellen. De skal skrives på engelsk med `country='UK'`.

---

## ⚠️ RÆKKEFØLGEN ER IKKE VALGFRI

**Registrér IKKE `uk` i `COUNTRIES` endnu.**

`pipeline/discover/check-sources.ts` (linje ~53 og ~79) vælger atleter med
`active = 1` og **filtrerer ikke på land**. I samme sekund UK-atleter lander i
`athletes`, begynder discovery altså at overvåge deres skoler og generere
**DANSKE** artikler om britiske atleter — direkte ned i din danske kladdekø.

Derfor: gør trin 1 og 2 færdige, FØR du tænder for indsamlingen i trin 3.

---

## ✅ Trin 1 — Gør pipelinen landebevidst  (GJORT 2026-08-04)

Løst anderledes end skitseret nedenfor, og bedre: **discovery filtreres IKKE**
på land. Den overvåger skolefeeds, og en skole er interessant så snart den har
en aktiv atlet — uanset nationalitet. Det er GENERERINGEN der er landebevidst:
`generate-articles.ts` slår atletens `home_country` op → landeprofil → sprog →
promptsæt, pr. historie. `articles.country` og `author` (sitets brand) stemples
fra atleten i stedet for at være hardkodet.

<details><summary>Oprindelig skitse (ikke fulgt)</summary>

Mål: en artikel ved hvilket land — og dermed hvilket sprog — den tilhører.

1. `check-sources.ts`: filtrér atleter på `home_country` (kør pr. land, eller
   tag landet med i forespørgslen).
2. `stories`/`articles`: `articles.country` findes allerede (migration 034).
   Sæt den fra atletens `home_country` ved generering i stedet for at hardkode 'DK'.
3. `generate-articles.ts`: slå landeprofilen op → sprog → vælg promptsæt.

</details>

## ✅ Trin 2 — Engelske prompts  (GJORT 2026-08-04)

`pipeline/generate/prompts/en.ts` — hele regelsættet på britisk engelsk, i ÉN fil
frem for fem, så de to sprog kan holdes i sync. **Reglerne er nummereret 1–23
identisk med `system.ts`** netop for at gøre parringen mekanisk: ændrer du regel
17 ét sted, skal den ændres samme sted i den anden fil.
`prompts/index.ts` vælger sæt via `promptsFor(language)`.

**Stadig ikke verificeret: kvaliteten.** Gratis-kæden er kun afprøvet på dansk.
Læs de første engelske kladder ekstra grundigt, før du sætter volumen på.

<details><summary>Oprindelige noter om oversættelsen</summary>

Husk at oversætte REGLERNE, ikke kun sproget:

- Regel 1 "Skriv ALTID på dansk" → engelsk, britisk stavemåde
- Regel 5 dansk overskriftskonvention (kun stort begyndelsesbogstav) → engelsk
  bruger ofte sentence case i moderne sportsmedier — vælg ÉN konvention og hold den
- Regel 6 "skriv sportsgrene på dansk (fodbold, ikke soccer)" → britisk:
  **football** for soccer, **American football** for football, **athletics** for
  track (sprogpakken `i18n/en.ts` har allerede de rigtige ord — genbrug dem)
- SEO-reglerne og presseetik-reglerne gælder uændret

</details>

## ✅ Trin 3 — Tænd for UK-indsamlingen  (GJORT 2026-08-04)

`uk` er registreret i `COUNTRIES`, og roster-scrapen er startet manuelt
(`gh workflow run weekly-scrape.yml`) i stedet for at vente til søndag. Den tager
typisk ~1t40m pr. kørsel og **uger at konvergere** over ~1.700 skoler.
Forventning: **1.200–2.000 briter** (kataloget siger 972 rå; DK-forholdet mellem
råt og kurateret antyder omkring det dobbelte).

**Klassifikationen er valideret empirisk**: alle 982 rigtige UK-hjembyer i
kataloget klassificeres som UK, ingen som DK. Krydstest viser at svenskere,
nordmænd, irere, australiere, canadiere og de amerikanske navnebrødre
(Denmark SC, Scotland PA, London Ontario) rammer ingen af sitene.

Følg med:
```bash
npx wrangler d1 execute studentathlete-dk --remote \
  --command "SELECT home_country, COUNT(*) FROM athletes WHERE active=1 GROUP BY home_country"
```

## ⬅️ Trin 4 — Engelsk UI  (NÆSTE — kode, ~1 dag, kedeligt men ligetil)

Flyt JSX-strengene til sprogpakken og slå sproget op fra værten
(`siteFromHost()` → `countryProfile.language`). I server-komponenter hentes
værten med `headers()`; klientkomponenter (Carousel, SearchBar,
ConsentSettingsLink) skal have sproget som prop. Start med det læseren ser
først: Header · Footer · forsidens bånd · arkivsiden · artikelskabelonerne.
Admin kan forblive dansk — den har kun én bruger.

**Fælde fundet undervejs**: `site_content` (sidetitel, meta-beskrivelse,
footer-tekst, AI-disclaimer) har INGEN landekolonne — begge sites deler samme
værdier. Enten skal tabellen have `country`, eller også skal disse felter flytte
til landeprofilen. Bliver det glemt, får UK-sitet dansk sidetitel og dansk
footer-tekst, uanset hvor mange JSX-strenge der er oversat.

Ruterne: enten engelske mapper med redirects, eller behold stierne og accepter
danske URL'er på et engelsk site (grimt). Anbefaling: gør sport-sluggene
sprogstyrede (det ER de allerede) og tilføj engelske alias-ruter for
`/atleter` → `/athletes`, `/viden` → `/guides`, `/skoler` → `/schools`,
`/artikler` → `/articles`.

## Trin 5 — Sæt domænet live  (dashboard + 1 linje, ~30 min)

Det eneste her du ikke kan gøre fra kommandolinjen er DNS-delegeringen.

1. **Cloudflare → Add site** → `student-athlete.co.uk` (Free plan).
2. Cloudflare giver dig to nameservere. **Skift nameservere hos den registrar,
   du købte domænet hos**, til dem. Vent på "Active" (typisk minutter–timer).
3. Tilføj en **A-record** `student-athlete.co.uk` → `192.0.2.1` med **proxy
   (orange sky) slået TIL**. Adressen er en pladsholder — Workers-routen
   opfanger trafikken, men zonen skal have en proxied record for at rute.
   Gentag for `www`.
4. `wrangler.toml`:
   ```toml
   routes = [
     { pattern = "studentathlete.dk/*",      zone_name = "studentathlete.dk" },
     { pattern = "www.studentathlete.dk/*",  zone_name = "studentathlete.dk" },
     { pattern = "student-athlete.co.uk/*",     zone_name = "student-athlete.co.uk" },
     { pattern = "www.student-athlete.co.uk/*", zone_name = "student-athlete.co.uk" },
   ]
   ```
5. `npm run deploy`.
6. Verificér:
   ```bash
   curl -sI https://student-athlete.co.uk/ | head -3
   curl -s https://student-athlete.co.uk/ | grep -o "<title>[^<]*"
   ```
   Middlewaren 301-redirecter `www` → apex af sig selv, fordi værten slås op i
   landeprofilen.

**Email**: Cloudflare Email Routing på den nye zone (samme opskrift som
studentathlete.dk) → `info@student-athlete.co.uk` videresendes. Adressen står
allerede i `countries/uk.ts`.

## Trin 6 — Indhold før pushet  (din tid)

1. Lad scrapen køre nogle uger (trin 3).
2. Kør generering for UK og **læs hver kladde** — ingen auto-publicering, heller
   ikke her.
3. Skriv de statiske sider på engelsk (om/kontakt/ai-brug/presseetik/cookies) og
   seed dem med `country='UK'`.
4. Først når der ligger ~15–20 publicerede artikler: begynd distribution.

## Trin 7 — AdSense på det nye domæne

Tilføj `student-athlete.co.uk` som **selvstændigt site** i AdSense. Samme
publisher-ID → `/ads.txt` og metatagget virker uændret på den nye vært, fordi
begge kommer fra samme felt i admin. Husk at publicere en European
regulations-besked for sitet, ellers dukker Cookieindstillinger-linket ikke op
(samme fælde som på .dk).

---

## Realistisk tidsforbrug

| Trin | Hvad | Hvem |
|---|---|---|
| 1–2 | Landebevidst pipeline + engelske prompts | kode, ~1 dag |
| 3 | Tænd indsamling | 1 linje, derefter uger |
| 4 | Engelsk UI | kode, ~1 dag |
| 5 | Domæne live | dig, ~30 min |
| 6 | Indhold + gennemlæsning | dig, løbende |

Rækkefølgen 1 → 2 → 3 er bindende. 4 og 5 kan køre parallelt med 3, mens
scrapen konvergerer.
