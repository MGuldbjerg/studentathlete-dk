# Playbook: nyt land på motoren

**Skrevet efter UK-launchen 2026-08-04. Udvidet 2026-09-15 med DISTRIBUTION —
konti, kort og kanaler (§7) — som ikke fandtes da den blev skrevet: UK fik sin
Bluesky-kanal 31. august, og Instagram kom til 15. september. Læs den FØR du
rører noget, og følg rækkefølgen.**

Dette er ikke UK-dokumentation (den ligger i `SETUP-uk-launch.md`). Dette er den
generelle opskrift, destilleret af hvad der faktisk gik galt, og hvad der faktisk
virkede. Forudsætter `ARKITEKTUR-motor.md` — læs den først.

---

## 0. Den ene ting du skal forstå først

**Registrering i `COUNTRIES` er det FARLIGSTE trin, ikke det første.**

I samme sekund et land står i `COUNTRIES`, begynder roster-scrapen at indsætte
dets atleter i den levende `athletes`-tabel — og alt nedstrøms, der ikke
filtrerer på land, begynder at behandle dem som om de hørte til standardsitet.

Ved UK opdagede vi i tide, at `pipeline/discover/check-sources.ts` vælger atleter
på `active = 1` uden landefilter. Var UK tændt først, ville discovery have fundet
historier om briter, og genereringen — dengang med dansk prompt hardkodet —
ville have lagt **danske artikler om britiske atleter** i den danske kladdekø.

Kør derfor denne FØR du registrerer noget:

```bash
grep -rn "FROM athletes\|FROM articles" pipeline/ src/ --include=*.ts \
  | grep -v "home_country\|a.country\|articles.country"
```

For hvert fund: **skal det her vide hvilket land, eller er det ligegyldigt?**
Discovery SKAL være landeagnostisk (den overvåger skolefeeds — en skole er
interessant så snart den har én aktiv atlet). Genereringen SKAL kende landet
(det er dér sprog og site vælges). Filtrér kun hvor svaret er ja.

---

## 1. Rækkefølgen (bindende hvor markeret)

| # | Trin | Bindende? | Lead time |
|---|------|-----------|-----------|
| 1 | Landeprofil + sprogpakke + profil-grammatik | — | timer |
| 2 | Prompts på sproget | **FØR 5** | timer |
| 3 | Generering landebevidst | **FØR 5** | timer |
| 4 | Absolut-URL-audit (se §3) | **FØR 8** | ½ time |
| 5 | **Registrér i `COUNTRIES`** | — | **uger at konvergere** |
| 6 | UI-strenge + `site_content`/`pages` pr. land | FØR 8 | 1 dag |
| 7 | Indhold: statiske sider, sport-tekster, guider | FØR 9 | 1-2 dage |
| 8 | Zone + DNS + route + deploy (dark launch, §5) | — | timer (NS-propagering) |
| 9 | Generér + gennemlæs artikler | — | uger |
| 10 | AdSense-site, e-mail routing | — | timer |
| 11 | **Distribution: konti, secrets, kanal, kort (§7)** | FØR 12 | dage (konti kan hænge) |
| 12 | Offentligt push | — | — |

**Trin 5 skal ske så TIDLIGT som det er forsvarligt** (altså lige efter 2 og 3),
fordi det er det eneste trin med uger af ventetid: scraperen roterer gennem
~1.700 skoler, tager ~1t45m pr. kørsel og fanger kun en del hver gang. Ved UK
gav første kørsel 145 atleter, anden 212. Sæt en midlertidig natlig cron på
`weekly-scrape.yml` under opstarten — og **husk at fjerne den igen**.

Alt andet kan laves mens scrapen kører.

---

## 2. Fælder — med det symptom der afslører dem

Alle er ramt i praksis. Symptomet er vigtigere end forklaringen: det er dét, du
ser først.

