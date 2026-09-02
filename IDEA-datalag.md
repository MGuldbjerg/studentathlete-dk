# Datalaget — alternativer og vurdering

**Undersøgt 2026-09-02**, dagen efter at D1 begyndte at afvise forespørgsler.
Dokumentet svarer på tre spørgsmål: hvad skete der, er den nuværende opsætning
den rigtige, og hvilke alternativer findes der — også de vi ikke selv havde
tænkt på.

---

## 0. Konklusion først

**Opsætningen har den rigtige FORM. Den kører bare uden de to ting, der får
formen til at virke — en cache og en ordentlig nøglerelation — og på en plan,
hvis grænse den overskrider 32 gange.**

At flytte databasen til Turso, Neon, Supabase eller en VPS ville løse **ingen**
af de fire årsager nedenfor. Et krydsprodukt er et krydsprodukt, uanset hvilken
motor der udfører det; en anden udbyder ville udføre det hurtigere og sende en
regning i stedet for en fejl. Migrationen ville koste uger og flytte problemet.

Rækkefølgen der virker: **betal for planen (timer) → ret læsestien (1-2 dage) →
ret datamodellen (2-4 dage) → skil arbejdsbyrderne fra hinanden (1-2 dage)**.
Først derefter er der en grund til at overveje at flytte noget.

---

## 1. Hvad der faktisk skete

To ting mødtes samme dag.

**Cloudflare strammede grebet.** Fra **1. september 2026** fejler D1-forespørgsler
på Workers Free-planen, når kontoen overskrider den daglige grænse for læste
eller skrevne rækker — både via Workers-bindingen og REST-API'et, indtil
grænsen nulstilles ved midnat UTC. Før den dato blev overforbruget tolereret
i praksis. Adfærden er ny; **forbruget er ikke**.

**Vi har ligget langt over hele tiden.** Målt med `wrangler d1 info`:

| Mål | Værdi | Free-grænse | Forhold |
|---|---|---|---|
| Læste rækker / 24t | **161.388.686** | 5.000.000 | **32×** |
| Skrevne rækker / 24t | 4.698 | 100.000 | 0,05× |
| Læseforespørgsler / 24t | 12.428 | — | ~13.000 rækker pr. forespørgsel |
| Databasestørrelse | 57,3 MB | 500 MB (free) | 11% |
| Region | WEUR (primær) | — | replikering: **slået fra** |

Symptomet så vi i koden allerede: da grænsen blev ramt, svarede
`/atleter/sebastian-tirsgaard-larsen` **404** til alle, fordi et opslag pr. slug
returnerede `null` både ved «findes ikke» og ved databasefejl. Det er rettet.
Men klassen af fejl er værd at holde fast i: **en kvotehændelse blev til en
SEO-hændelse**, fordi Google fik 404 på artikel- og profilsider.

---

## 2. Arbejdsbyrdens sande form — tallet der afgør alt

161 millioner læste rækker om dagen på en database på 57 MB.

Datasættet er **2.343 atleter, ~900 skoler, nogle hundrede artikler**. Der
skrives **4.698 rækker om dagen**. Forholdet mellem læste og skrevne rækker er
**ca. 34.000 : 1**.

> Det er ikke et databaseproblem. Det er en **læseforstærkning** på fire-fem
> størrelsesordener oven på et lillebitte, næsten stillestående datasæt.

Et datasæt af den størrelse og med den ændringsfrekvens er lærebogseksemplet
på noget der skal **caches eller prægenereres** — ikke noget der skal have en
større database. Al vurdering nedenfor følger af den ene observation.

---

## 3. Hvor rækkerne bliver læst

`wrangler d1 insights --sort-by reads --time-period 7d` peger direkte. De fem
tungeste forespørgsler står for **~927 millioner læste rækker på syv dage** —
altså praktisk taget hele forbruget.

