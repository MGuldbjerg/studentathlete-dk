# Playbook: nyt land på motoren

**Skrevet efter UK-launchen 2026-08-04. Skrevet til den næste session — læs den FØR du rører noget, og følg rækkefølgen.**

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
| 11 | Offentligt push | — | — |

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
| Det nye site viser standardsitets atleter, og de to sitemaps har PRÆCIS samme antal URL'er | **De læservendte queries i `src/lib/db.ts` filtrerer ikke på land** — `articles.country`/`athletes.home_country` findes, men bruges ikke | Filtrér på `(await currentSite()).code`. Indtil da: `darkLaunch` (se nedenfor) |
| Sitet er noindex overalt — undtagen på de sider der har mest indhold | Enkelte sider hårdkoder `robots: { index: true }` i deres metadata og **overskriver layoutet** | `siteRobots()` fra `site-server.ts`; statisk `metadata` må slet ikke sætte `robots` |
| Nyt site sender standardsitets sprog i `<title>`, meta og footer | `site_content` har ingen rækker for landet, og **kode-defaults i `site-content.ts` er skrevet på standardsitets sprog** | Seed `site_content` for landet FØR domænet peger på sitet |
| Danske ord på kort/skabeloner på det nye site | Enkelt dansk tabel (fx `ARTICLE_TYPE_LABELS`) uden for sprogpakken | Flyt til `LanguagePack` |
| Ny route rammer catch-all'en efter deploy | Forældet route-manifest i buildet | `rm -rf .next .open-next` før `npm run deploy` |
| Redirect giver 200 med `<meta refresh>` i stedet for 301 | `loading.tsx` streamer 200 før siden kan sætte status | Redirects hører i `src/middleware.ts`, ALDRIG i en side |
| Track-POST giver 204 men ingen række | `ANALYTICS_EXCLUDE_IPS` dropper Mikkels eget net | Test INSERT direkte mod D1 i stedet |
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

## 7. Tjekliste før du siger "klar"

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

---

## 8. Hvad der IKKE er løst (arv til næste land)

- **Rute-navnene er danske mapper**: `/atleter`, `/viden`, `/skoler`, `/artikler`
  gælder alle sites. Sport-sluggene er sprogstyrede og virker; resten er ikke.
  Løsning ville være engelske alias-ruter med redirects.
- **Admin er dansk** og redigerer det site, den tilgås FRA. Det er bevidst
  (én bruger), men det betyder at UK-tekster kun kan redigeres på UK-værten.
- **`/viden`-hub'en falder tilbage til kode-defaults** hvis D1 er tom for landet.
  Tjek at hub'en ikke er tom på det nye site før launch.
- **Landefiltrering af de læservendte queries** (`src/lib/db.ts` + `sitemap.ts`).
  Så længe den mangler, kan et nyt land kun være dark launch. Det er den ENE
  ting der skal løses, før land nr. 2 kan være rigtigt live — og den løses én
  gang for alle lande.
- **Kun `.dk`-tokenet kan røre DNS.** `CLOUDFLARE_API_TOKEN` = Workers på
  kontoniveau, ingen DNS. `CLOUDFLARE_EMAIL_TOKEN` = DNS + Email Routing, men
  kun på zonen `studentathlete.dk`. Email routing på et nyt domæne kræver
  derfor enten dashboardet eller et bredere token.