| Symptom | Årsag | Fix |
|---|---|---|
| Danske artikler om udenlandske atleter i kladdekøen | `check-sources.ts` filtrerer ikke på land | Gør GENERERINGEN landebevidst, ikke discovery |
| `wrangler deploy` fejler på autorisation efter ny route | API-tokenet dækker ikke den nye zone | Tilføj zonen til tokenet SAMTIDIG med at du opretter den |
| Seed-script fejler efter en migration | `ON CONFLICT(key)` matcher ikke længere en nøgle. **I SQLite er det en HÅRD FEJL, ikke en no-op** | `grep -rn "ON CONFLICT"` i HELE repoet efter enhver PK-/unique-ændring |
| Begge sites viser samme titel/footer/side | `site_content` og `pages` havde globalt unikke nøgler | Nøgle = (key/slug, country). Migration 037 + 038 |
| Sprogtest på ny vært giver standardsproget | **`wrangler dev` videresender IKKE Host-headeren** (hverken lokal eller `--remote`) | Test med `next dev` — se §4 |
| Alt ser tomt ud i dev | `next dev` har TOM lokal D1 | Brug `wrangler dev --remote` når du skal se rigtige data |
| Nyt site indekseres ikke af Google | `BASE_URL` er en modul-konstant → canonical/sitemap/robots/feed peger på standardsitet. **Fejler LYDLØST — siderne renderer perfekt** | `currentBaseUrl()` i alt der udsender absolutte URL'er |
| Det nye site viser standardsitets atleter, og de to sitemaps har PRÆCIS samme antal URL'er | **`siteCountry()`s default var en KONSTANT, ikke værten** — filtrene fandtes, men ingen kalder sendte et land med (LØST 2026-08-05) | Defaulten slår nu landet op via `currentSite()`. Sender du et land eksplicit, vinder det |
| Det andet lands URL'er svarer 200 med "Side ikke fundet" | Soft 404: `loading.tsx` streamer 200, før `notFound()` når at sætte status. **Gælder også helt ukendte stier på standardsitet — ældre fejl, ikke ny** | Ikke løst. Rigtig vej: slå op i middlewaren (som atlet-aliasserne) og svar 301 til det rigtige site |
| Sitet er noindex overalt — undtagen på de sider der har mest indhold | Enkelte sider hårdkoder `robots: { index: true }` i deres metadata og **overskriver layoutet** | `siteRobots()` fra `site-server.ts`; statisk `metadata` må slet ikke sætte `robots` |
| Nyt site sender standardsitets sprog i `<title>`, meta og footer | `site_content` har ingen rækker for landet, og **kode-defaults i `site-content.ts` er skrevet på standardsitets sprog** | Seed `site_content` for landet FØR domænet peger på sitet |
| Danske ord på kort/skabeloner på det nye site | Enkelt dansk tabel (fx `ARTICLE_TYPE_LABELS`) uden for sprogpakken | Flyt til `LanguagePack` |
| Ny route rammer catch-all'en efter deploy | Forældet route-manifest i buildet | `rm -rf .next .open-next` før `npm run deploy` |
| **STANDARDSITET NXDOMAIN'er efter et deploy** (DNS_PROBE_FINISHED_NXDOMAIN) | **`custom_domain = true` i `wrangler.toml` er en FULDSTÆNDIG liste.** Wrangler afkobler hver custom domain der ikke står i den — og Cloudflare sletter den DNS-record tilknytningen ejede. Standardsitets apex lå som custom domain uden at stå i filen, så den forsvandt ved næste deploy | Enten: erklær ALLE værter som custom domains. Eller (valgt her): brug route-mønstre + **manuelle** proxied placeholder-records, som wrangler ikke ejer og derfor ikke rører |
| **En kladde handler om et ANDET menneske med samme efternavn** | Et efternavns-match scorer 35, og `MIN_RELEVANCE` er 30 — nok til at generere. Ingen promptregel kan redde det: modellen får en atlet-blok om ét menneske og et faktaark om et andet | `MIN_RELEVANCE_GENERATE = 60` + `identity-guard.ts` (fornavn skal stå i kilden; modsatte stedord/anden sport blokerer). Efternavn alene må OVERVÅGES, aldrig skrives om |
| **Standardsitets sociale konti poster en artikel fra det nye land** | Kanalerne kendte ikke deres eget land: kø-forespørgslen tog ENHVER publiceret artikel. En kanal er en KONTO i ét land, ikke en platform | `country` på `SocialChannel` + `a.country = ch.country` i enqueue, og `distributionAllowed()` spærrer for lande med `darkLaunch` |
| Verifikationen siger 200, men brugeren får NXDOMAIN | `curl --resolve VÆRT:443:IP` springer DNS over. Den beviser at Workeren svarer — ikke at domænet kan slås op | Tjek ALTID opslaget separat: `curl -s "https://dns.google/resolve?name=VÆRT&type=A"` skal give svar for både A og AAAA |
| Redirect giver 200 med `<meta refresh>` i stedet for 301 | `loading.tsx` streamer 200 før siden kan sætte status | Redirects hører i `src/middleware.ts`, ALDRIG i en side |
| Track-POST giver 204 men ingen række | `ANALYTICS_EXCLUDE_IPS` dropper Mikkels eget net | Test INSERT direkte mod D1 i stedet |
| **Landets kanal mangler i loggens «Kanaler: …», og intet fejler** | Secrets lå i GitHub, men workflowet mappede dem aldrig ind i jobbets `env`. `isConfigured()` er false, kanalen springes over, exit 0. En ukonfigureret kanal SKAL forsvinde lydløst (secrets kommer gradvist) — men det gør en manglende ledningsføring umulig at skelne fra «ikke sat op endnu» | env-linjer i `social-post.yml` SAMTIDIG med secret'et. Kørslen siger nu også højt hvad den springer over |
| **Artikler udløber i social-køen med `attempts = 0`** | Drænet postede ét opslag pr. kørsel, og cron'en fyrer 6-8 gange i døgnet — ikke 24. Kapaciteten var ~12 opslag pr. 48 t, og 48 t er udløbsgrænsen. **Et nyt land udgiver i klumper** (25 artikler ved UK's launch), og alt over kapaciteten forsvandt tavst | Pacingen svarer med et ANTAL og kender sin deadline (`postsAllowedNow`). Tjek efter et launch-brag: `SELECT status, COUNT(*) FROM social_posts GROUP BY status` |
| **Email Routing-wizarden kan ikke aktiveres på det nye domæne** | Registratoren leverer MX som standard (`mx.simply.com` + egen SPF), og de blokerer wizarden | Erstat MX med `route1/2/3.mx.cloudflare.net` + Cloudflares SPF, behold `_dmarc`. **Det kommer igen på hvert nyt domæne** |
| **Et script du ændrede skrev i produktion uden at nogen godkendte noget** | Scriptet kører på en cron. At ændre en STANDARDVÆRDI i noget Actions kører hver time ER en produktionsskrivning — bare forsinket en time. 15. september skrev en timevis kørsel 94 kort (11 MB) i D1 på den måde | `grep -rl "<script>" .github/workflows/` FØR push. Er der et `schedule:`, så behandl ændringen som den handling den udfører |
| Ændring "virker ikke" 10 sek. efter deploy | Edge-propagering tager 1-2 min | Vent og prøv igen, før du konkluderer |