| # | Forespørgsel | Rækker pr. kørsel | Kørsler/7d | I alt | Effektivitet |
|---|---|---|---|---|---|
| 1 | `getAllSchoolSlugs()` — sitemap | **2.123.731** | 230 | 488 mio. | 0,00016 |
| 2 | JS-scrape-udvælgeren (pipeline) | **58.951.220** | 5 | 295 mio. | 0,0000008 |
| 3 | Profil-backfill (`length(profile_summary)<=400`) | 4.113.935 | 12 | 49 mio. | 0,00057 |
| 4 | Skolefarve-udvælgeren | 4.451.314 | 11 | 49 mio. | 0,000022 |
| 5 | `/skoler` med atlettælling | 2.079.632 | 22 | 46 mio. | 0,000088 |

Fire årsager ligger bag, og de er alle uafhængige af hvilken database vi bruger.

### Årsag 1 — Sitemap'et alene sprænger kvoten fjorten gange

```sql
SELECT DISTINCT s.slug FROM schools s
  JOIN athletes a ON a.university = s.name AND a.active = 1
    AND a.home_country = ?
  ORDER BY s.name
```

**2,1 millioner læste rækker for at returnere ~200 slugs.** Tallet er ~900
skoler × 2.343 atleter — altså et fuldt krydsprodukt (afledt af
`avgRowsRead / antal atleter`; de præcise rækketal kunne ikke slås op, mens
kontoen var spærret). Kaldt ~33 gange om dagen af crawlere bliver det
**~70 mio. rækker/dag fra én funktion** = 14× hele den daglige free-kvote.

SQLite vælger det lavkardinale `idx_athletes_home_country` (DK/UK — halverer
kun) i stedet for `idx_athletes_university`. Der er **aldrig kørt `ANALYZE`**,
så planlæggeren gætter i stedet for at vide.

### Årsag 2 — Der er ingen cache nogen steder

`open-next.config.ts` er én linje: `defineCloudflareConfig()` **uden
argumenter**. OpenNext-adapteren giver da **ingen caching overhovedet** — ingen
incremental cache, ingen tag cache, ingen kø. Konsekvensen:

- `export const revalidate = 300` i `src/app/artikler/page.tsx` er **inaktiv**.
  Der er intet sted at lægge den regenererede side.
- Ingen route har `generateStaticParams`. Intet prægenereres.
- `/atleter` og `/skoler` er eksplicit `force-dynamic`.

### Årsag 3 — Ingen side KAN være statisk, sådan som motoren er bygget

Det her er det vigtigste arkitektoniske fund, og det er ikke et uheld — det er
en konsekvens af flersite-designet:

`src/lib/site-server.ts` afgør land og sprog ved at kalde **`headers()`** og
læse `host`. `currentSite()`, `currentLanguage()`, `contentCountry()` og
`currentBaseUrl()` gør det alle, og de kaldes fra stort set hver side og hvert
`generateMetadata`.

> I Next.js App Router **tvinger et kald til `headers()` ruten til dynamisk
> rendering.** Hele det offentlige site er derfor dynamisk *ved konstruktion*,
> ikke ved valg. Statisk generering er i dag ikke bare fravalgt — den er
> utilgængelig.

Ét Worker der betjener `.dk` og `.co.uk` ud fra værten er elegant og har gjort
UK-launchen billig. Prisen er, at den samme mekanisme afskærer prægenerering.

### Årsag 4 — Datamodellen binder atlet til skole med en tekststreng

`athletes.university` er **TEXT**, ikke en fremmednøgle. Hver relation mellem
atlet og skole i kodebasen er en strengsammenligning mod `schools.name`:
66 forespørgsler rører `athletes`, 34 rører `schools`, og mange joiner sådan.

`migration-047-join-indexes.sql` var allerede et forsøg på at lappe det med
indekser. Det holdt ikke, fordi problemet er modellen, ikke indekset.

Forespørgsel 2 og 5 viser samme mønster forstærket: korrelerede
`EXISTS`-underforespørgsler i både `WHERE` og `ORDER BY CASE`, som genscanner
`athletes` for hver `roster_checks`-række. **59 mio. rækker og 11,7 sekunder
i én forespørgsel.**

---

