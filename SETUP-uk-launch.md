# UK-launch: student-athlete.co.uk

**Skrevet 2026-08-04.** Domænet er købt. Dette er rækkefølgen fra "købt domæne" til
"site med rigtige artikler". Læs `ARKITEKTUR-motor.md` først — motoren er ét
kodebase, der serverer flere lande ud fra værten.

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

## Trin 1 — Gør pipelinen landebevidst  (kode, ~½ dag)

Mål: en artikel ved hvilket land — og dermed hvilket sprog — den tilhører.

1. `check-sources.ts`: filtrér atleter på `home_country` (kør pr. land, eller
   tag landet med i forespørgslen).
2. `stories`/`articles`: `articles.country` findes allerede (migration 034).
   Sæt den fra atletens `home_country` ved generering i stedet for at hardkode 'DK'.
3. `generate-articles.ts`: slå landeprofilen op → sprog → vælg promptsæt.

## Trin 2 — Engelske prompts  (kode, ~½ dag)

Kopiér `pipeline/generate/prompts/` til en engelsk variant og vælg ud fra sproget.
Husk at oversætte REGLERNE, ikke kun sproget:

- Regel 1 "Skriv ALTID på dansk" → engelsk, britisk stavemåde
- Regel 5 dansk overskriftskonvention (kun stort begyndelsesbogstav) → engelsk
  bruger ofte sentence case i moderne sportsmedier — vælg ÉN konvention og hold den
- Regel 6 "skriv sportsgrene på dansk (fodbold, ikke soccer)" → britisk:
  **football** for soccer, **American football** for football, **athletics** for
  track (sprogpakken `i18n/en.ts` har allerede de rigtige ord — genbrug dem)
- SEO-reglerne og presseetik-reglerne gælder uændret

**Test kvaliteten før du stoler på den**: gratis-kæden er kun verificeret på dansk.
Kør nogle prøve-genereringer og læs dem, før du sætter volumen på.

## Trin 3 — Tænd for UK-indsamlingen  (1 linje + tålmodighed)

```ts
// src/lib/countries/index.ts
import { uk } from "./uk";
export const COUNTRIES = { DK: dk, UK: uk };
```

Derefter samler den ugentlige roster-scrape UK-atleter op af sig selv — samme
kørsel, samme skoler, kun klassifikationen adskiller sig. **Det tager uger at
konvergere** (scraperen roterer gennem ~1.700 skoler), så det er dét trin der
skal startes tidligst. Forventning: **1.200–2.000 briter** (kataloget siger 972
rå, og DK-forholdet mellem råt og kurateret antyder omkring det dobbelte).

Tjek undervejs:
```bash
npx wrangler d1 execute studentathlete-dk --remote \
  --command "SELECT home_country, COUNT(*) FROM athletes WHERE active=1 GROUP BY home_country"
```

## Trin 4 — Engelsk UI  (kode, ~1 dag, kedeligt men ligetil)

Flyt JSX-strengene til sprogpakken og slå sproget op fra værten
(`siteFromHost()` → `countryProfile.language`). Start med det læseren ser først:
Header · Footer · forsidens bånd · arkivsiden · artikelskabelonerne. Admin kan
forblive dansk — den har kun én bruger.

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