### Fælder ved AUTOMATISK søg-og-erstat

To fejl i træk kom fra scriptet find-replace. Begge var gyldig TypeScript og
blev ikke fanget af `tsc`:

- `title="Læs også"` → `title=t(...)` — **JSX-attributter skal have krøllede
  parenteser**: `title={t(...)}`.
- `${BASE_URL}` → `${base}` i en fil der ALLEREDE havde en variabel `base`
  (sidetitlen). Resultat: canonical blev `https://…/All%20articles/artikler`.

**Regel: efter enhver scriptet erstatning, kør en OUTPUT-test, ikke kun `tsc`.**
Typechecken kan ikke se, at du har ramt den forkerte variabel.

---

## 3. Absolut-URL-audit (gør det FØR domænet peger på noget)

Den dyreste fejl i UK-forløbet blev fundet ved et tilfælde, dagen før DNS.

```bash
grep -rn "BASE_URL" src/ --include=*.ts --include=*.tsx | grep -v "lib/seo.ts"
```

Alt der udsender en **absolut** URL skal bruge `currentBaseUrl()` fra
`src/lib/site-server.ts`, ikke modul-konstanten: `metadataBase` i layout,
`sitemap.ts`, `robots.ts`, `feed.xml`, canonical-tags, JSON-LD.