## 4. Robusthed ud over kvoten

Kvoten var det der væltede sitet, men der er fem andre svagheder værd at kende.

| Svaghed | Konsekvens |
|---|---|
| **Én database, én region.** WEUR primær, replikering slået fra | Britiske og amerikanske læsere krydser Atlanten ved hvert opslag |
| **Fire arbejdsbyrder i én base.** Offentlig læsning, pipeline-tilstand, analytics, admin | En 11-sekunders scrape-udvælger kan tage det offentlige site ned. Det gjorde den |
| **Ingen nedgradering ved fejl.** Netop rettet for slug-opslag | Mønstret findes stadig alle steder hvor `catch { return [] }` betyder «tom side» |
| **Loft på 10 GB, kan ikke hæves.** Paid-plan. Free: 500 MB | `pageviews` og `events` vokser uden grænse og er de eneste tabeller der gør det |
| **Intet kladdetrin på `pages`/`site_content`** | En rettelse er offentlig i samme sekund. Robusthed af en anden slags, men samme familie |

Til gengæld: `weekly-backup.yml` findes, D1 Time Travel giver 7 dage (free) /
30 dage (paid) tilbage i tiden, og migrationsvejen er disciplineret
(`migrate-live.sh` afviser alt ikke-additivt). Det er bedre end de fleste.

---

## 5. Mulighedsrummet

Ordnet efter **hvilket lag** man ændrer — ikke efter produktnavn. Det er
pointen: de fleste «alternativer» folk foreslår ligger i lag B, og problemet
ligger i lag A.

### Lag A — Læsestien (her ligger problemet)

| Mulighed | Hvad det gør | Effekt her | Indsats | Vurdering |
|---|---|---|---|---|
| **A1. Ret de fem forespørgsler + `ANALYZE`** | Driv joinen fra den lille side; sammensatte dækkende indekser; giv planlæggeren statistik | **Fjerner anslået 90-95% af alle læste rækker** | Timer | ✅ **Gør dette først** |
| **A2. Konfigurér OpenNext-cachen** | `r2IncrementalCache` + `withRegionalCache()` + `DOQueueHandler` + `D1NextTagCache` / `DOShardedTagCache` | Gør ISR reel; `revalidate` begynder at virke | 0,5-1 dag | ✅ **Ja** |
| **A3. ~~Edge Cache Rules på crawler-stier~~ → Workers Cache** | ⚠️ **Rettet 2026-09-02**: zonens Cache Rules kan IKKE cache et Worker-svar — Workeren kører FØR cachen. Det rigtige er **Workers Cache** (`[cache] enabled` i wrangler.toml), som svarer fra kanten uden at køre Workeren | `feed.xml` og `ads.txt` havde headerne i forvejen. `sitemap.xml`/`robots.txt` sætter selv `max-age=0` og caches derfor IKKE uden at blive lavet om til ruter | Timer | 🟡 Kræver wrangler-opgradering (4.66 kender ikke feltet) |
| **A4. KV som cache-aside foran D1** | Læs KV først, fald tilbage til D1, skriv gennem ved ændring | Kendt mønster; andre rapporterer 87-99,7% færre læste rækker | 1-2 dage | 🟡 Kun hvis A1+A2 ikke rækker |
| **A5. D1 read replication (Sessions API)** | Læsekopier i seks regioner, ingen ekstra pris | Løser **latens**, ikke kvote. Kræver Sessions API — ellers rammer alt stadig primæren | 0,5 dag | 🟡 Ja, men efter kvoten er løst |
| **A6. Statisk generering** (`generateStaticParams`) | Prægenerér atlet-, artikel- og skolesider | Nul D1-læsninger på den offentlige sti | Kræver at årsag 3 løses først | ⭐ Se lag C |

### Lag B — Hvor databasen bor (samme slags, andet sted)

| Mulighed | Hvornår den vinder | Vurdering her |
|---|---|---|
| **B1. Bliv på D1, betal Workers Paid ($5/md)** | Man er på Cloudflare og læser meget | ✅ **4,9 mia. rækker/md mod 25 mia. inkluderet — 5× luft.** Løser symptomet i dag |
| **B2. Turso / libSQL** | Man vil have SQLite uden platformbinding, eller embedded replicas i applikationsprocessen | ❌ Embedded replicas kan ikke bruges fra en Worker — netop den funktion, man betaler for, er utilgængelig. Dyrere pr. række ved vores læsemønster |
| **B3. Neon / Supabase Postgres + Hyperdrive** | Man har brug for rigtig SQL: window functions, CTE'er, fuldtekst, samtidige skrivere | ❌ **Aktivt værre her.** Neon fakturerer CU-timer: en 11,7-sekunders forespørgsel bliver til compute-tid, ikke en gratis fejl. Hyperdrive-cachen (max_age op til 1 time) ville dog skjule symptomet |
| **B4. SQLite i en Durable Object** | Per-tenant isolation, sharding, nul-hop læsning ved siden af compute | 🟡 Interessant på lang sigt hvis hvert land får sin egen base. 10 GB pr. objekt. Men det er en omskrivning af hele adgangslaget for et problem vi ikke har |
| **B5. Selvhostet SQLite + Litestream, eller Postgres på VPS (Hetzner)** | Én skriver, læsetungt, man vil eje driften | ❌ Vi ville bytte en kvotegrænse for patch-vinduer, oppetidsansvar og backup-verifikation. Ingen af de fire årsager forsvinder |

**Vigtigt:** Ingen af B2-B5 gør noget ved en forespørgsel der læser 2,1 mio.
rækker for at returnere 200. De ændrer kun, hvem der sender regningen, og hvor
hurtigt krydsproduktet udføres.

### Lag C — Om vi skal have en runtime-database på den offentlige sti

Det er det spørgsmål, der er værd at tage alvorligt, og det er ikke lag B.

Det offentlige indhold er 2.343 atleter, ~900 skoler og nogle hundrede
artikler, som ændres nogle få gange om dagen af en pipeline **vi selv styrer**.
Det er et **byggeartefakt**, ikke en forespørgselsarbejdsbyrde.

| Mulighed | Hvad det er | Vurdering |
|---|---|---|
| **C1. Pipeline udløser deploy; siderne prægenereres** | Pipeline færdig → `workflow_dispatch` → build læser D1 én gang → statiske sider. D1 bliver system-of-record for pipeline og admin, ikke for læsere | ⭐ **Mest robuste slutstadie.** Læsestien kan bogstaveligt talt ikke væltes af en kvote, en langsom forespørgsel eller en D1-hændelse |
| **C2. Læs-kun SQLite-fil som statisk asset, forespurgt i Workeren** | Byg en snapshot-fil, send den med i deployet | ❌ Sjovt, men 57 MB i en Worker-bundle og ingen admin-skrivning. Nej |
| **C3. Headless CMS (Payload, Sanity)** | Flyt indholdet til et redigeringsværktøj | ❌ Vi har en admin der passer til domænet, og indholdet skabes af en pipeline, ikke af redaktører. Ren tilføjelse af led |
| **C4. Delt sti: statisk offentligt, D1 til admin/pipeline** | C1, men admin og API-ruter læser D1 direkte som nu | ⭐ Den realistiske form af C1 |

**Prisen for C1/C4 er reel og skal siges højt:** i dag går en rettelse i `pages`
eller `site_content` live **uden deploy** — det er en egenskab, der er bygget
med vilje. Prægenerering bytter den for et deploy-trin (eller for
`revalidateTag()`, som kræver lag A2 alligevel).

> **Den egentlige arkitektoniske beslutning er derfor ikke «hvilken database».
> Den er: øjeblikkelige indholdsrettelser uden deploy, eller en læsesti der
> ikke kan væltes.** Vi har i dag den første og betaler med den anden.