Verificér pr. vært:

```bash
curl -s -H "Host: NYT.DOMÆNE" -H "x-forwarded-proto: https" \
  http://127.0.0.1:3000/artikler | grep -o 'rel="canonical" href="[^"]*"'
curl -s -H "Host: NYT.DOMÆNE" -H "x-forwarded-proto: https" \
  http://127.0.0.1:3000/robots.txt | grep -i sitemap
```

Begge skal nævne det NYE domæne. Gør de ikke det, er sitet en dublet af
standardsitet i Googles øjne — og det opdager du aldrig ved at kigge på siden.

---

## 4. Sådan tester du vært-afhængig adfærd (den eneste metode der virker)

```bash
npx next dev -p 3000 &
# KONTROL FØRST — uden denne beviser testen ingenting:
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Host: www.STANDARDSITE" -H "x-forwarded-proto: https" http://127.0.0.1:3000/
# → skal være 301. Er den 200, når Host-headeren ikke frem, og alt nedenfor er værdiløst.

curl -s -H "Host: NYT.DOMÆNE" -H "x-forwarded-proto: https" http://127.0.0.1:3000/ \
  | grep -o '<html lang="[a-z]*"'
```

`x-forwarded-proto: https` er nødvendig, ellers 301'er middlewaren til https.

**`wrangler dev` kan IKKE bruges til dette** — hverken lokalt eller med
`--remote`. Den videresender ikke Host-headeren. Brug den kun når du har brug
for rigtige D1-data, og så uden vært-antagelser.

---

## 5. Dark launch — Mikkels valgte mønster (gør det samme igen)

Mikkel bekræftede dark launch som fremgangsmåden ved UK. Antag det samme næste
gang, medmindre han siger andet:

1. Domænet peger på sitet, men der er **ingen artikler endnu** og intet push.
2. Scrapen har kørt i uger, så atleterne findes.
3. Generér de første artikler og **læs dem grundigt** — sproget er nyt for
   gratis-kæden, og kvaliteten er kun verificeret på dansk.
4. Når der ligger ~15-20 publicerede artikler: begynd distribution.

Under dark launch er det i orden at sitet er tyndt. Det er IKKE i orden at
canonical/sitemap peger forkert (§3) — indekseringsskaden sker med det samme.

**Dark launch spærrer to ting, ikke én: indeksering OG distribution.** Det blev
lært den hårde vej 2026-08-05 — de danske sociale konti nåede at poste en
britisk artikel, fordi `darkLaunch` kun var kendt af `robots`/metadata. Spærren
ligger nu også i social-køen (`distributionAllowed()`), og den gælder uanset om
nogen senere opretter en konto for landet.

**`noindex` under dark launch er IKKE valgfrit** (rettet efter UK 2026-08-05).
Så længe motoren ikke filtrerer indholdet på land, viser det nye site
standardsitets atleter — altså en ægte dublet, ikke bare en tynd side. Sæt
`darkLaunch: true` i landeprofilen. Den slår tre ting til på én gang:

- `robots.txt` → `Disallow: /` (`src/app/robots.ts`)
- `X-Robots-Tag: noindex, nofollow` på hvert svar (`src/middleware.ts`) — den
  dækker også de sider der sætter deres egen `robots`-metadata
- `robots: { index: false }` i layoutets metadata + `siteRobots()` på siderne

Verificér ALLE TRE, og verificér samtidig at standardsitet stadig er indekserbart:

```bash
curl -s https://NYT.DOMÆNE/robots.txt | tail -3          # → Disallow: /
curl -sI https://NYT.DOMÆNE/ | grep -i x-robots-tag      # → noindex, nofollow
curl -s https://NYT.DOMÆNE/EN-SIDE | grep -o '<meta name="robots"[^>]*'
curl -sI https://STANDARDSITE/ | grep -i x-robots-tag    # → INTET output
```

Slå `darkLaunch` fra igen i samme ombæring som landefiltreringen — ikke før.

---

## 6. Indhold: hvad kan oversættes, og hvad skal skrives om

Jeg tog fejl på dette ved UK og korrigerede det bagefter. Lær af det:

- **Kan oversættes**: alt der forklarer det AMERIKANSKE system — divisioner,
  conferences, transfer portal, sæsonkalender, mesterskabsformater, ordbog.
  Landet er en tynd ramme, ikke en faktuel afhængighed. Det var 11 af 13 guider.
- **Skal skrives om med research**: alt der handler om HJEMLANDET — optagelses-
  krav (skolesystem, karakterer, hvilke fag der tæller), sammenligning med
  hjemlandets universitetssystem, veje ind i sporten.
- **Skal skrives om, ikke oversættes**: sport-pillartekster. De danske indeholder
  danske navne; et andet land skal have sine egne. Sæsonstruktur og kampformater
  er derimod landeneutrale og kan genbruges ordret — de er faktatjekkede.

**Navne på atleter: web-verificér HVER ENKELT, eller lad være med at nævne dem.**
Ved UK blev tre verificeret og brugt; ti sportsgrene fik bevidst ingen navne.
En opdigtet national NCAA-stjerne er præcis den fejl sitet er bygget for at undgå.

---

## 7. Distribution: konti, kort og kanaler

**Denne sektion fandtes ikke ved UK-launchen.** UK stod ude af dark launch 21.
august med 25 publicerede artikler og **ingen konto at poste dem fra** — der gik
ti dage. Læg distributionen ind i planen fra begyndelsen; konti er det eneste
her der kan hænge i dagevis af grunde du ikke selv styrer.

### Den ene regel

**En kanal er en KONTO, ikke en platform.** Den danske Bluesky-konto og den
britiske deler kode og intet andet: eget kanalnavn (pacing slås op på navnet),
egne secrets med EGNE VARIABELNAVNE, eget land. Deler to lande variabelnavn,
giver et glemt secret ikke en fejl — det giver **et opslag fra den forkerte
konto**. Det skete 5. august.

### Rækkefølgen

| # | Trin | Bindende? | Lead time |
|---|------|-----------|-----------|
| D1 | Opret konti — én pr. platform pr. land | — | timer til dage |
| D2 | Secrets med landets egne navne (`BLUESKY_XX_HANDLE`, …) | FØR D4 | minutter |
| D3 | **env-linjer i `social-post.yml`** | **FØR D4** | minutter |
| D4 | Kanal i `ALL_CHANNELS` med `country` + `cardKind` | — | ½ time |
| D5 | Kort renderet for landet | FØR D6 | minutter |
| D6 | **Verificér med dry-run** (se nedenfor) | — | minutter |

D3 før D4 er ikke kosmetik — se fælden nedenfor.

### Meta (Facebook + Instagram) — hvad der faktisk koster tid

- **Koblingen Side↔Instagram er 1:1.** Et nyt land kan IKKE hænge på
  standardsitets Facebook-side. Det skal have **sin egen Facebook-side OG sin
  egen Instagram-konto**. Regn med det i planlægningen; det er to konti mere,
  ikke én.
- **Instagram kræver en professionel konto** koblet til Siden — og koblingen
  skal laves i Business Suite eller fra Instagram-appens «Side»-felt.
  **Accounts Center er en anden ting og tæller ikke** — API'et kan ikke se den.
- **App Review er IKKE nødvendig**, når I poster til jeres egen konto: tilføj
  kontoen som *Instagram Tester* på appen og publicér fra Development Mode.
  Ellers venter I 2-4 uger uden grund.
- **Instagram-permissions findes først når appen har use case'et.** Er
  Explorer-dropdownen tom, når du søger `instagram_content_publish`, mangler
  **Instagram → API setup with Facebook Login → «Add all required permissions»**
  i App Dashboard. Page-permissions er en SEPARAT gruppe, som du selv skal
  tilføje bagefter.
- **En tilføjet permission ændrer ikke et token du allerede har.** Klik
  *Generate Access Token* igen. Det fanger alle.