Blokkeren for C1 er årsag 3: `headers()` på hver side. Vejen omkring den er
enten **ét Worker pr. land** (deploy pr. domæne, landet som byggekonstant) eller
**landepræfiksede statiske ruter** med en rewrite i middlewaren. Det første
passer bedst til `PLAYBOOK-nyt-land.md`, hvor hvert land alligevel har sin egen
zone, sine egne secrets og sit eget kø-navn.

### Lag D — Skil de fire arbejdsbyrder fra hinanden

Uafhængigt af alt andet: **én base, der bærer offentlig læsning,
pipeline-tilstand, analytics og admin, er én fælles fejlkilde med én fælles
kvote.**

| Mulighed | Vurdering |
|---|---|
| **D1. Flyt `pageviews` + `events` til Workers Analytics Engine** | ⭐ **Klarest gevinst efter lag A.** Formålsbygget til tidsserier, ubegrænset kardinalitet, billige skrivninger, SQL-API til udlæsning. Fjerner telemetri-skrivninger og analytics-scanninger fra indholdsbasen — og fjerner den eneste tabelfamilie, der vokser mod 10 GB-loftet |
| **D2. Egen D1-base til pipeline-tilstand** (`roster_checks`, `url_probes`, `stories`, `sources`) | ✅ Så kan en scrape-udvælger på 59 mio. rækker ikke tage læserne med sig. Additiv migration, lav risiko |
| **D3. Læsekopier til admin** | 🟡 Senere; admin er lavtrafik |

### Lag E — En anden platform helt

| Mulighed | Vurdering |
|---|---|
| **Vercel + Neon/Postgres** | ❌ Bedre ISR-ergonomi ud af boksen, men vi mister Workers-bindingen, Browser Rendering, Email Routing, Access og D1 — alt det `CLAUDE.md` og pipelinen bygger på. Dyrere ved crawler-trafik |
| **Fly.io / Railway + Postgres** | ❌ Regionale containere, ikke edge. Løser ingen af årsagerne |
| **Bliv på Cloudflare** | ✅ Platformen er ikke problemet. Den er faktisk usædvanligt godt tilpasset det her projekt |

---

## 6. Anbefalet rækkefølge

| Trin | Hvad | Indsats | Effekt |
|---|---|---|---|
| **0** | Workers Paid ($5/md) | Timer | Sitet kører igen. 5× luft i den inkluderede kvote. **Løser intet** |
| **1** | **`ANALYZE` først** — den alene gav 823× på den tungeste. Derefter forespørgslerne og Cache-Control på maskin-stierne | 1 dag | **Målt**: de fire tungeste faldt fra 1,8 mio.–59 mio. til 2.000–75.000 læste rækker |
| **2** | Konfigurér OpenNext-cachen (R2 + regional + DO-kø + tag cache) | 0,5-1 dag | ISR virker; `revalidate` bliver reel |
| **3** | `athletes.school_id` som fremmednøgle, bagudfyldt fra `university` | 2-4 dage | Dræber hele klassen af krydsprodukt-joins på tværs af ~100 kaldsteder |
| **4** | `pageviews` + `events` → Analytics Engine; pipeline-tabeller i egen base | 1-2 dage | Fjerner den fælles fejlkilde og væksten mod 10 GB |
| **5** | D1 read replication via Sessions API | 0,5 dag | Latens for UK/US-læsere. Gratis |
| **6** | *Beslutning*, ikke opgave: prægenerering (C1/C4) mod øjeblikkelige rettelser | — | Slutstadiet, hvis læsestien skal være uvæltelig |

**Trin 1-2 er dem, der betaler sig.** Alt efter trin 3 er forbedring, ikke
redning.

---

## 7. Hvad ville ændre svaret

Vurderingen ovenfor gælder **dette** datasæt og **dette** læsemønster. Den skal
tages op igen, hvis noget af det her sker:

- **Databasen nærmer sig 2-3 GB** (loftet er 10 GB og kan ikke hæves). Med
  lande nummer tre og fire og analytics i samme base er det ikke fjernt.
- **Vi får brug for rigtig SQL** — fuldtekstsøgning på tværs af artikler,
  window functions, rekursive CTE'er. Så begynder Postgres at fortjene samtalen.