### 🔑 Spørg API'et, ikke UI'et

15. september brugte vi en time på Business Suite, som viste «login required»,
«din konto er begrænset» og «brugernavnet hører ikke til profilen». **Ingen af
delene betød noget.** Den kobling API'et læser er Sidens, ikke Suitens, og den
var på plads hele tiden.

```bash
# Ground truth #1 — hvad kan tokenet egentlig?
me/permissions
# Ground truth #2 — er kontoen koblet? (spørg SIDEN direkte;
# me/accounts kan være tom hvis pages_show_list mangler)
<SIDE_ID>?fields=name,instagram_business_account
```

Kommer der et `instagram_business_account.id` (17-cifret, starter med `17841`),
er koblingen ægte — uanset hvad Business Suite påstår.

⚠️ **Bliver kontoen «midlertidigt begrænset»: STOP.** Hvert nyt forsøg logges og
forlænger blokeringen; anden og tredje blokering springer fra 24-48 timer til
7-14 dage. En konto der har ligget i dvale, bliver flagget netop når den
pludselig kun laver administrative handlinger. Lad den ligge et døgn, brug den
normalt i appen imens.

### Kortene

- **Instagram tager KUN JPEG**, formforhold 4:5 til 1.91:1, bredde 320-1440.
  Sitets egne kort er WebP i 1200×630 og kan ikke bruges.
- Derfor to lærreder i `CARD_FORMATS`: `landscape` (delekort) og `portrait`
  (1080×1350 JPEG). **Målt:** samme kort vejer 35 KB som WebP mod 47 KB som
  mozjpeg-JPEG — sitet skal IKKE skifte til JPEG for at have ét format.
- `cardKind` på kanalen afgør både hvilket billede der sendes, **og hvornår en
  artikel er klar**. Instagram venter på `ig-<id>-v<N>`, resten på
  `card-<id>-v<N>`.
- **Portræt-kort renderes kun for lande der HAR en Instagram-kanal.** Det slås
  op i kanal-registeret, så et nyt land begynder af sig selv den dag kanalen
  findes. Du skal intet gøre — men kortene skal være renderet FØR første opslag,
  ellers står køen og venter på et billede der svarer 404.

### Sproget i opslaget og på kortet

- **Bluesky-opslag mærkes med `langs` fra landeprofilen.** Et engelsk opslag
  mærket `da` bliver **skjult af Blueskys eget sprogfilter** for netop de
  læsere det er skrevet til. Det er ikke kosmetik.
- **`fact_sheet` er skrevet på KILDENS sprog — amerikansk.** Kortet gengav
  `outcome` og `date` råt, så danske kort sagde «win» og «Sep. 01, 2026».
  Nye sprogpakker skal definere `card.versus`, `card.outcome_win/loss/tie` og
  `social.link_in_bio`; `_ui-strings-test` fejler hvis en nøgle mangler.
- **Instagram-captions har ingen klikbare links.** Captionen henviser til
  bio-linket, og bio-linket er `/<arkivsti>?kilde=xx` — **ikke en særlig side**.
  Arkivet er allerede «seneste artikler, pagineret, mobil-først», sidetallet er
  sprogstyret, og `Analytics.tsx` plukker `?kilde=` på enhver sidevisning.

### Verifikation — den eneste der beviser noget

```bash
gh workflow run social-post.yml -f dry_run=true
# I loggen SKAL landets kanal stå i «Kanaler: …».
# Står den under «Springes over (mangler secrets i miljøet)», er D3 ikke gjort.
```

```bash
# Kortet skal kunne hentes UDEFRA — Meta henter det selv ud fra image_url
curl -sI "https://<VÆRT>/api/og?type=ig&article=<ID>" | head -3
# → 200 og image/jpeg. 404 = render-cards har ikke kørt for landet.
```

---

## 8. Tjekliste før du siger "klar"

- [ ] `grep`-audit for landefiltre (§0) kørt og hver forekomst vurderet
- [ ] `grep`-audit for `ON CONFLICT` efter enhver skemaændring
- [ ] Absolut-URL-audit (§3) — canonical, sitemap, robots, feed pr. vært
- [ ] Vært-test med `next dev` + kontrol-301 (§4)
- [ ] Standardsitet regressionstestet efter HVER deploy (mindst 10 ruter)
- [ ] Sprogpakke komplet — `_ui-strings-test.ts` grøn
- [ ] Statiske sider, sport-tekster og guider findes på det nye sprog
- [ ] API-token dækker den nye zone — **eller** brug `custom_domain = true` i
      `wrangler.toml` (Cloudflare opretter så selv DNS-record + certifikat gennem
      Workers-API'et; tokenet behøver ingen DNS-rettighed på zonen)
- [ ] `site_content` seedet for landet (ellers falder sitet tilbage på
      standardsitets sprog i titel, meta og footer)
- [ ] `darkLaunch: true` i landeprofilen, og alle tre spærringer verificeret (§5)
- [ ] Migrationer kørt mod remote FØR deploy af kode der bruger dem
- [ ] Midlertidig natlig cron noteret til senere fjernelse
- [ ] **Distribution (§7)**: konti oprettet, secrets med landets egne navne,
      env-linjer i `social-post.yml`, kanal i `ALL_CHANNELS` med `country` +
      `cardKind`
- [ ] **Dry-run kørt, og landets kanal STÅR i «Kanaler: …»** — ikke under
      «Springes over»
- [ ] Kort renderet for landet og hentbart udefra (`curl -sI …?type=ig` → 200)
- [ ] Sprogpakken har `card.versus`, `card.outcome_*`, `social.link_in_bio`
- [ ] Bio-linket peger på arkivet med `?kilde=` — ikke på en nybygget side
- [ ] Tjekket om ændringer til pipeline-scripts udløser en cron-kørsel

---

## 9. Hvad der IKKE er løst (arv til næste land)

- **Rute-navnene er danske mapper**: `/atleter`, `/viden`, `/skoler`, `/artikler`
  gælder alle sites. Sport-sluggene er sprogstyrede og virker; resten er ikke.
  Løsning ville være engelske alias-ruter med redirects.
- **Admin er dansk** og redigerer det site, den tilgås FRA. Det er bevidst
  (én bruger), men det betyder at UK-tekster kun kan redigeres på UK-værten.
- **`/viden`-hub'en falder tilbage til kode-defaults** hvis D1 er tom for landet.
  Tjek at hub'en ikke er tom på det nye site før launch.
- ~~Landefiltrering af de læservendte queries~~ **LØST 2026-08-05** og gælder
  alle fremtidige lande: `siteCountry()` i `src/lib/db.ts` afgør landet ud fra
  værten. Nye queries skal stadig selv tilføje `AND a.country = ?` /
  `AND home_country = ?` — helper'en giver koden, ikke filtret.
- **Soft 404**: det andet lands URL'er (og alle ukendte stier) svarer 200 med
  "Side ikke fundet". Se fældetabellen.
- **Kold isolate = `exceededCpu` på et lavtrafik-domæne.** Meta's crawler ramte
  `student-athlete.co.uk` med 50 fejl ud af 50, alle `exceededCpu` ved 10 ms, fra
  Chicago. Siden er ikke langsom — isolaten er kold, og `.co.uk` har ingen
  trafik i USA, så hver crawl instantierer Workeren forfra inden for 10 ms.
  **Et tredje land arver det på dag ét.** Ingen SQL- eller cache-rettelse
  hjælper; en crawl er cache-misses by design. De to reelle veje er Workers Paid
  ($5/md, 10 ms → 30 s) eller pre-generering. At blokere Meta's crawler ville
  virke og er den forkerte handel — det er den der tegner link-forhåndsvisningen
  på Facebook, Instagram og WhatsApp.
- **Kun `.dk`-tokenet kan røre DNS.** `CLOUDFLARE_API_TOKEN` = Workers på
  kontoniveau, ingen DNS. `CLOUDFLARE_EMAIL_TOKEN` = DNS + Email Routing, men
  kun på zonen `studentathlete.dk`. Email routing på et nyt domæne kræver
  derfor enten dashboardet eller et bredere token.