- **Skrivninger bliver samtidige.** I dag skriver præcis én pipeline ad gangen.
  Flere lande × flere kørsler kan ændre det, og D1 har én primær.
- **Læsere uden for Europa bliver et reelt publikum.** Så er lag A5 ikke
  længere kosmetik.

---

## 7b. Udført 2026-09-02 (trin 1 og 2)

| Gjort | Hvor |
|---|---|
| Fire af de fem forespørgsler omskrevet, så de ikke længere AFHÆNGER af at planlæggeren vælger rigtigt | `src/lib/db.ts` (×2), `pipeline/scrape/scrape-js-rosters.ts`, `pipeline/scrape/school-colors.ts` |
| Migration 048: `ANALYZE` + to sammensatte indekser | `db/migration-048-analyze.sql` — **ikke kørt endnu** |
| `Cache-Control` overalt: `private` til læsersider, `no-store` til admin og MCP | `src/middleware.ts`, `src/lib/mcp-http.ts` |
| Workers Cache slået til i konfigurationen | `wrangler.toml` — **uden virkning indtil wrangler opgraderes** |

Den femte forespørgsel (`quality-sweep`, 49 mio./7d) er urørt med vilje: den
skannede `schools`, fordi `schools.name` manglede et indeks, og det gav 047.

**Ækvivalensen er bevist, ikke antaget.** Alle fire omskrivninger blev kørt mod
en fixture bygget af de tilfælde der plejer at vælte en omskrivning — alumner,
et andet lands atleter, en skole uden atleter, en atlet hvis universitet ikke
findes, og TO SKOLER MED SAMME NAVN (dubletnavne findes i basen). Gammel og ny
gav identiske rækker i identisk rækkefølge i alle fire.

### Målt efter migrationen — og estimatet holdt ikke

Migration 048 blev kørt 2026-09-02 kl. ~13 (1.388.442 læste rækker, 5.387
skrevne). Derefter er hver forespørgsel målt direkte mod produktion via
`meta.rows_read`:

| Forespørgsel | Før, uden statistik | GAMMEL form efter `ANALYZE` | NY form |
|---|---|---|---|
| `getAllSchoolSlugs` | 1.794.155 | **2.180** | 2.010 |
| `getSchoolsWithAthletes` | 332.117 | **2.180** | 3.941 |
| `school-colors` | 4.451.314 | ikke kørt | 4.619 |
| `scrape-js-rosters` | 58.951.220 | ikke kørt | **74.533** |

**`ANALYZE` var rettelsen — ikke omskrivningerne.** Det er den ubehagelige,
men rigtige konklusion. Den GAMLE `getAllSchoolSlugs` læser nu 2.180 rækker
mod 1.794.155: **823 gange bedre af statistik alene.** 047 lagde indekserne,
men uden `sqlite_stat1` valgte planlæggeren dem ikke, og det var hele
forskellen. Havde `ANALYZE` været kørt 2026-09-02 kl. 08:28 sammen med 047,
var kvoten formentlig aldrig blevet ramt igen.

To ærlige konsekvenser:

1. **`getSchoolsWithAthletes` blev en smule VÆRRE af omskrivningen** — 3.941
   mod 2.180 rækker. Den afledte tabel grupperer alle landets aktive atleter
   FØR joinet, hvor planlæggeren med statistik klarer originalen billigere.
   Begge tal er trivielle, og formen er bevaret som forsikring (se nedenfor),
   men det skal ikke stå som en forbedring.

2. **`scrape-js-rosters` er den omskrivning der bar sig selv**: 74.533 mod
   58.951.220 rækker, **790 gange bedre**. Den korrelerede `EXISTS` stod to
   gange og blev evalueret to gange pr. række — det er STRUKTUR, og ingen
   statistik retter struktur. Den ene rettelse var værd hele øvelsen.

`school-colors`' gamle form er ikke målt: den ville koste 4,45 mio. læste
rækker, og fordelingen mellem `ANALYZE` og omskrivningen er derfor uafklaret
for netop den.

**Hvorfor omskrivningerne bliver stående alligevel.** Alle fire tal ligger nu
mellem 2.000 og 75.000 rækker, altså i støjen. Forskellen er hvad de AFHÆNGER
af: originalerne er kun billige, så længe statistikken er frisk, og
statistikken var netop det enkelte punkt der svigtede. Et nyt land, der fylder
`athletes` op, kan sende dem tilbage til 1,8 mio. De omskrevne former er
billige uanset hvad planlæggeren tror. Det er billig forsikring — men det er
forsikring, ikke gevinsten.

⚠️ **`ANALYZE` skal køres igen** efter store dataændringer. Det er nu den
vigtigste tilbagevendende opgave i hele datalaget, og der findes ingen
automatik for den. Overvej at lægge den i ugekørslen.

⚠️ **Et symptom værd at kende igen**: mens kvoten var spærret, svarede
`/sitemap.xml` med **57 URL'er** i stedet for tusinder — og med 200 OK. Alle
tre slug-opslag ramte `catch { return [] }`, og et tomt svar ser ud som et
gyldigt svar. Begge domæner leverede samtidig det SAMME sitemap, altså netop
den dublet landefiltret skulle fjerne. Google fik det. Det er den samme
fejlklasse som 404-erne: **en databasefejl må ikke se ud som «ingenting».**

---

## 8. Hvad der ikke er verificeret

Ærligt regnskab over det, tallene ovenfor *ikke* dækker:

- `d1 insights` er en **eksperimentel** kommando og viser top-5. De resterende
  ~5% læste rækker er ikke kortlagt.
- **Rækketal pr. tabel kunne ikke slås op** — kontoen var kvotespærret under
  undersøgelsen. `~900 skoler` er afledt af `2.123.731 / 2.343 atleter`.
  `2.343` stammer fra kommentaren i `src/app/atleter/page.tsx` (26-08).
- **-90-95%** i trin 1 er et estimat ud fra, at top-5 udgør ~927 mio. af
  forbruget på syv dage. Det bør måles efter rettelsen, ikke antages.
- Den lokale `.wrangler`-SQLite er tom (4 KB); dev læser remote eller mock.
  Der findes ingen lokal kopi at måle på.

---

## Kilder

- [D1 enforces free tier daily query limits — Cloudflare Changelog](https://developers.cloudflare.com/changelog/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) · [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [D1 global read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/) · [Sequential consistency without borders](https://blog.cloudflare.com/d1-read-replication-beta/)
- [OpenNext Cloudflare — Caching](https://opennext.js.org/cloudflare/caching)
- [SQLite-backed Durable Object Storage](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) · [SQLite in DO GA, 10GB](https://developers.cloudflare.com/changelog/post/2025-04-07-sqlite-in-durable-objects-ga/)
- [Hyperdrive query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/) · [Using Hyperdrive with Neon](https://neon.com/blog/hyperdrive-neon-faq)
- [Introducing Workers Analytics Engine](https://blog.cloudflare.com/workers-analytics-engine/) · [Choosing a data or storage product](https://developers.cloudflare.com/workers/platform/storage-options/)
- [Three-tier cache on D1: reducing read rows](https://zenn.dev/jphfa/articles/cloudflare-d1-three-tier-cache?locale=en) · [How I reduced my D1 daily row reads by 99.7%](https://medium.com/growthhacker-insider/how-i-reduced-my-d1-daily-row-reads-by-99-7-on-cloudflare-6199f9620a7f)
- [Turso vs Cloudflare D1 (2026)](https://gautamkhorana.com/serverless-databases/compare/turso-vs-cloudflare-d1/) · [5 Cloudflare D1 alternatives](https://telnyx.com/resources/cloudflare-d1-alternatives)
- [Neon pricing 2026](https://swyftstack.com/blog/neon-pricing-explained) · [LiteFS vs Litestream vs rqlite on VPS](https://onidel.com/blog/sqlite-replication-vps-2025)
- [Next.js — Incremental Static Regeneration](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
