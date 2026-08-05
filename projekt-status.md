# StudentAthlete.dk — Status

**Sidst opdateret**: 2026-08-05 (UK live som dark launch · landefiltrering · ét admin m. landevælger · engelsk UI · ægte 404'er · Discord pr. land — Worker bfdac353)


> 📘 **Nyt land på vej?** `PLAYBOOK-nyt-land.md` = bindende rækkefølge, fælder
> med symptomer, verifikationskommandoer. `SETUP-uk-launch.md` = UK's egne
> resterende trin. `ARKITEKTUR-motor.md` = de tre lag (kerne/sprog/land).

## 👉 AdSense-verifikation (2026-08-04, commit 5df760d — LIVE, mangler kun Mikkels ID)
**Valget:** IKKE AdSense-kodestumpen. Den indlæser Googles annonce-JavaScript, som sætter cookies/tilgår enheden og derfor kræver forudgående samtykke — sitet er cookieløst indtil `consent.enabled` slås til. Verifikation sker i stedet med to INERTE metoder:
- **`/ads.txt`** (primær) — `src/app/ads.txt/route.ts`, `force-dynamic` (som statisk rute ville ID'et blive bagt ind ved build). Er også dét annoncekøbere slår op for at se hvem der må sælge vores plads, så den skal bruges alligevel.
- **Metatag** `google-adsense-account` i `layout.tsx` — én linje, giver ejerskabs-scanningen en vej mere.

**Begge styres af ÉT felt: admin → Tekster → «AdSense publisher-ID»** (`adsense.publisher_id`). `adsenseIds()` i `site-content.ts` normaliserer de to nødvendige former (`ca-pub-…` til metatagget, `pub-…` til ads.txt) og afviser vrøvl — en forkert ads.txt er værre end ingen. Tomt felt = 404 + intet tag (verificeret live).

**STATUS: ID'ET ER SAT** (2026-08-04, `ca-pub-6062052231600117`, skrevet til `site_content`). Verificeret live:
- `https://studentathlete.dk/ads.txt` → `google.com, pub-6062052231600117, DIRECT, f08c47fec0942fa0`
- metatag på hver side → `<meta name="google-adsense-account" content="ca-pub-6062052231600117"/>`
→ Klar til at trykke «verificér» i AdSense.

### ⚠️ KRAV FØR ANNONCER: Google-certificeret TCF-CMP (opdaget 2026-08-04)
Google kræver en **Google-certificeret CMP integreret med IAB TCF v2.2** for at vise **personligt tilpassede annoncer** til brugere i EØS/UK (gældende 16. jan. 2024) og Schweiz (31. juli 2024). Kilde: `support.google.com/adsense/answer/13554020`.

- **Vores egen `CookieConsent` opfylder det IKKE og kan ikke komme til det.** Den er en håndbygget to-knaps-boks der skriver `sa_consent`; der er ingen TC-streng, intet `__tcfapi`, ingen certificering. Vejen til compliance er ikke at udbygge den — det ville kræve at BLIVE en certificeret CMP.
- **Løsningen når annoncer tændes: Googles egen «Privacy & messaging» (tidl. Funding Choices)** — Googles eget certificerede TCF-CMP, gratis, sættes op i AdSense-dashboardet. Passer $0-princippet. Tredjeparts-CMP'er (Cookiebot, Usercentrics m.fl.) koster penge.
- **Mikkel har valgt en Google-CMP-mulighed (2026-08-04)** → AdSense-kravet er dækket. **Vores eget banner er slået FRA igen samme dag** (`consent.enabled=false`, verificeret live) for at undgå to samtykkedialoger.
- **ADSENSE-SCRIPTET ER TÆNDT (2026-08-04, Worker 275114dc)**: `<script async src=".../adsbygoogle.js?client=ca-pub-6062052231600117" crossorigin>` i `<head>`, verificeret live. Styret af **admin → Tekster → «Indlæs AdSense-scriptet»** (`adsense.enabled`) — kan slukkes igen UDEN deploy. Tænder auto ads + Googles samtykkeboks i ét.
  - **`AdSlot` viser stadig pladsholdere, ikke rigtige annoncer.** Manuelle placeringer kræver ad unit-ID'er fra AdSense (`data-ad-slot`), som ikke findes endnu. Indtægt kommer indtil da fra **auto ads**, som Google placerer selv.
  - **`/cookies` RETTET 2026-08-04** (på Mikkels udtrykkelige anmodning, med efterfølgende gennemlæsning): "vores cookieboks"/`sa_consent`/"Cookieindstillinger" er væk; teksten beskriver nu Google AdSense + Googles CMP (IAB TCF) og at valget gemmes af Google på brugerens enhed. Bevaret: cookieløs egen statistik + Cloudflares nødvendige cookies. **Sider har ingen kladde-tilstand** (kun `published` 0/1), så rettelsen gik direkte live — at afpublicere ville have fjernet cookiepolitikken helt.
  - **«Cookieindstillinger»-link BYGGET** (`src/components/ConsentSettingsLink.tsx`, i footeren, Worker af48b7c5): genåbner Googles samtykkeboks via `googlefc.callbackQueue.push(googlefc.showRevocationMessage)` — Googles egen anbefalede kald (`support.google.com/adsense/answer/10959060`), men som `<button>` frem for `href="javascript:…"` (tastaturvenligt, ingen javascript-URL). Dermed er tilbagetrækning lige så let som samtykke (GDPR-kravet).
    - Knappen **venter på at `googlefc` findes** (pollet 0,5 s × 20) og renderer ellers INTET — inkl. sit eget `<li>`, så footeren ikke får et tomt listepunkt hos læsere med annonceblokker eller uden for EU/EØS/UK/CH. Verificeret live: `<li>` er væk, `enabled:true` sendes.
    - Cookiepolitikkens afsnit **«Sådan ændrer du dit valg»** beskriver begge veje: linket, og — hvis det ikke vises — at rydde browserens cookies.
    - **RETTET 2026-08-04 (Worker 5452ae5d) — første version var forkert.** Knappen blev vist så snart `googlefc.callbackQueue` fandtes, men det objekt oprettes af AdSense-scriptet ALTID, også når der ikke er nogen samtykkebesked at genåbne → knappen stod der og gjorde intet ved klik (Mikkel bekræftede). Nu bruges Googles dokumenterede fremgangsmåde: `CONSENT_API_READY` → `__tcfapi('addEventListener', 2, …)` → vis KUN knappen når `tcData.gdprApplies` er sand (developers.google.com/funding-choices/fc-api-docs).
    - **Diagnose herfra**: vises knappen slet ikke, er der ingen aktiv samtykkebesked → **AdSense-siden, ikke koden**. Googles beskeder serveres typisk først når sitet er GODKENDT i AdSense (tilføjet i dag) og en «European regulations»-besked er PUBLICERET under Privacy & messaging.
    - **Mikkels test**: åbn studentathlete.dk i et privat vindue. Dukker Googles egen samtykkeboks op af sig selv? Nej → beskeden er ikke live endnu, og der er intet at genåbne (knappen skjuler sig nu korrekt). Ja → knappen skal også være der.
- **Googles CMP kræver INGEN ekstra kode** — beskeden serveres af auto-ads-scriptet, som er en del af selve AdSense-annoncekoden. Men den kommer derfor først på sitet sammen med AdSense-tagget: i dag indlæser vi INTET Google-script (verifikationen er ads.txt + metatag), så CMP'en vises endnu ikke.
- **RETTELSE af tidligere note:** ad-scripts skal IKKE gates på `sa_consent.marketing` — gating sker i den certificerede CMP. Den plan var forkert.
- Rammer os først når annoncer faktisk serveres (`NEXT_PUBLIC_ADS_ENABLED` er ikke sat). Men da læserne er danske, er ~al trafik EØS — det gælder altså reelt fra dag ét med annoncer.

**`consent.enabled` SLÅET TIL** samme dag (Mikkels ønske). Konsekvens: banneret vises nu, og sitet sætter dermed sin første cookie (`sa_consent` — strengt nødvendig, lovlig uden samtykke). **NB: banneret gater endnu ingenting** — AdSense-verifikationen er bevidst inert (ingen Google-JS), og `NEXT_PUBLIC_ADS_ENABLED` er ikke sat, så der loades stadig ingen marketing-scripts. Når ads tændes: ad-scripts SKAL læse `sa_consent.marketing` før de indlæses. Banneret er client-renderet (SSR viser intet med vilje) → kan kun ses i en browser, ikke med curl; `enabled:true` er bekræftet i sidens payload.

## 👉 UK-LAUNCH påbegyndt (2026-08-04) — se `SETUP-uk-launch.md`
Domænet **student-athlete.co.uk er købt**. Trin 1–3 af launch-planen er kørt; **trin 4 (engelsk UI) mangler og er blokerende, før domænet må pege på sitet.**

1. **Genereringen er landebevidst**: `generate-articles.ts` slår atletens `home_country` op → landeprofil → sprog → promptsæt, PR. HISTORIE (system-prompten bygges nu inde i løkken, ikke én gang). `articles.country` + `author` (sitets brand) stemples fra atleten.
   - **Fælden det løste**: `check-sources.ts` vælger atleter på `active = 1` UDEN landefilter. Var UK tændt først, ville danske artikler om briter være landet i den danske kladdekø. Discovery forbliver bevidst landeagnostisk — den overvåger skolefeeds, og generering afgør sproget.
2. **Engelske prompts**: `pipeline/generate/prompts/en.ts` (hele regelsættet på britisk engelsk, regler nummereret 1–23 identisk med `system.ts` så parringen er mekanisk) + `prompts/index.ts` (`promptsFor(language)`). Britisk sportssprog: football = soccer, American football, athletics.
3. **UK REGISTRERET** i `COUNTRIES` → roster-scrapen samler nu briter. Startet manuelt 2026-08-04 (kører ~1t40m; uger om at konvergere over ~1.700 skoler). Forventning 1.200–2.000 briter.
   - **Empirisk valideret**: alle **982** rigtige UK-hjembyer i kataloget klassificeres som UK, **0** som DK. Krydstest: svenskere/nordmænd/irere/australiere/canadiere + Denmark SC/Scotland PA/London Ontario rammer ingen af sitene. 73 assertions.
4. **Deployet** (Worker faa801f9). Dansk site uberørt: 118 danskere, alle sider 200.

5. **Engelsk UI — RAMMEN ER OVERSAT** (Worker 20f4c188). `LanguagePack.ui` + `t()` + `currentSite()`/`currentLanguage()` (via `headers()`). Oversat: header, footer, kategorinav, forsidens bånd, arkiv, ArticleCard, Carousel + `<html lang>`. **En manglende oversættelse er nu en TYPEFEJL** (`UiKey`-union), ikke et hul på siden; `_ui-strings-test.ts` (274 assertions) fanger manglende pladsholdere og dansk sluppet ind i den engelske pakke.
   - **Verificeret med spoofet Host via `next dev`**: UK-værten giver engelsk ramme + `/football`, `/american-football`, `/athletics` + `lang="en"`; dansk vært beholder `/fodbold`, `/atletik`, `lang="da"`. **NB: `wrangler dev` videresender IKKE Host-headeren** (hverken lokal eller `--remote`) — kontroltesten var at `www` ikke blev 301'et. Brug `next dev` til vært-tests.
6. **`site_content` er nu PR. LAND** (migration 037, kørt): nøgle = (key, country); `adsense.*` + `consent.enabled` er markeret `global` og ligger under `'*'` (én AdSense-konto dækker begge domæner). `getSiteSettings()` udleder landet af værten → ingen af de 6 kaldesteder skulle ændres.
   - **Fanget under migreringen**: `seedHashUpsertSql` brugte `ON CONFLICT(key)`, som ikke længere matcher en nøgle. I SQLite er det en HÅRD FEJL, ikke en no-op — seed-scripts ville være væltet næste gang pillar-/guide-tekster blev opdateret. Rettet til `ON CONFLICT(key, country)`; drift-tjek verificeret grønt.

7. **Skabeloner + profiler OVERSAT** (Worker 2ccfb514, 424 assertions): alle fire artikelskabeloner, atlet- og skoleprofil, brødkrummer, faktaetiketter, status, dimissions-badge. **`ARTICLE_TYPE_LABELS` var en enkelt dansk tabel i `lib/types.ts`** og sivede derfor ud på hvert eneste kort uanset vært → flyttet til sprogpakken som `articleTypeLabel()`. Verificeret live på rigtige danske data: atletprofil viser Sport/Position/Hjemby/Universitet/Årgang/Status, artikelside viser Hjem/Nyhed/Tidligere opdateringer, intet engelsk sivet ind.
8. **Første UK-scrape FÆRDIG** (2t5m): **145 britiske atleter** i basen, 122 danske. Konvergerer videre med de ugentlige kørsler.

9. **Engelske statiske sider SEEDET** (migration 038 + `db/seed-pages-uk.sql`): `pages` har nu (slug, country) som unik nøgle, så hvert site kan have sin egen /om. 5 engelske sider (om, ai-brug, presseetik, kontakt, cookies) ligger som `country='UK'`, published. **ULÆST AF MENNESKE — Mikkel gennemgår og retter i admin på UK-værten.** `upsertPage` fik `ON CONFLICT(slug, country)` (samme fælde som 037, fanget af tjeklisten denne gang).
10. **Natlig scrape under UK-opstarten**: `weekly-scrape.yml` har fået `cron: '0 22 * * *'` OVEN I søndagskørslen. **MIDLERTIDIG — fjern igen når UK-tallet flader ud.** Manuel kørsel sat i gang 2026-08-04 13:49.

11. **13 BRITISKE SPORT-PILLARTEKSTER SKREVET** (`src/lib/sport-content-en.ts`, Worker 47f2d433) — ikke oversat: sæsonstruktur og kampformater er GENBRUGT fra de faktatjekkede danske tekster, men rammen er britiske veje ind i NCAA (akademi-frasortering i fodbold, NFL Academy London, LTA/økonomien i tennis, britisk skole- og klubroning). **Kun 3 navngivne atleter, alle web-verificeret**: Luke Donald (Northwestern, NCAA-mester 1999), Cameron Norrie (TCU 2014-17), Luol Deng (Duke 2003-04 — britisk statsborger FRA 2006, altså efter college; formuleringen afspejler det). Øvrige sportsgrene får bevidst INGEN navne.
    - **Nøglet på ENGELSK slug**, ikke kanonisk nøgle: `/football` er fodbold på engelsk og amerikansk fodbold på dansk → to tabeller, ikke én oversat. `getSportContent(slug, lang)`; D1-override pr. land virker uændret.
    - **`[...segments]`-metadata lokaliseret**: sidetitler, atlet-/skolebeskrivelser og OG-siteName sagde stadig "danske atleter i NCAA | StudentAthlete.dk" på UK-værten. Sitemap'ets sport-slugs følger nu også sproget.
    - Verificeret: UK `/football` → "Football – British athletes in the NCAA | Student-Athlete.co.uk"; DK `/football` uændret amerikansk fodbold; DK 404'er korrekt det engelske `/american-football`.

12. **13 BRITISKE VIDEN-GUIDER SKREVET** (`src/lib/viden-content-en.ts`, Worker 296581e5). **KORREKTION af min egen tidligere vurdering**: jeg påstod at alle 13 var fulde af danmarks-specifikke fakta. Det holdt ikke — 11 forklarer det AMERIKANSKE system og er landeneutrale; kun 2 var reelt danske (akademiske krav + universitetssammenligning). Dem er der researchet britiske fakta til, web-verificeret og kildeangivet i guiderne:
    - Mindst 5 akademiske GCSE-beståelser, gennemsnit E eller bedre (Skotland: Standard Grade 6), dækkende engelsk, matematik, naturfag og samfundsfag — NCAA's egen International Guide.
    - **GCSE PE, media studies, ICT, D&T, musik, kunst, applied science/maths og short-course tæller IKKE** — fælden der fanger briter, som ellers opfylder UCAS fint.
    - 16 core courses, min. 2,3 core-GPA til D1. **SAT/ACT permanent afskaffet som eligibility-krav (jan. 2023)** — men kan stadig kræves til OPTAGELSE og legater; den skelnen misforstås oftest.
    - UK student finance dækker IKKE amerikanske grader.
    - **Bevidst ikke påstået**: NIL-regler for internationale på F-1-visum (restriktive og omstridte — en forkert påstand kan koste læseren visummet). Guiden siger "søg rådgivning".
    - Engelske slugs, sprogopslag som sport-teksterne. Guide-siderne henter nu brand fra sitet (titlerne sagde stadig "| StudentAthlete.dk" på UK-værten).

**FORÆLDET AFSNIT (beholdt som note):** påstanden nedenfor om at guiderne var fulde af danske fakta — gymnasiet, danske karakterer, danske NCAA-navne (gymnasiet, danske karakterer). En ordret oversættelse ville være direkte forkert for britiske læsere, som skal have A-levels/GCSE/UCAS. De skal **skrives om**, ikke oversættes — hver guide kræver britiske fakta, der skal verificeres. Indtil da har UK-sitet ingen /viden-guider (hub'en vil være tom på UK-værten — tjek før launch).

13. **DOMÆNET ER LIVE (2026-08-05, Worker 3016df29) — DARK LAUNCH.** Mikkel skiftede nameservere hos Simply; zonen `student-athlete.co.uk` stod Active. Resten kørte herfra:
    - **DNS uden dashboard**: `CLOUDFLARE_API_TOKEN` har Workers-adgang på KONTO-niveau, men **ingen DNS-rettighed på nogen zone** (`CLOUDFLARE_EMAIL_TOKEN` har DNS, men kun på .dk). Derfor er UK sat op med `custom_domain = true` i `wrangler.toml` i stedet for et route-mønster: så opretter Cloudflare selv den proxied record + certifikatet gennem Workers-API'et. Ingen manuelle records. (Apex på .dk har i øvrigt altid været en custom domain — det er derfor `www.studentathlete.dk` **slet ikke resolver** i dag: route-mønsteret findes, men ingen DNS-record. Ufarligt, men en dag værd at rette.)
    - Live-verificeret: `lang="en"`, engelsk titel/meta, canonical + sitemap + robots peger på .co.uk, `www` → apex 301, alle 16 ruter 200 (`/football`, `/american-football`, `/athletics`, de 5 engelske sider). Dansk site regressionstestet: 14 ruter 200, uændret titel/canonical.
    - **`site_content` havde ingen UK-rækker** → kode-defaults er danske og landeblinde, så UK-sitet sendte dansk `<title>`, meta-beskrivelse, footer og ai-disclaimer. 4 engelske rækker (`country='UK'`) skrevet til D1. **Ny regel: seed `site_content` for landet FØR domænet peger på sitet.**
    - **Absolut-URL-auditten var ikke helt færdig**: `Breadcrumb.tsx` og `/skoler` byggede brødkrumme-JSON-LD på modul-konstanten `BASE_URL` → strukturerede data på UK-sitet pegede på .dk. Begge bruger nu `currentBaseUrl()`. (`crumb.aria` tilføjet til sprogpakken; `aria-label` sagde "Brødkrumme" på engelsk.)
    - **DEN STORE: de læservendte forespørgsler filtrerer IKKE på land.** UK-sitet viste de **126 danske** atleter og **nul** briter, og dets sitemap var .dk's 1.968 URL'er med britisk værtsnavn. To domæner med samme indhold = dublet.
    - **Derfor `darkLaunch: true` i landeprofilen** (`src/lib/countries/uk.ts`): robots.txt spærrer alt · middlewaren sender `X-Robots-Tag: noindex, nofollow` på hvert svar · layoutets metadata sætter noindex. **Fælde fanget undervejs**: fem sider hårdkodede `robots: { index: true }` og overskrev layoutet — de bruger nu `siteRobots()`. Verificeret live: alle UK-sider noindex, alle DK-sider uændret index.

14. **LANDEFILTRERINGEN ER LAVET (2026-08-05, Worker 2d708cef).** Fejlen var ikke manglende filtre — det var **defaulten**: `siteCountry()` faldt tilbage til `DEFAULT_COUNTRY` i stedet for værten, og ingen kalder sendte et land med. Nu er den `async` og slår landet op via `currentSite()`; uden request-kontekst (byggetid, scripts) falder den tilbage til standardsitet som før. Alle 20 kaldesteder afventer den nu.
    - Filtre tilføjet hvor de manglede helt: `getLatestArticles`, `getFeaturedArticles`, `getArticleBySlug`, `getArticles`/`countArticles`, `getArticlesByAthleteId`, `getArticlesByUniversity`, `getAthleteBySlug`, `getSchoolsWithAthletes`, `getAllArticleSlugs`, `getAllSchoolSlugs`.
    - **Detaljesider 404'er nu på det forkerte site** (en dansk atlet findes ikke på .co.uk og omvendt) — ellers ville hver profil ligge på begge domæner. Skolesider 404'er når sitet ingen atleter har på skolen: skolerne er fælles, atleterne er ikke.
    - Verificeret live: DK 126 atleter / 98 skoler / 18 artikler · UK 275 atleter / 127 skoler / "No articles yet" · sitemaps 305 (DK) og 438 (UK) uden en eneste overlappende URL · dansk site regressionstestet på 14 ruter.
    - **Admin følger værten** (`getAllAthletes` m.fl. er nu vært-afhængige) — britiske atleter redigeres altså fra UK-værtens admin. Det er samme model som `site_content` og `pages`.
    - **Uløst, ældre fejl fundet undervejs**: ukendte stier svarer **200 med "Side ikke fundet"** (soft 404) — også på .dk, også før i dag. Årsagen er den kendte: `loading.tsx` streamer 200 før `notFound()` når at sætte status. Det gør nu mere ondt, fordi hver af det andet lands URL'er er en soft 404 på det forkerte domæne. Rigtig løsning: slå op i middlewaren (som atlet-aliasserne) og svar 301 til det rigtige site — eller 404.
15. **`www.studentathlete.dk` VIRKER NU.** Værtsnavnet har aldrig haft en DNS-record (kun en Workers-route), så det gav NXDOMAIN. Proxied AAAA `100::` oprettet på .dk-zonen → routen rammer, middlewaren 301'er til apex.

16. **ADMIN ER FLYTTET TIL STANDARDSITET — MED LANDEVÆLGER** (Worker bfdac353). Cloudflare Access er bundet til ÉT værtsnavn, så `/admin` på .co.uk stod **uden login foran** (app-laget afviste stadig: 401 fra API'et, tom skal på siden). To muligheder: et Access-app pr. land, eller ét admin for alle lande. Mikkel valgte det sidste.
    - Middlewaren sender `/admin` på et landedomæne til admin-værten (302) og 404'er `/api/admin` dér. Landet vælges i stedet i admin: cookie → `x-sa-country`-header (sat af middlewaren, kun på admin-stier, så en klient ikke kan smugle den ind) → `contentCountry()`.
    - **Den header driver ALT**: kladdekø, artikler, atleter, foto- og profilkø, dubletkandidater, sider og sitetekster. `createArticle`/`createAthlete` stempler nu også landet — uden det ville en britisk kladde falde tilbage på kolonnens DEFAULT 'DK' og forsvinde ud af den kø den blev skabt i.
    - Vælgeren ligger øverst i admin (`CountryPicker`), og et nyt land dukker op af sig selv, fordi den læser `COUNTRIES`.
17. **ALLE DANSKE FLADER PÅ .co.uk ER VÆK** (54 nye UI-nøgler): atletoversigt, universitetsoversigt, viden-hub, sport-landingssider, 404 og indlæsningsskærm. **`SearchBar`s `submitLabel` havde "Søg" som DEFAULT** og sivede derfor ud på hver eneste side — defaults i klientkomponenter er den type fælde `UiKey`-unionen ikke fanger. Verificeret: alle otte testede UK-ruter er nu rent engelske, .dk uændret dansk.
18. **SOFT 404 LØST.** `loading.tsx` gør sin rute til en Suspense-grænse → Next streamer skallen med 200, FØR siden kan nå at kalde `notFound()`. Spinneren ligger nu kun på de tre ruter der ikke kan 404'e (**ikke** `/viden`, som er forælder til `/viden/[slug]`). Ukendte stier, ukendte guider og det andet lands URL'er svarer nu ægte 404.
19. **DISCORD PR. LAND** (`pipeline/lib/notify.ts`, 9 tests): webhook slås op som `DISCORD_WEBHOOK_<LAND>` med fald tilbage til fælleskanalen, så en manglende kanal aldrig taber en besked. Kladdebeskeder og genereringsfejl sendes pr. land efter kørslen (aldrig undervejs — en webhook-fejl må ikke vælte genereringen), og den ugentlige rapport sendes nu **én gang pr. land** med "venter på dig"-tal og et link der SÆTTER landevælgeren og åbner køen. **Mikkel mangler kun at oprette kanalerne + secrets — se `SETUP-discord-kanaler.md`.**

### ⚠️ 2026-08-05: standardsitet var nede i ca. 40 minutter (min fejl)
`custom_domain = true` i `wrangler.toml` er en **fuldstændig liste**: wrangler afkoblede den custom domain-tilknytning `studentathlete.dk` (apex) havde haft længe, fordi den ikke stod i filen — og Cloudflare slettede den DNS-record tilknytningen ejede. Resultat: NXDOMAIN på apex. Genoprettet som en **manuel** proxied placeholder-record (AAAA `100::`), som wrangler ikke ejer; verificeret at den overlever et deploy. `www` manglede i øvrigt også en record og er nu oprettet.
**Hvorfor jeg ikke opdagede det**: jeg verificerede med `curl --resolve VÆRT:443:IP`, som springer DNS over — den beviser at Workeren svarer, ikke at domænet kan slås op. Begge dele står nu i `PLAYBOOK-nyt-land.md`.

**Næste (blokerende før UK må pushes offentligt):** `darkLaunch: false` når der er indhold · UK-artikler skrives + gennemlæses · resterende danske flader på UK (`/atleter`- og `/skoler`-metadata, `/viden`-hub, admin) · AdSense-site for .co.uk · e-mail routing på .co.uk (kræver et token med DNS/Email på den zone — det nuværende har det ikke) · fjern den midlertidige natlige scrape-cron.

## 👉 Seneste arbejde (2026-08-04) — forsidens rytme, arkiv, kildemåling
**Baggrund:** forsiden var en væg af næsten ens blokke, fordi ALLE covers er det GENEREREDE kampkort (rigtige fotos findes kun på atletprofiler + inde i artikler). Mikkel spurgte om 3-5 korttyper; konklusionen blev **nej** — flere skabeloner ville lægge et valg oven i hver redigering uden at fjerne ensartetheden. I stedet: **rytme bestemt af pladsen på siden**. Mockup: `https://claude.ai/code/artifact/3f4d7a99-dbbf-455a-a3e8-019926001c85`.

1. **Forsiden = seks bånd** (`src/app/page.tsx` + `src/components/home/`): A hero (karrusel, uændret) · B lead+skinne · annonce · C datastribe · D tre kort · annonce · E efter sport · F bredt feature (spejlvendt). Billedtunge og billedfri bånd skiftes, så kampkort aldrig står i samme størrelse to bånd i træk. **Søge-/filtervisning beholder det simple grid** (dér leder man efter noget bestemt).
2. **`ArticleCard` har nu fire tætheder**: `featured` (m. `reverse` til bånd F) · `lead` · `default` · **`compact`** (INTET billede — sportsfarvet mærke; det er den der bryder mønsteret). Nye db-queries: `getSiteCounts()`, `getArticlesGroupedBySport()`, `countArticles()`.
3. **`/artikler` — arkivet fandtes ikke.** `getArticles()` henter 18 uden paginering, så artikel nr. 19 kun kunne nås via søgning/sitemap. Nu pagineret (`?side=`) + sportsfilter, indekserbar, rel prev/next + canonical, i sitemap + footer.
4. **`/ig` NEDLAGT → 301 til `/artikler?kilde=ig`** — lagt i **middleware, ikke i siden**: med `loading.tsx` streames en 200 før et side-redirect kan sætte status, og Next falder tilbage til `<meta refresh>` (middleware-filen dokumenterede allerede fælden for atlet-aliasser). Siden var forældreløs — intet på sitet linkede til den.
5. **Kildemåling**: `migration-036` → `events.source`, fanget fra `?kilde=`/`utm_source` på landings-sidevisningen, vist i admin → Analytics. **Bonus-fix**: `classify()` regnede ETHVERT ét-segments-navn for en sportsgren → `/viden` blev logget som sporten "viden", `/viden/[slug]` som en ARTIKEL, og `/ig` som sporten "ig". Sport-slugs slås nu op i sprogpakken (`/fodbold` → `soccer`). Gamle rækker beholder deres værdier — tal er først sammenlignelige fremadrettet.
6. **Verificeret mod PROD D1** (`wrangler dev --remote`): båndene renderer (118 danskere · 91 universiteter · 11 sportsgrene · 0 nye denne uge), 14 unikke artikler uden gengangere, arkiv "Viser 1–18 af 18", `?side=99` giver pæn besked (ikke "Viser 25–18"), `/ig` → 301. Migration 036 KØRT mod remote (nødvendig FØR deploy, ellers fejler track-INSERT lydløst).

**Bemærk**: annoncerne renderer intet i dag (`NEXT_PUBLIC_ADS_ENABLED` er ikke sat) — båndene står tættere indtil ads slås til. Datastribens 4. celle viser "0 nye" i off-season. **Deployet 2026-08-04** (Worker 12b14628); verificeret live: forsidens bånd, `/artikler` "Viser 1–18 af 18", `?side=99` pæn besked, `/ig` → 301, `/ads.txt` → 404 (afventer ID).

## 👉 Seneste arbejde (2026-08-03 #2) — UK-forberedelse (funktioner klar, IKKE aktiveret)
**Mikkels beslutninger (denne session):** UK er første ekspansion · Mikkel self-editer UK ved launch (ingen redaktør-gate) · domæne LÅST til student-athlete.co.uk (studentathlete.co.uk er taget) · prep nu, launch FØRST efter DK's in-season-validering.

**Bygget (commit fa24ea1, alle tests grønne, tsc ren, INGEN adfærdsændring på live-sitet):**
1. **`src/lib/i18n/en.ts`** — engelsk (britisk) sprogpakke: soccer→"Football" på slugget `/football`, amerikansk fodbold→`/american-football`, atletik→"Athletics", britiske stavemåder (centre-back, defenceman, metre). Registreret i `LANGUAGES`.
2. **`src/lib/countries/uk.ts`** — UK-landeprofil, **BEVIDST IKKE registreret i `COUNTRIES`** (én linje = næste scrape indsætter ~1.000 UK-atleter i live `athletes`; aktiverings-checkliste står i filens header). Klassifikation er markers-først ("X, England"-formater — verificeret mod 40 rigtige katalog-rækker); byliste kun navne UDEN US/CA-navnebror (bar "London" klassificeres bevidst ikke); guards mod New South Wales/New England/canadiske provinser/nations-highschools. `code: "UK"` (matcher katalogets vokabular, ikke ISO's GB).
3. **`src/lib/profile-baseline-en.ts`** — engelsk profil-grammatik (registreret i `PROFILE_BUILDERS`): a/an-artikler, rolle-normalisering ("as a freestyle swimmer", "vault specialist"), "American football" m. stort A, "California" (ikke "Californien"), UK-nationssuffiks strippes fra hjemby.
4. **Tests**: `pipeline/lib/_hometown-uk-test.ts` (57) + `src/lib/_profile-baseline-en-test.ts` (32); `_positions-test.ts` håndhæver nu positionPhrase-completeness for ALLE registrerede sprog. Begge nye suiter i `ci.yml`.

**Research-fund inden Mikkel afbrød domæne-sporet (gem til launch):** `studentathlete.co.uk` er registreret (2021, fornyet til feb 2027, registrant redacted) men DØD — nameservers (thundercloud.uk) svarer ikke, intet hostet siden ~2016 → ingen aktiv konkurrent; evt. opkøbelig. **Katalog-tal**: UK = 972 rå rækker (DK = 62 rå vs 138 kuraterede → reel UK-pulje snarere 1.200–2.000 = 10–15× DK's review-load, IKKE de gamle ~760). Sport-split: soccer ~476 (D2-tung!), golf ~132, tennis ~105, atletik ~95. Ireland = 111, ALDRIG poolet under UK-brand.

**Mangler før UK-aktivering** (jf. `ARKITEKTUR-motor.md` + header i `countries/uk.ts`):
- [ ] Domæne købt + CF-zone + wrangler-route
- [ ] Engelske genererings-prompts (`pipeline/generate/prompts/` er hardcodet "Skriv ALTID på dansk")
- [ ] ~400 danske UI-strenge i JSX + danske route-mapper (`/atleter`, `/viden`, `/skoler`) + sprog-pr-request-context
- [ ] Throttle-strategi for review-load (10–15× DK — fx D1-only eller top-sports ved launch)
- [ ] DK in-season-validering bestået + Mikkels go

## 👉 Seneste arbejde (2026-08-03 #1) — motor-refaktor (kerne/sprog/land)
Migration 034+035 kørt mod prod + deployet. **`ARKITEKTUR-motor.md` i repo-roden er den autoritative reference** (tre lag; databasen taler ikke dansk; nationalitet er en kolonne; ingen vært som konstant; alt læservendt gennem `sportLabel()`).

## 👉 Seneste arbejde (2026-07-08) — profiltekster (udkast→godkend) + juridisk vurdering
**Mikkels krav:** kort profiltekst pr. atlet, bygget af VORES egen hårde information (roster-fakta + kildebelagte athlete_events) — freshman får "startede på X"-linje, sommer-job udvider til karriere-resumé sæson for sæson. **ALT går gennem udkast→godkendelse — "mennesker læser alt der publiceres" gælder OGSÅ regelbaseret skabelon-tekst** (Mikkel 2026-07-08; profile_summary skrives KUN af admin-godkendelsen).
1. **Basis-tekst (regelbaseret, $0)**: `src/lib/profile-baseline.ts` — deterministisk dansk sætning fra roster-fakta (freshman/veteran/dimitteret/inaktiv-varianter; hjembysuffiks strippes). Test: `_profile-baseline-test.ts` (15). Vises IKKE direkte — bruges kun som udkast-generator.
2. **Migration-031** `athletes.profile_draft`/`profile_draft_at` (kørt remote). Konvention: draft≠NULL=afventer · godkend→summary, begge NULL · afvis→draft NULL men draft_at BEHOLDES (afvist-markør: baseline genforeslår aldrig; expand må gerne).
3. **Pipeline** `pipeline/profiles/build-profile-drafts.ts`: `--baseline` (regelbaseret, ingen LLM; dry-run verificeret live: 111 udkast/111 kandidater) + `--expand` (LLM via gratis-kæden, json-mode, KUN athlete_events+baseline som input; deterministisk verifikation afviser opfundne tal/manglende navn/URL'er; **helbreds-events filtreres fra** — GDPR art. 9, jf. JURA-vurderingen). Test: `_profile-drafts-test.ts` (18).
4. **Admin-kø** `/admin/profiler` (side + ProfilerClient + `/api/admin/profil/[id]`): udkast redigerbart før godkendelse, fakta-grundlag (events m. kildelinks) foldes ud, Profiler-badge på dashboard. Godkendelse → `profile_summary` (vises i "Om"-sektionen + meta description som hidtil).
5. **Workflow** `profile-drafts.yml`: baseline søndag 08:00 UTC (efter roster-scrape 04:00) + expand årligt 5. juli (sommerpausen); manuel dispatch m. mode/dry_run; Discord-besked ALTID m. antal + /admin/profiler-link (udkast = dashboard-synlig værdi). CI: begge nye suiter tilføjet ci.yml.
6. **Juridisk vurdering af HELE setuppet** (baggrunds-research, kun primærkilder): `Mikkels eget/StudentAthlete.dk/JURA-vurdering-2026-07-08.md`. Hovedpunkter: intet strukturelt ulovligt; hullerne er dokumentation (privatlivsside, LIA, katalog-retention) + **Pressenævnet-registrering = største de-risking** (HLTV.org-kendelsen 2023 = næsten identisk præcedens i vores favør); AI Act art. 50(4)-undtagelsen passer vores human-review-model (gælder fra 2/8 2026 — behold AiDisclaimer + review_log); foto-kreditering er IKKE en licens (skriftlig tilladelse pr. skole før foto-featuren aktiveres).
7. **Kataloget**: `run-catalogue.sh` loft 1400→2000 skoler (DB har 1761 — halen blev aldrig scannet). NB fra 07-07: catalogue-daily har nu ✅/❌-Discord-besked m. summary.

## 👉 Seneste arbejde (2026-07-07) — katalog dagligt + Google News væk + Discord /catalogue (alt LIVE)
1. **Ekspansions-katalog: ugentligt → DAGLIGT.** `catalogue-weekly.yml` omdøbt → `catalogue-daily.yml`; cron `0 6 * * 0` → `0 21 * * *` (roligt vindue: efter 18:00-discover, før 00:00-discover; fri af js-scrape 03:00 + morgen-cluster 06:30/07:00/07:30 → undgår D1-kontention). Hvert fuldt sweep skipper nogle skole-slices; daglige kørsler konvergerer inventaret ~7× hurtigere via idempotent upsert. Inden for alle limits: public repo = gratis GH-minutter; ~10k D1-writes/kørsel << 100k/dag; ingen LLM. Commit 1dc4264.
2. **Google News fjernet** (Mikkel: kun officielle holdsider, væk fra kommercielle medier). Slettet `pipeline/discover/google-news.ts` + `google-news-daily.yml`-workflow; `sensitive.ts`-kommentar generaliseret. (Kørte stadig på GitHub indtil push — nu stoppet.) Commit 5d7e07c.
3. **Discord `/catalogue`-kommando** — kør ekspansions-sweepet on-demand. Ny slash-kommando → `catalogue-daily.yml` workflow_dispatch i `workers/discord-bot/` (`index.ts` WORKFLOWS-map + `register-commands.ts`). Worker redeployet (version 99cb571a). Kommando-registrering lagt i ny **`register-discord-commands.yml`** (manuel Actions-knap; bruger repo-secrets `DISCORD_APP_ID` + `DISCORD_BOT_TOKEN`, tilføjet af Mikkel via GitHub UI). Kørt grøn: 5 kommandoer registreret (/discover /generate /scrape /stats /catalogue). Deploy-helper: `workers/discord-bot/deploy-and-register.sh`. Commits 734bd1d + 0a9127d.
   - **NB**: bot-token nulstillet af Mikkel — påvirker IKKE den kørende worker (verificerer interaktioner med `DISCORD_PUBLIC_KEY`, trigger workflows via `GITHUB_PAT`; bot-token bruges KUN til kommando-registrering). Re-registrering verificeret grøn med det nye token → GitHub-secret'et holder det aktuelle token.

## 👉 Seneste arbejde (2026-07-03 #2) — hærdnings-batch (alt LIVE + verificeret)
1. **Kampkort i FULD 1200×630 er live** — pre-rendret UDENFOR Workeren: `pipeline/render/render-cards.ts` (satori+resvg i Node, egen twemoji-loader) + DELT element-træ `src/lib/og-card.ts` (plain-object-elementer, ingen JSX — én kilde til sandhed med `/api/og`-fallbacket). Gemt som base64 i D1 `card_blobs` (migration-029, ~220 KB/kort); `/api/og?type=card` serverer blob → fallback on-the-fly 600×315. `CARD_VERSION=8` (buster gamle edge-caches). Alle 18 publicerede kort uploadet + verificeret live (curl: 1200×630 fra prod; fallback-vej: 600×315). Timevis `render-cards.yml` (:05, før social :15; `--force`-input til design-ændringer). **NB: R2 var Mikkels ønske, men kontoen har aldrig aktiveret R2 (API-fejl 10042 "enable R2 through the dashboard") → D1-blobs giver samme resultat på $0. Vil Mikkel have R2 senere: aktivér i dashboard → lille migrering.**
2. **CI**: `ci.yml` — tsc (src+pipeline) + alle 10 testsuiter på hvert push/PR. Første kørsel grøn på commit 2209806.
3. **Ugentlig D1-backup**: `weekly-backup.yml` (lørdag 02:00 UTC, FØR søndags-scrapen) — `wrangler d1 export` → gzip → Actions-artefakt 90 dage. Discord ved fejl.
4. **Drift-tjek (gotcha-værnet fra 07-02)**: seed-scripts stempler nu content-hash i `site_content` (`seedhash.sport`/`seedhash.guides`, delt helper `pipeline/lib/content-hash.ts`); dagligt `content-drift.yml` (06:30) sammenligner kodens hash med stemplet → Discord-alarm "kør seed-scripts" KUN ved drift. Admin-redigeringer rører ikke stemplet → ingen falske alarmer. Stemplet + verificeret grønt.
5. **`/spil-i-usa` + `/api/lead` PARKERET** (Mikkel: ikke klar til den lead-model endnu): mapper omdøbt til `_spil-i-usa`/`_lead` (Next ignorerer underscore-mapper; genaktivering = omdøb tilbage, note i page-headeren). `/ig`-CTA peger nu på `/viden`. Admin → Leads + migration-028 består (tom, harmløs). Verificeret: begge URL'er serverer 404-siden.
6. **Kendt SEO-småting (IKKE fikset)**: catch-all'en returnerer HTTP 200 med 404-indhold (soft-404) for ukendte slugs — pre-eksisterende; ret ved lejlighed.

## 👉 Seneste arbejde (2026-07-02/03) — strategibeslutninger + bygge-batch (alt LIVE)
**Mikkels beslutninger (2026-07-02, sparring):** INGEN auto-publish nogensinde (menneskelig godkendelse = permanent politik; skalering via landsredaktør-model) · DK kører på $0 (Anthropic-nøgle droppet — kreditter kom aldrig; JSON-mode på gratis-kæden i stedet) · Canada nedprioriteret (dæknings-gab-logik) · skader = normal dækning (kun tidslinje-hallucination skal værnes) · kildepolitik: team-sites OK, kommercielle medier kun citatskik; langsigtede søjler = frivillige/freelance-interviews (evt. YouTube) · NSSA-leadgen genoplives når motoren er bevist (15% af fee-aftale fandtes i site v1). **PLAN-autonomi-uk.md er OMSKREVET** til at afspejle alt dette.

**Bygget + deployet (migrations 024–028 kørt remote FØR deploy; alle 193 tests grønne; typecheck ren):**
1. **JSON structured outputs på gratis-kæden**: `GenerateOpts.json` → Mistral/Groq `response_format: json_object`, Gemini `responseMimeType` (CF AI/Anthropic ignorerer flaget bevidst). Skrivefasen beder om `{title, summary, content}`-JSON (`buildSystemPrompt(..., {jsonOutput:true})` + `parseArticleOutputSmart` m. legacy-fallback); `json:true` på alle 6 JSON-kaldesteder (verify-article, box-score, build-factsheet, verify-story, mine-edits, generate). Dræber fed-titel/tomme kladder + prompt-ekko. Test: `_parse-output-test.ts` (19).
2. **Sensitive-detektor** (`pipeline/discover/sensitive.ts`, regelbaseret): crime/discipline/eligibility/personal; værn mod sports-idiomer ("sudden death", "eligibility remaining", "court"). Migration-024 `stories.sensitive`; sat i extract-story + google-news; **rød FØLSOM-badge** øverst i admin-kladdeliste (flagede sorteres først); `sensitiveCareBlock()` føjes til skrive-prompten. Skader er BEVIDST ikke en kategori. Test: `_sensitive-test.ts` (23).
3. **Skade-tidslinje-værn**: system-prompt regel 23 (tidslinjer KUN fra kilden, aldrig estimeret) + verify-article SPECIAL RULE (usourced tidslinje → high).
4. **Byline-fundament**: migration-025 `articles.author_role` (NULL=AI; 'human' skjuler AiDisclaimer i alle 4 templates); redigerbar i admin-editoren (rolle-select). Forbereder frivillige/interviews.
5. **Synlige rettelser**: migration-026 `correction_note`/`corrected_at`; admin-felt (kun publicerede); `CorrectionNotice`-boks ("Rettet [dato]: …") før SourceBox i alle templates. `corrected_at` stemples automatisk i updateArticle.
6. **Review-log**: migration-027 `review_log`; publishArticle logger approved_as_is/edited (content vs original_content), deleteArticle logger rejected (kun AI-kladder); 28-dages fordeling i weekly digest. Formål: EVIDENS for review-omkostning (landsredaktør-rekruttering), ikke auto-publish.
7. **Leads m. attribution (NSSA-prep)**: migration-028 `leads`; offentlig side `/spil-i-usa` (guide-links + formular) → `/api/lead` (isbot + same-origin + honeypot + feltlængder); admin → **Leads** (statusflow ny→kontaktet→videresendt→lukket) + badge på dashboard. Verificeret live: gyldig gemmes, evil-origin + honeypot smides stille væk, tom → 400. Syntetisk verify-række slettet.
8. **YouTube-embeds**: `src/lib/youtube.ts` (`youtubeIdFromUrl` — kun blokke der KUN er en YT-URL; nocookie-domæne = cookieløs status bevaret) + ArticleBody-branch. Test: `_youtube-test.ts` (17).
9. **`/ig` link-i-bio-side** (noindex, mobil-først, seneste 12 artikler som store tryk-mål + CTA'er) — til Instagram-profilens bio-link.
10. **Oprydning**: X-secrets slettet fra GitHub (API død → social-poster springer X over); migrate.sh manglede 023, nu 023–028; pre-eksisterende typefejl i `_honors-test.ts` fikset; admin article-PUT whitelister nu felter eksplicit.

**Udestående før sæsonstart (fra omskrevet plan):** R2 pre-render af kampkort · CI-testkørsel på push · ugentlig D1-backup · D1↔kode drift-tjek på sport/viden-tekster · newsletter (fase 1.5) · Meta-app til Facebook+Instagram (samme app, FB-kode findes).

## 👉 Seneste arbejde (2026-07-02) — faktatjekket indhold DEPLOYET til D1 + Worker
**Opdaget**: 06-30-faktatjekket (commit 307ad7b) ramte kun `src/lib/sport-content.ts`/`viden-content.ts` — men alle 13 sport- + 13 viden-sider har D1-overrides (Phase 1, `resolveSportContent`/pages-tabellen fletter D1 over kode), og alle 26 rækker var seedet **06-24, FØR faktatjekket** → intet af det var faktisk live. Mikkel havde selv lappet `football`-siden manuelt i admin samme morgen (kun Vinatieri-delen, ikke Big House/APA) — den rettelse er nu overskrevet af den fulde, kildebelagte version fra koden (samme faktakonklusion, mere komplet).
- Kørt `npx tsx pipeline/seed/seed-sport.ts` + `seed-guides.ts` → `wrangler d1 execute studentathlete-dk --remote --file=db/seed-sport.sql`/`seed-guides.sql` (upsert, 26 rækker skrevet).
- `npm run deploy` kørt (Worker-version a5b8e2c0) — også fanger `6c74366` (honors-monitor).
- Verificeret live: `/football` viser nu Vinatieri+2018+107.601+APA-Kilder; `/viden/hvad-er-ncaa` viser "91. i 2026"-rettelsen.
- **NB fremover**: `seed-sport.ts`/`seed-guides.ts` er destruktive upserts — kør dem KUN lige efter en kode-ændring af pillar/guide-tekst, ALDRIG uden at tjekke om der er uafhængige admin-redigeringer i D1 først (`wrangler d1 execute ... --command "SELECT slug,updated_at FROM pages WHERE kind IN ('sport','guide')"`).

## 👉 Tidligere arbejde (2026-06-30) — faktatjek (djævelens advokat) + APA-kilder på de statiske tekster
**Mål (Mikkel): maksimér ethos — alle påstande i sport-pillartekster + viden-guider websøgt og verificeret, og "Kilder" omlagt til APA-referenceliste (akademisk stil), fordi AI er en integreret del af projektet.**

Verificeret påstand-for-påstand mod primærkilder. Teksterne var generelt meget præcise; rettelser anvendt i `src/lib/sport-content.ts` + `src/lib/viden-content.ts` (tsc rent):
- 🔴 **Faktafejl rettet — Morten Andersen** (`sport-content.ts`): påstod han er NFL's mestscorende spiller gennem tiderne. Forkert siden 2018 (Adam Vinatieri passerede ham → Andersen nr. 2). Nu korrekt + "Big House" = præcis 107.601 + Signing Day omformuleret (december-perioden er nu primær).
- 🟠 **Inge Nissen** (basketball): titlerne 1979/1980 var **AIAW**, ikke NCAA (NCAA kørte ikke kvindebasketball før 1981-82) → markeret som "AIAW, forløberen for NCAA-turneringen".
- 🟠 Football-intro "wide receivers" → "linemen"; **volleyball** "titusinder" → reelle ~18.000-19.000 (finalestævne); **roning** Sutton strammet til den kildebelagte kendsgerning (første dansker på Cal-holdet, 2015).
- 🟡 Blødgjort ukildebelagte påstande: basketball-seertal, fodbold "faktisk flest danskere" (→ "egen optælling"), football-kausalpåstand. "knap 90 mesterskaber" → "omkring 90 (kvindebrydning = nr. 91 i 2026)".
- **APA-omlægning**: alle "Kilder"/`sources` (17 i sport, 27 i viden) → `Org. (År, D. måned). Title.` som klikbar APA-reference (URL = link-mål bag citatteksten). Tilføjet støttekilder (Pro Football HOF, Women's Basketball HOF, Cal Athletics, golf-history).
- **Statiske sider** (om/ai-brug/kontakt): ingen eksterne faktapåstande → ingen APA nødvendig; Twemoji CC-BY 4.0-kreditering var allerede korrekt. NB: `om.md` "over 100 aktive atleter" = selvpåstand bundet til live-DB — hold den ærlig når rosteren ændrer sig.
- **Forbehold**: nyhedskilder uden tydelig byline brugt med organisation-som-forfatter (gyldig APA-praksis); enkelte `.com`-opslagssider er `(n.d.)`. Personlige bylines kan tilføjes på ønske.
- **Committet (307ad7b) + nu deployet til D1 + Worker (2026-07-02)** — se sektion ovenfor.

## 👉 Seneste arbejde (2026-06-25)
- **Honors-monitor LØST** (`pipeline/discover/honors.ts` + `_honors-test.ts`, 15/15 grøn): regelbaseret `detectHonor()` genkender ugentlige konference-hædersbevisninger ("Player/Athlete/Pitcher/Freshman of the Week", "of the Month", "All-Conference", "All-American"). Wiret ind i `extract-story.extractStoriesForSchool` → `HONORS_BOOST=15` (kappet ved 100) løfter honors-historier i `stories.relevance_score`, så `generate-articles` prioriterer dem. **Ingen ny infra**: honors flyder allerede gennem de skole-feeds der overvåges i check-sources (skolen poster typisk selv "X kåret til Conference POTW"). Verificeret web: konference-sites er Sidearm m. `/rss.aspx` (big12sports.com `.dbml`/`.aspx`, meacsports.com `rss_feeds.aspx`) — `Source.source_type` har allerede `'conference'`-værdi reserveret → konference-feeds kan tilføjes som backup uden skemaændring.
- **Box-score-API research (ikke wiret — afventer go):** `henrygd/ncaa-api` (gratis, self-hostbar, `/game/{id}/boxscore`, multi-sport) = bedste API, MEN nøglet til ncaa.com game-IDs og individuelle stat-lines tynde for D2/D3/NJCAA (stor del af seed). → fast-path for D1-marquee, IKKE erstatning for nuværende Sidearm-scrape (`box-score.ts`). `CollegeFootballData` = rig men kun football. Anbefaling: behold scrape som baseline; tilføj evt. ncaa-api som D1-fast-path senere (kræver game-ID-opslag + build-factsheet-integration = rører genererings-kernen).
- **Hashtags: PAUSET** på Mikkels anmodning (research gjort: Bluesky 2-3 tags = reel discovery, Facebook 0-1, identitets-tag #DanskeriUSA højest værdi; undgå scholarship-framing).

## 👉 Seneste arbejde (2026-06-24)
- **Athlete career-timeline LØST + deployet** (commits 9ff4eca + 131f857; se [[project-studentathlete-generation]]). `athlete_events`-tabel (migration-023) + regelbaseret extractor (`src/lib/athlete-events.ts`) der høster priser/begivenheder ved publish (dedup, fail-safe). Genereringen fodres med kontinuitets-kontekst (`pipeline/generate/timeline.ts`, "N. år i træk"-derivation) via athleteFactsBlock (alle 4 typer). Profil viser "Karriere-højdepunkter"; admin-redigerbar (tilføj/slet) på atlet-siden. Backfill kørt (9 begivenheder). Verificeret live (Marie Madsen).
- **Presseetik-prompts #1 + #2 LØST** (commit 2efc484, pipeline): artikeltekst fra stats/egen komposition; kilde kun til ét citat + tal-tjek; navngiv medie tidligt.
- **Cookie-features LØST** (commits 4a11a58 + 86fc617): scan → sitet er **cookieløst i dag** (ingen Set-Cookie nogen steder). GDPR-samtykkeboks bygget men **dormant** (vises kun når `consent.enabled` slås til i admin → Tekster — gør det når ads/tracking aktiveres). `/cookies`-deklaration (redigerbar) + footer-link + sitemap. `sa_consent`-cookie; "Kun nødvendige" ligestillet m. "Accepter alle"; fremtidige ad-scripts skal læse `sa_consent.marketing`.
- **weekly-digest fix** (commit f1bba02): `.ts`-extension-import fjernet (TS5097).

### Mulige næste skridt (intet aftalt)
- Aktivér ads → slå cookie-boks til + wire ad-scripts bag `sa_consent.marketing`.
- Fanatics-affiliate (bygges fra spec) · crisp-card pre-render (R2/CI) · valgfri citatskik-stramning (mindre kvalitativ udtrækning ved rene medie-kilder).

---


## 👉 Seneste arbejde (2026-06-23) — redaktionel kontrol (Phase 1) + hotfix
**Mål (Mikkels regel): Mikkel skal kunne redigere ALT selv i /admin, uafhængigt af AI-rate-limits. Plan: [EDITORIAL-PLAN.md](EDITORIAL-PLAN.md) i repo-roden.**

Princip: **kode-default + D1-override** — alt læses fra D1 med hardcoded fallback, så intet kan gå i stykker, og indholdsændringer kræver hverken kode eller deploy.

- **Phase 1a LØST + deployet (commit bd5f554, version 13c86b72):** de 13 viden-guider er nu **redigerbare i admin → Sider**. `migration-020` (pages += `kind`/`category`), `seed-guides.ts`→`db/seed-guides.sql` (guider som markdown-pages, kind='guide'), `/viden/[slug]` + hub + sitemap læser D1 med kode-fallback (`guideToMarkdown`). `getPublishedPageBySlug` serverer kun kind='page' (ingen rod-dubletter). Verificeret live: 13 guides 200, ingen dubletter, markdown renderes.
- **OG-HOTFIX (commit e322621):** 1200×630-kortene (v6) sprængte free-plan CPU (10 ms) → 503 "Worker exceeded resource limits" ved kolde renders (+ kaskade-503 på sider). Rullet tilbage til **600×315** (v7). Skarpe kort venter på pre-render (R2/CI) — se nedenfor.
- **Fanatics-template (commit 87b7754, inert):** `src/lib/fanatics.ts` + `src/components/ui/FanaticsAffiliateLink.tsx` — ikke wiret ind; aktiveringstrin i fanatics.ts-header. Mapping: docs `Mikkels eget/StudentAthlete.dk/fanatics-store-mapping.csv`.

- **Phase 1b LØST (commit 8e94f07):** 13 sport-pillar-tekster → redigerbare `kind='sport'`-pages; `resolveSportContent()` fletter D1 over kode (title/pillar/meta). `intro` stadig kode (Phase 2-rest). → **Hele Phase 1: al lang-form prosa (guides+sport+sider) redigerbar.**
- **Phase 2 (core) LØST + deployet (commit c700542, version eb4ad124):** `site_content` KV (migration-021) + `src/lib/site-content.ts`-registry + admin → **Tekster** (`/admin/indstillinger` + `/api/admin/settings`). Redigerbart nu: `site.title`, `site.description`, `footer.blurb`, `disclaimer.ai`. Verificeret: D1-override går live + falder tilbage til kode-default; editor token-gated. Nyt felt = 1 linje i registry + 1 brug (ingen anden kode).

### Redaktionel kontrol — afsluttet (2026-06-23, deployet e1675118 m.fl.)
- **Phase 4 LØST (delvis):** admin → Sider grupperet efter kind (Sider/Guider/Sportssider).
- **Featured/pinned carousel LØST:** `articles.featured` (migration-022); forsidens karrusel viser fastgjorte (fallback nyeste); pin-toggle i artikel-editoren. Verificeret.
- **Shelved (bevidst):** editable nav (strukturel/risiko), edit-blyant (kræver login-session), ad-toggle (rører kerne-render, ads off), sport-intros (lav værdi). Crisp-cards pre-render = separat track (R2/CI), ikke gjort.

### Presseetik — vurdering + beslutninger (2026-06-23)
Vurdering: `Mikkels eget/StudentAthlete.dk/PRESSEETIK-vurdering.md`. Beslutninger truffet:
- **#5 LØST:** ny `/presseetik`-side (rettelse/klage/afpublicering) + footer-link.
- **#6 LØST:** "Menneskelig gennemlæsning"-afsnit tilføjet `/ai-brug`.
- **#3 (forelæggelse) & #4 (mindreårige): ikke et problem** — dækningen er neutral/positiv; college-atleter er ~18+ og vant til dækning.
- **#2 + #1: TODO i pipelinen (prompts) — IKKE gjort endnu.** #2: navngiv kildemediet øverst + max ét direkte citat. **#1 (vigtig):** skift generering så artikelteksten bygges fra STATS/egen komposition; kildeartiklen bruges KUN til ét citat (hvis den har et) + "vibe check" af tal — ikke som tekstgrundlag. Mindsker citatregel-konflikten.

### Parkeret (til når ads aktiveres)
- **Cookie-scan + GDPR-samtykkeboks.** Nødvendig FØR ads går live. NB: nuværende analytics er bevidst **cookieløs** (daglig-saltet hash, IP gemmes aldrig) → ingen banner krævet i dag. Når tredjeparts ad-cookies (Fanatics/ad-net) tilføjes, kræves: forudgående granuleret samtykke (afvis lige så let som accepter), cookie-scan/-deklaration, og at ad-/tracking-scripts først loades efter samtykke. Byg automatisk samtykkeboks + scan af faktisk satte cookies.

### Næste skridt
- **Prompt-ændringer #1 + #2 LØST** (commit 2efc484, pipeline — virker ved næste generering; system.ts regel 4/11/22 + renderFactSheet).
- **Athlete-timeline-feature** (NÆSTE — se [[project-studentathlete-generation]]): `athlete_events`-tabel m. significance-tier (routine/notable/honor → recall-vindue) + `season` + "consecutive honors"-derivation; harvest fra faktaark ved publish; fodres ind i generering; profil-højdepunkter + admin-redigerbar. 3 slices.

---


## 👉 Seneste arbejde (2026-06-22) — SEO-canonical, cover-fixes, Ai-disclaimer, Fanatics-mapping
**Alt deployet til prod (Worker-version f0c16520, commits 426a657 + 9241d2d på main) og verificeret live.**

1. **GSC duplikat-sider (http/www) LØST**: ny `src/middleware.ts` 301-redirecter `http→https` og enhver ikke-kanonisk vært → `https://studentathlete.dk` (skipper /api, _next, dotted-filer via matcher). `www` har i øvrigt INGEN DNS-record → var aldrig en reel duplikatkilde; http:// var det. Tilføjet `metadataBase` + self-canonical på forside/atleter/viden (catch-all havde dem i forvejen). **Mikkels GSC-opgaver**: submit `https://studentathlete.dk/sitemap.xml` (eksisterede allerede, 1935 URLs, auto-opdaterer fra D1) + klik "Validate Fix" på duplikat-rapporten.
2. **Atletfoto ødelagde kort-dimensioner LØST**: `publishArticle()` stamplede tidligere atletens headshot i `cover_image_url` → lister viste råt portræt. Nu returnerer `getArticleCoverUrl()` ALTID det genererede 16:9 kampkort; stamp fjernet; og:image + profil-thumbnails bruger også kampkortet. Rigtige fotos vises kun på atletprofil + inde i artiklen. Verificeret på Marie Eline Madsen-artikel (og:image = `/api/og?type=card&article=80&v=6`).
3. **Kornede kort på store skærme LØST**: OG-kort renderes nu i fuld **1200×630** (var 600×315 via `scale(0.5)`); `CARD_VERSION`→6 buster edge-cachen. NB: 4× pixels = højere render-CPU på free-plan (mitigeret af edge-cache 7d + retry-script; fald til ~900×472 hvis blanke kort under spidsbelastning).
4. **Ai-disclaimer** (commit 426a657): `AiDisclaimer`-komponent i bunden af alle 4 artikelskabeloner, linker til `/ai-brug`.
5. **Fanatics-affiliate (Layer 2) — plan + verificeret mapping** (docs i OneDrive `Mikkels eget/StudentAthlete.dk/`): `fanatics-affiliate-implementation.md` (spec + EU-29) + `fanatics-store-mapping.csv` (alle 104 roster-skoler web-verificeret: 7 EU→fanatics.de, 85 US→fanatics.com, 12 uden butik). Slug delt på tværs af .com/.de/.co.uk. Rutér danskere til .de (ikke .co.uk = post-Brexit told). IKKE bygget i koden endnu. Se [[project-studentathlete-commerce]].

---


## 👉 LØST (2026-06-16, #3): foto-pipelinen kører nu automatisk end-to-end
**Test-kørsel afslørede at JS-rendering ALDRIG har virket. Tre kode-bugs + én token-fejl fundet og fikset (commits 993be62 + fedf346 + 9b18a44). Verificeret i PROD. Se [[project-studentathlete-photos]].**

1. ~~GitHub-secret manglede Browser Rendering-perm (401)~~ **LØST**: secret'en er sat til det fungerende token (`gh secret set CLOUDFLARE_API_TOKEN` med det lokale token, der har Browser Rendering + D1). Verificeret: workflow renderede **47 rosters**, fandt 2 danskere, stoppede pænt på HTTP 429 (dagskvote opbrugt — som designet).
2. `scrape-js-rosters.ts` brugte forkert endpoint (`/scrape` + `formats:["html"]` + streng-`waitForSelector` → HTTP 400, renderede ALDRIG). Omskrevet til `renderPage` (`/content`) + kvote-stop med rå status-logning (401 auth vs 429 kvote).
3. `suggest-photos` havde ingen identitets-gate → køede UNCG's "Lars.png" som Hector Nissen (holdkammerat!). Tilføjet efternavns-match-gate på og:image; afviste det forkerte forslag.

**Pipelinen er nu LIVE**: daglig cron (03:00 UTC) renderer ~47 rosters/dag → backfiller bio_url → gated suggester → kø i admin → Fotos. Roterer gennem skolerne i bidder inden for gratis-kvoten, konvergerer over dage.
**~18 forslag venter på godkendelse** (Madsen + 3 manuelle + Zoe + Karoline Lauritsen + Casper Puggaard + Tobias Kristensen m.fl.). **Mikkels eneste opgave: godkend i admin → Fotos** (tjek Dikte Bang visuelt — uverificeret opaque-hash).

---


## 👉 Seneste arbejde (2026-06-16, #2) — profilbilleder iterativt (commit 214b5ec, pushet)
**0/128 atleter havde foto. Pipeline = bio_url → suggest-photos → admin-godkendelse. Bottleneck: kun 11 havde bio_url (roster-scraper plain-HTTP fejler på JS-Sidearm-sider). Gjorde den daglige JS-scraper til en iterativ, kvote-bunden billed-udfylder. Se [[project-studentathlete-photos]].**

- **Bugfix**: `parseInt(x) || default` gjorde `--max-age-days 0` → 30 (0 er falsy). Rettet i `scrape-rosters.ts` + `scrape-js-rosters.ts` + `suggest-photos.ts`.
- **`scrape-js-rosters.ts`**: fanger nu `bio_url` (INSERT + dedikeret `COALESCE`-backfill-UPDATE på slug, uafhængig af class_year — den GJORDE det ikke før!) + selektionen medtager/prioriterer nu rosters på skoler med aktive danskere uden bio_url (ikke kun `js_required`). `checked_at ASC` roterer gennem de ~95 målskoler over flere daglige kørsler → udfylder bio_url i bidder inden for den gratis browser-kvote (~10 min/dag).
- **`daily-js-scrape.yml`**: kører nu `suggest-photos` lige efter scrapen (plain fetch, ingen kvote) → nye bio_urls bliver til køede headshots samme dag.
- **Manuelt udført forinden**: 10 foto-forslag venter på godkendelse i admin → Fotos (9 auto + Marie Eline Madsen #1, 8 artikler, verificeret). +6 bio_urls sat manuelt på artikel-atleter (nu 17 m. bio).
- **Caveat**: foto kun køet når bio-siden har et navne-matchet og:image (JS-lazy-load-templates giver intet). og:image er IKKE identitetssikkert (UNCG gav holdkammerats foto) → navne-match-gate. Godkendelse er stadig Mikkels gate. Konvergerer gradvist.
- **TODO Mikkel**: godkend de 10 i admin → Fotos. Daglig cron (03:00 UTC) starter backfill; kan trigges nu med `gh workflow run daily-js-scrape.yml`.

---


## 👉 Seneste arbejde (2026-06-16) — first-party analytics (besøg + pageviews + klik)
**Erstattede den bot-tællende edge-logning med en first-party JS-beacon. DEPLOYET til studentathlete.dk + migration 019 kørt mod remote D1 + `ANALYTICS_SALT`-secret sat. Build/typecheck/tests grønne. Committet + pushet til `main` (commits 124f3b3 content + 4f6c5bf analytics; main = prod-tilstand).**

Hvorfor: Statistik-siden viste ubrugelige tal (middleware loggede ALT, inkl. bots; UA-filter alene fanger ikke spoofede scrapers) og kunne ikke spore klik. Beacon = kræver JS-eksekvering (filtrerer de fleste bots som hosted-værktøjer gør) + `isbot`-UA-tjek; data forbliver i egen D1; ingen samtykke-banner; gratis. Valg truffet vs Umami Cloud (se [[project-studentathlete-expansion]] — revurder ved UK-launch hvis funnels/UTM/realtid ønskes).

**Arkitektur:**
- Ny `events`-tabel (migration-019, ÉN tabel for pageview+click). IP gemmes ALDRIG — kun daglig-saltet SHA-256(salt:dato:ip:ua) → unikke mennesker/dag.
- `src/app/api/track/route.ts` (offentlig POST): isbot-filter → same-origin-værn (Origin-host = studentathlete.dk/localhost) → server UDLEDER selv page_type/sport via `classify()` → daglig visitor_hash → INSERT. Returnerer altid 204 (lækker aldrig).
- `src/components/Analytics.tsx` (`"use client"`, i layout): pageview ved mount + `usePathname()`-skift; delegeret klik-lytter (`[data-track]` vinder, ellers eksterne links auto = 'outbound'). Transport: `sendBeacon` → fetch keepalive (`src/lib/track.ts`).
- Klik annoteret: ArticleCard + Carousel + SportLandingPage atlet-links (`data-track="internal"`), AthleteProfilePage bio-link (`bio_out`), AdSlot (`ad`), SearchBar (fyrer `search` i handleSubmit).
- Dashboard (`admin/analytics/page.tsx`) læser nu fra `events` via `getAnalytics()` i `src/lib/analytics.ts`; tilføjet **Unikke besøgende** (sum af daglige distinct hashes) + **Klik**-sektion (efter type + mest klikkede mål).
- SLETTET `src/middleware.ts` (eneste opgave var bot-logningen; `classify()` flyttet til `lib/analytics.ts`). Gammel `pageviews`-tabel + data efterladt urørt (dashboard læser den ikke længere; valgfri oprydning senere).
- Dep: `isbot@^5.1.43`. Test: `src/lib/_analytics-test.ts` (classify/device/click-kind/hash) → `npx tsx src/lib/_analytics-test.ts`.

**Verificeret live (2026-06-16):** curl-tests mod prod → Googlebot-UA + cross-origin (evil.com) = INGEN række; Chrome-UA + Origin = pageview m. referrer-host/DK/desktop/visitor_hash; bio_out-klik m. samme hash. Synthetic verify-rækker slettet bagefter.

**MANGLER (næste session):**
- [ ] **Menneske-sti** (kan ikke køres uden browser): browse et par sider + klik bio-link/kort + søg på studentathlete.dk, åbn så `/admin/analytics?token=…` og bekræft Unikke besøgende + Klik-tal udfyldes. (Sti-tjek af SPA-pageviews + data-track-klik.)
- [ ] **Commit + push** (koden er uncommitted; deployet direkte fra arbejdskopi via `wrangler deploy`).
- [ ] Valgfrit: drop gamle `pageviews`-tabel når dashboardet er bekræftet.

---

## 👉 Tidligere arbejde (2026-06-15) — sport-landingssider, KUN content
**Redigeret: `src/lib/sport-content.ts` (pillar-tekst for alle 13 sportsgrene). Ingen kode/skema ændret. Typecheck ren. Graphify opdateret. UNCOMMITTET.**

- Hver sport fik rigere **"Sæsonens gang"** + **tidbits**. For de individuelle sportsgrene (svømning, atletik, golf, tennis, roning, gymnastik) tilføjet en **"Sådan afgøres en holdkamp"**-sektion, der forklarer skole-mod-skole-formatet (dual meet/match, pointscoring, golf-match-play, cross country lavest-vinder osv.).
- **Webverificerede fakta** (juni 2026): CFP 12 hold (2024), soccer College Cup 48 hold, golf 8-hold match play (siden 2009), tennis først-til-4 + no-ad, baseball CWS 8 hold/BBCOR, svømning 25-yards, roning kvinder=NCAA/herrer=IRA. **Rettet 3 fejl**: football 85-stipendier → 105-trupsloft (House-forliget 2025); DI herre-soccer afskaffede gen-indskiftning 2024; perfekt 10-skala gælder kun KVINDERS NCAA-gymnastik (herrer + elite = åben skala).
- **Tilføjet prolifike danske NCAA-navne** (webverificeret): football Morten Andersen (Michigan State) + Hjalte Froholdt (Arkansas); basketball Christian Drejer (Florida) + Inge Nissen (Old Dominion); svømning Anton Ipsen + Søren Dahl (NC State); atletik Ole Hesselbjerg (Eastern Kentucky); golf Rasmus Neergaard-Petersen (Oklahoma State); tennis Mikael Torpegaard (Ohio State) + August Holmgren (San Diego); roning Joachim Sutton (Cal); ishockey Oliver Lauridsen (St. Cloud State); fodbold = ærlig note (flest danskere, men ingen enkelt stjerne).
- **MANGLER navn** (ingen verificeret prolifik NCAA-dansker fundet — bevidst IKKE opdigtet): baseball, gymnastik, volleyball. Spørg Mikkel hvis der findes navne.

---


## 👉 Næste session — start her (handoff 2026-06-11: social-kø)
**Modul 7 (social media-automation) er bygget og testet lokalt — migration 018 KØRT mod remote D1, men koden er UNCOMMITTET og workflowen kører først når den er pushet + secrets er sat.**

1. **Arkitektur**: `social_posts`-kø i D1 (én række pr. artikel × kanal, UNIQUE-dedup). Publicerede artikler enqueues automatisk (kun published_at < 48t — de 18 gamle artikler backfilles bevidst IKKE, verificeret mod prod). Timevis GitHub Actions-cron (`social-post.yml`, :15) dræner med **adaptiv pacing**: gap = 24t/kø-dybde, clamped 60–180 min. Lille kø → 3t mellem opslag; dyb kø → speeder op til hård grænse 1/time/kanal (Mikkels krav 2026-06-11: adaptiv + hård grænse + friskhed). Kø-rækker ældre end 48t → 'expired' (postes aldrig — friskhedsgarantien).
2. **Kanaler** (`pipeline/social/channels/`): Bluesky (AT Protocol, uploader kampkort som embed-thumb), X (API v2, OAuth 1.0a HMAC-signering i ren node:crypto, gratis tier ~500/md), Facebook Page (Graph API, link-preview automatisk). Ukonfigurerede kanaler (manglende secrets) springes helt over og får ingen kø-rækker → kanaler kan tilføjes gradvist.
3. **Opslagstekst er regelbaseret** (`copy.ts`, ingen LLM): Bluesky = titel (link i embed-kort), X = titel + URL, FB = titel + ingress (link separat). Kampkortet (OG-billedet) er det visuelle. 27 tests i `_social-test.ts` (pacing + copy), typecheck ren.
4. **Fejlhåndtering**: 3 forsøg → status 'failed'; enhver kanal-fejl → exit 1 → Discord-besked (KUN ved fejl, samme princip som discover-daily). `workflow_dispatch` har dry_run-input; lokalt: `npx tsx pipeline/social/post-social.ts --dry-run` (kræver CF-env-vars fra ~/.bashrc).
5. **Verificeret**: migration 018 kørt remote (14 tabeller), dry-run mod prod D1 OK (kø 0 = korrekt, seneste publish 5. juni er uden for vinduet), enqueue-SQL kørt uden fejl.

**STATUS 2026-06-11 (senere samme dag) — committet (1e87d35) + Bluesky LIVE:**
- [x] Commit + push — workflowen kører timevis
- [x] **E-mail**: Cloudflare Email Routing aktiv på studentathlete.dk — social@ + catch-all → m.guldbjerg@gmail.com (destination var allerede verificeret fra GFC-setuppet). Sat op via API (nyt token `CLOUDFLARE_EMAIL_TOKEN` i ~/.bashrc: Email Routing Addresses + Rules + DNS edit; enable-endpointet kræver en permission tokenet ikke har → MX/SPF swappet manuelt via DNS API, verificeret med SMTP-probe RCPT 250 OK). Gamle simply.com MX/SPF slettet.
- [x] **Bluesky LIVE**: konto oprettet (API-signup blokeret af captcha → Mikkel oprettede i appen), handle opgraderet til **@studentathlete.dk** via `_atproto` TXT + updateHandle (app-password-session måtte gerne). DID: did:plc:cuxgz7lfn4735dtwz3pzpp7z. Secrets `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD` sat. Dry-run mod prod OK — første rigtige opslag sker automatisk når næste artikel publiceres.
- [x] **X LIVE**: @StudAthleteDK (dedikeret konto, IKKE Mikkels personlige) — alle 4 secrets sat, verificeret read-write via verify_credentials. NB free tier ~500 posts/md; pacing-cap 24/dag kan teoretisk ramme loftet i tunge uger → tilføj månedsbudget pr. kanal hvis det sker
- [ ] **Facebook**: developers.facebook.com-app + page access token (long-lived via /me/accounts) → secrets `FB_PAGE_ID` + `FB_PAGE_ACCESS_TOKEN` (mest bøvl — kan vente)
- [ ] Bluesky-profil: udfyld avatar/bio/banner i appen (konto er nøgen)

---

### Tidligere handoff (2026-06-10 eftermiddag)
## 👉 (handoff 2026-06-10 eftermiddag)
**Billedmodulet (IDEA-billeder.md niveau 1+2) er bygget, deployet til studentathlete.dk og verificeret live (commit 38bd59e). Migrations 014–016 kørt mod remote D1.**

1. **Kampkort (niveau 1) LIVE**: artikler uden foto viser nu genereret kampkort (skolefarve + twemoji-piktogram + navn/skole + modstander/score fra faktaark + dato). `getArticleCoverUrl()` i seo.ts (bump `CARD_VERSION` ved designændring — edge-cache 7 dage). Verificeret: artikel 79 → Cleveland State-grønt kort, korrekt uden score (transfer-historie).
2. **VIGTIG opdagelse**: `/api/og` har renderet BLANKT i prod siden start (kun brugt til meta-tags, så ingen så det). Tre satori-på-Workers-gotchas fixet: (a) ingen default-font → Playfair 700 + Noto Sans 400/700 TTF i `public/fonts/`, hentes via ASSETS-binding (HTTP-fallback i dev, husk try/catch — dev-shim tager ikke Request-objekter); (b) `inset: 0` understøttes ikke → eksplicitte top/left/right/bottom; (c) alpha-hex i gradients (`#rrggbb88`) fejler → solid farve + rgba()-overlay. Logo inlines som data-URI (Worker kan ikke fetche egen zone).
3. **Skolefarver**: migration-015 + `pipeline/scrape/school-colors.ts` (theme-color/CSS-var-heuristik). Kørt live: **73/101 skoler fik farve automatisk; 28 mangler** → sæt manuelt i **admin → Skoler** (ny side med farvevælger).
4. **Foto-forslag (niveau 2)**: migration-016 + `pipeline/scrape/suggest-photos.ts` (headshot fra bio_url-siden, kredit forudfyldt "Foto: X Athletics") + **admin → Fotos** godkend/afvis-kø (badge-tal på dashboardet). Kørte med 0 forslag — bio_url udfyldes først af søndagens scrape (14. juni); `photos`-job i weekly-scrape.yml fylder køen automatisk derefter.
5. **Statiske sider i admin**: migration-014 `pages.published` (kladde-gate) + publicér-checkbox i admin → Sider + offentlig route viser kun published=1. De 3 udkast (om/kontakt/ai-brug) er seedet som kladder — **Mikkel: udfyld [REDIGER:-felterne i admin → Sider og sæt flueben i "Synlig på sitet"**. Seed klobrer ALDRIG admin-redigeringer (INSERT OR IGNORE).
6. **Free-plan CPU-fix (senere samme dag)**: kolde kampkort-renders ramte fejl 1102 (Workers free = ~10ms CPU; satori er tungere). Firdelt fix: latin-subset-fonte (110KB i stedet for 1,2MB pr. render), eksplicit `caches.default` put/match (**Worker-svar edge-caches IKKE af Cache-Control alene!**), 600×315-canvas via scale(0.5)-wrapper, retry-script i layout + lazy-loading. Sekventielt nu 8/8; samtidige bursts kan stadig fejle enkelte (retry-scriptet healer + cachen holder 7 dage/PoP). Cache varmet for alle 18 publicerede. **Robust slutløsning hvis det driller i sæsonen (mange nye artikler + trafik): præ-render kort i pipelinen → R2 (gratis) ELLER Workers Paid $5/md — Mikkels valg.**
7. **Læringsloop BYGGET + LIVE (commit 89e1cf2)**: `pipeline/learn/mine-edits.ts` miner original_content↔content-diffen på publicerede artikler — regelbaseret ord-diff (vagter: ingen tal=fakta, ingen småord, ingen sætningsskel-støj, omskrivnings-detektion >45%, maks 5/artikel) + LLM-klassifikation (gratis-kæden, fail-open; håndhævede caps fordi svage modeller ignorerer instruktioner). Forslag → `style_corrections` status='suggested' (migration-017: status/rule_type/evidence_count + articles.edits_mined_at) → **admin → Stilguide "Forslag fra pipelinen"** godkend/afvis; godkendt = direkte i system-prompten (husregler som egen blok i buildSystemPrompt). Afvist genforeslås aldrig; gensyn tæller evidence op; enkeltords-par vises først ved 3+ sigtninger. Kører dagligt efter generate (generate-manual.yml). Weekly digest viser nu **redigeringsgrad** (auto-publish-KPI'en) + ventende forslag. 19 tests. Minet de 11 eksisterende redigerede artikler → 58 forslag i kø (admin viser top 25). NOTE: lokal kørsel brugte CF Workers AI (svag) — kvaliteten af LLM-forslag løftes automatisk når ANTHROPIC_API_KEY sættes 15.-16. juni.
8. **🎓 Dimissions-badge BYGGET + LIVE (commit 4502344)**: atleter med expected_graduation forbliver AKTIVE med badge (1. juni dimissionsår → 31. maj året efter) = discovery dækker stadig draft-/pro-kontrakt-nyheder i badge-året (Mikkels præcisering 2026-06-10). Vises på atletprofil (hero-chip + status) og /atleter-kort. `pipeline/report/retire-graduates.ts` (dry-run default; --apply i weekly-scrape) pensionerer til alumni FØRST efter vinduet. Afledt af expected_graduation → 5.-årsspillere mister badgen automatisk når scraperen skubber året. 19 atleter (2026) badget nu; 0 klar til pensionering (korrekt). Coverage: 82/126 aktive har expected_graduation — resten fanges efterhånden af roster-scrapes (class-year.ts).
9. **Kampkort-status (ærligt)**: efter font-subset + edge-cache + 600×315 + retry-script renderer kort pålideligt sekventielt (8/8) men samtidige kolde bursts kan stadig fejle nogle (fri-plan CPU, fejl 1102) — retry-scriptet healer i browseren og cachen holder 7 dage/PoP. Artikel 72/73/79-kort ville ikke rendere i test-vinduet (budget-throttling efter mange testkald) — de healer ved første rigtige besøg. Robust slutløsning hvis det driller i sæsonen: præ-render → R2 (gratis, byggearbejde) eller Workers Paid $5/md.

**TODO MIKKEL (uændret + nyt):**
- [ ] **15.–16. juni: `ANTHROPIC_API_KEY`** som GitHub-secret (kredit åbner)
- [ ] Redigér de 3 sider i **admin → Sider** (ikke længere md-filerne) + publicér
- [ ] Udfyld de 28 manglende skolefarver i **admin → Skoler** (liste i school-colors-output; kør evt. `npx tsx pipeline/scrape/school-colors.ts --dry-run` igen)
- [ ] CF Access (`SETUP-cloudflare-access.md`, 15 min)

---

### Tidligere handoff (2026-06-10 formiddag)
## 👉 (handoff 2026-06-10)
**SWOT-analyse → `PLAN-autonomi-uk.md` (mål: autonom til publicering → auto-publish af korte artikler → UK). Fase 0 påbegyndt — alt UNCOMMITTET i working tree:**

1. **Plan**: `PLAN-autonomi-uk.md` — 4 faser med acceptkriterier. Kernen: review-tid er eneste ikke-skalerende led; auto-publish-gate defineres EMPIRISK af én sæsons review-data (log godkendt/redigeret/afvist — fase 1.3, ikke bygget endnu); UK-launch gated på bevist auto-publish.
2. **Kø-fuld-ping** (`generate-manual.yml`): `SKIP_REASON=max_pending_drafts` surfaces nu som egen Discord-besked ("⚠️ Kladde-kø fuld — generering pauset", orange) i stedet for misvisende "Ingen nye historier". YAML valideret.
3. **Review-ergonomi**: (a) kladde-kø sorteret efter risiko — lav→uverificeret→medium→høj, ældste først (hurtige godkendelser først = køen tømmes = MAX_PENDING_DRAFTS frigøres); (b) grønt "✓ Lav risiko"-badge på dashboardet; (c) **faktaark-panel** på rediger-siden (`FactSheetPanel.tsx`, ny `getFactSheetForArticle()` i admin.ts, `a.story_id` tilføjet ARTICLE_SELECT) — viser fase 1-faktaarket + kilde/box-score-links ved siden af kladden, så review ikke kræver at åbne kilden. Typecheck ren (src + pipeline; weekly-digest TS5097-fejlen er præ-eksisterende, tsx kører den fint).
4. **Statiske sider**: udkast i `content/pages/` (om.md, kontakt.md, ai-brug.md) med `[REDIGER:]`-pladsholdere. **Mikkel: redigér + indsæt e-mail**, så `npx tsx pipeline/seed/seed-pages.ts` (nægter at indlæse filer med pladsholdere; `--dry-run` virker). Footer har nu også "Sådan bruger vi AI"-link (/ai-brug). Siderne serveres via `[...segments]` + pages-tabellen.
5. **CF Access**: `SETUP-cloudflare-access.md` — trinvis guide (~15 min, dashboard-arbejde, ingen kode). Verificeret: intet kalder `/api/admin` server-til-server → simpel e-mail-policy rækker.

**TODO MIKKEL:**
- [ ] **15.–16. juni: sæt `ANTHROPIC_API_KEY`** som GitHub-secret når kreditterne åbner (plan-punkt 0.1) → derefter structured outputs på skriv/verificér (0.2)
- [ ] Redigér `content/pages/*.md` (udfyld `[REDIGER:]`) → kør seed-pages
- [ ] Følg `SETUP-cloudflare-access.md` (15 min)
- [ ] Commit af ovenstående (uncommittet på main)

---

### Tidligere handoff (2026-06-09)
## 👉 (handoff 2026-06-09)
**Committet på branch `feat/data-quality-dedup-backtest` (IKKE pushet/merget endnu). Fem leverancer, 91 tests grønne:**

0. **Box-score-FIX (vigtigst)** — den live backtest afslørede at box-scores v2 **aldrig har virket på Sidearm** (den dominerende platform): (a) `renderPage`-default `networkidle0`/30s timeouter pga. tracking-pixels, (b) `extractMainText` gav 404K tegn navigation så spiller-tabellen (tegn ~19K) lå udenfor `extractBoxScoreStats`' 6000-tegns-vindue → alle spillere gav `found:false`. Fix: `browser-render.ts` default → `networkidle2`/45s; ny `extractBoxScoreText()` målretter stat-tabellerne. **Valideret live: Wyoming/Pedersen career-high 29 PTS, 8-13 FG, 10-10 FT korrekt udtrukket.** (commit 36ff346)
1. **Klassifikator-fix** — `isDanishHometown` (`pipeline/lib/danish-cities.ts`) fanger nu fulde US-statsnavne + "By, Stat / High School"-format + typo-tilfælde; "Elsinore"-alias fjernet. 6 false-positive "danskere" deaktiveret (active=0, reversibelt) via `cleanup-false-positives.ts` (nu dry-run-default). Live: **127 aktive / 9 inaktive.** Test: `pipeline/lib/_danish-cities-test.ts`.
2. **Dedup + transfer** — ny `pipeline/lib/athlete-identity.ts` (identitet på tværs af navne-varianter; mellemnavns-konflikt-guard). Marqus Marion-dublet flettet (#33→#272). Scraperen opdaterer nu eksisterende række (inkl. university) ved transfer i stedet for ny slug. Sweep-script: `pipeline/report/dedup-athletes.ts`. Test: `_athlete-identity-test.ts`.
3. **Officielt bio-link** — `migration-013-bio-url.sql` (kørt mod remote D1), parsere fanger href, scraper gemmer `bio_url`, vist på atletprofil. **Udfyldes ved næste ugentlige scrape.**
4. **Backtest-harness** — `pipeline/backtest/` (offline, deterministisk, 4/4 fixtures). Kører den ægte box-score+to-fase-pipeline via injicerede replay-deps. Kør: `npx tsx pipeline/backtest/run-backtest.ts`. **Mangler:** rigtige in-season-fixtures (creds + håndverificering — se `pipeline/backtest/README.md` RECORD MODE).

**Beslutning:** ekspansion → **UK** (engelsk = ingen oversættelse; ~8× DK's pool). Sekvens uændret: validér DK in-season → parametrisér "dansk" til country-profile → klон.
**Sikkerhed:** admin = statisk `ADMIN_TOKEN` i URL'en (`?token=`), håndhævet på både sider + mutérende API'er. Svaghed = URL-læk/ingen rotation/ingen identitet. **Opgradér til Cloudflare Access før UK-launch** (gratis, edge, ingen token i URL).
**TODO DIG:** sæt `ANTHROPIC_API_KEY` (Claude-routing) + CF Web Analytics-token (uændret fra før). Overvej `git commit` af ovenstående.

---

### Tidligere handoff (2026-06-03)
## 👉 (handoff 2026-06-03)
**Box scores v2 (plan-trin 7) er bygget + unit-testet (39 tests grønne) + typecheck ren, committet + pushet til main. Sidste plan-trin i to-fase-generering er færdigt. Mangler kun live in-season validering på en rigtig recap m. box-score-link (off-season nu → ingen at ride på; fail-open, så det aldrig blokerer en artikel).**

1. **Parser-fix VIRKER i prod** ✅ — scrape-run `26870990500` færdig: **+5 nye danske atleter** (124→129 aktive), **113 'error'→parsed** (8308→8195). `parseRoster` faldt aldrig tilbage til generisk tabel-parser → fejlagtigt-'error' Sidearm-tabel-sider. Aktuelle tal: **133 atleter / 129 aktive · roster_checks: 71 success / 4646 empty / 8195 error / 108 js_required.**
   - **Fortsætter automatisk**: ~2.288 fetch-ok 'error'-rækker blev nulstillet (`checked_at=NULL`); kun én batch (500/division) er kørt. Den ugentlige scrape (søndag 04:00 UTC) tygger resten — atlettal stiger uden indgriben. Render (rate-limited) tager JS-shell-resten. Vil man fremskynde: trigger `weekly-scrape.yml` igen.
2. **DU mangler at gøre**: sæt `ANTHROPIC_API_KEY` som GitHub-secret ($15-kredit) → aktiverer Claude-routing (feature/season) + opgraderer fakta-verifikation. Indtil da kører alt på gratis-kæden (fungerer fint).
3. **CF token**: Browser Rendering-permission tilføjet ✅ (render virker; 429 = per-minut rate limit → `renderPage` retry/backoff).
4. **Box scores v2 BYGGET** ✅ (plan `clever-popping-storm.md` trin 7) — `pipeline/generate/box-score.ts` (ny): `findBoxScoreUrl` (deterministisk link-detektion, ingen LLM), `extractBoxScoreStats` (LLM, fail-open), `mergeBoxScoreIntoFactSheet` (tagger `source:"boxscore"`, overstyrer aldrig prosa, dedupe), `renderBoxScoreBlock` (fase 3 autoritativ tal-blok), `enrichFactSheetWithBoxScore` (orkestrering, ≤1 render/historie, deps injiceret). Wiret i fase 1 (`build-factsheet.ts`: `--no-boxscore`, `--boxscore-budget N` default 8) + fase 3 (`verify-article.ts`: tal der modsiger box scoren → `fabrication_risk='high'`). Tests: `_boxscore-test.ts` (39 grønne). Wiring-smoke-test mod live D1 OK (0 historier off-season). Ingen migration/workflow-ændring (kolonner + steps fandtes). **Mangler**: live in-season validering på en rigtig recap m. box-score-link (off-season = ingen at ride på nu; fail-open så det aldrig blokerer).
   - **Bevidst begrænsning**: link-scan bruger plain fetch af kildesiden — JS-shell-recaps uden statisk box-score-link fanges ikke (renderer ikke kildesiden for at finde linket; kun selve box scoren renderes). Dækker recaps med server-renderet "Box Score"-anker (de fleste Sidearm-templates + CMS-sider).
5. **Udskudt** (bevidst): 599 juco/NAIA missing-website skoler — lav dansk-densitet; NCAA er fuldt dækket.

**Verificér to-fase pipeline manuelt**: `build-factsheet.ts` → `generate-articles.ts` → `verify-article.ts` (kører i `generate-manual.yml` i den rækkefølge). Off-season nu, så få nye historier.
**Fase**: Pipeline fungerer / redaktionel gennemgang

## Oversigt

Nyhedsplatform for danske college-atleter i USA. Next.js + Cloudflare D1.
Pipeline: discovery (skole-feeds) → generering → kladder i admin.

## Arkitektur

| Komponent | Teknologi |
|-----------|-----------|
| Frontend / admin | Next.js (App Router), Tailwind, Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Pipeline | TypeScript + tsx, GitHub Actions |
| LLM (generering) | ProviderChain: Mistral → Gemini → Groq → CF AI → Anthropic |

## Gennemførte trin

- [x] Infrastruktur: Next.js + D1 + Cloudflare Workers deploy
- [x] Database-schema (migrations 001–010)
- [x] Admin-panel: kladder, publicering, atleter, stilguide, pipeline-overblik
- [x] Discovery: skolefeed-scraping (RSS + HTML)
- [x] Artikelgenerering via LLM ProviderChain (multi-provider fallback)
- [x] GitHub Actions: discovery hvert 6. time, backfill + generate kl. 07:00/07:30 UTC
- [x] Pipeline UI: knapper i admin med realtids-polling af GitHub Actions-status
- [x] **Pipeline-fix (april 2026)**: `content_raw IS NOT NULL`-kravet fjernet — genererer nu fra `summary` (RSS `<description>`) når fuld artikeltekst ikke kan hentes
- [x] **Diagnostik**: generate-scripts viser fordeling af historier per indholdskilde ved hver kørsel
- [x] **Polling-fix**: 30s clockskew-buffer i run-status API så "Venter i kø" ikke sidder fast
- [x] **Fane-titel**: browser-tab opdateres med kørestatus (Venter / Korer / Faerdig / Fejl)
- [x] **Google News fjernet** (april 2026): `auto-sources.ts` slettet, `checkGoogleNewsSources()` og hjælpefunktioner fjernet fra `check-sources.ts`. Pipeline bruger nu kun skole-feeds som datakilde. `source-trust.ts` beholdes.
- [x] **Server-side analytics** (april 2026): `src/middleware.ts` logger pageviews til D1 via `ctx.waitUntil()` (nul latency). Admin-dashboard på `/admin/analytics` med datointerval-vælger (presets + custom). CF Web Analytics-beacon klar til aktivering (token mangler — se `layout.tsx`).: `auto-sources.ts` slettet, `checkGoogleNewsSources()` og hjælpefunktioner fjernet fra `check-sources.ts`. Pipeline bruger nu kun skole-feeds som datakilde. `source-trust.ts` beholdes.

- [x] **Discord-digest fixet** (2026-06-02): `weekly-digest.ts` brugte `created_at` på `stories` (kolonnen findes ikke — tabellen bruger `discovered_at`) → SQLITE_ERROR, begge planlagte kørsler fejlede. Talte også `status='published'` på stories (forekommer aldrig; lifecycle er new→drafting→drafted) → rettet til `status='drafted'`. Verificeret: manuel kørsel grøn, digest leveret til Discord.

- [x] **Discord-kommando-notifikationer** (juni 2026): Discord-botten (`workers/discord-bot/index.ts`) udløser 4 workflows via slash-kommandoer (`/discover`→discover-daily, `/generate`→generate-manual, `/scrape`→weekly-scrape, `/stats`→weekly-digest) og lover "du får besked når det er færdigt". Før svarede kun `/generate` (+ `/stats` via selve digesten). Nu giver alle 4 besked — både manuelle OG planlagte kørsler:
  - `discover-daily.yml`: **kun ved fejl** (`if: failure()`). Mikkel 2026-06-04: stories er IKKE dashboard-elementer (en story uden kladde har ingen værdi) → ingen "fandt N"-besked overhovedet. Dashboard-signalet er `/generate: N kladder klar`. (Tidligere variant med found-gate fjernet sammen med tæller-fixet.)
  - `weekly-scrape.yml`: separat `notify`-job (ÉN besked for D1–D3-matrixen, ikke 3) på `always()` → både manuel og planlagt søndags-cron (ugentlig = lav støj).
  - `weekly-digest.yml`: succes poster digesten selv; tilføjet `if: failure()`-besked så et brudt digest-job ikke fejler tavst (jf. SQLITE-fejlen 2026-06-02). Både planlagt + manuel.
  - YAML-valideret (3 filer parser, betingelser OK). Ikke live-trigget (ville køre rigtige jobs + poste i delt Discord → blokeret som uden for opgaven). Verificér ved at køre `/discover` fra Discord.

- [x] **Discover-tæller fikset** (2026-06-04): `check-sources.ts` talte feed-matches, ikke faktiske inserts — `INSERT OR IGNORE` kaster IKKE ved dublet-url_hash, så gen-matchede RSS-items (bliver i feedet i dagevis) blev talt som "nye" ved HVER kørsel → Discord-phantom "fandt 2" uden nye DB-rækker. Verificeret mod live D1: **0 stories siden 06-02**; den ene admin-kladde er artikel 76 ("Madsen All-American", `published=0`), genereret 06-03 fra en 06-02-story — ægte, men urelateret til discovery. Fix: `D1Client.execute` returnerer nu resultatet (var `void`); tæl kun `meta.changes > 0`; ægte insert-fejl logges nu (ikke tavst). Generate-tælleren ("Genereret N artikeludkast" = dashboard-signalet) er OK: dedup på story_id + plain INSERT + tæl efter succes. Se [[laerdomme]] #30.

## Aktuel status

Pipeline kører. **Off-season** (juni): skole-feeds er stille — discovery finder ~1 historie/uge. Få kladder genereres pt. (datagrundlag, ikke fejl).

**Detektion-overhaul (juni 2026)** — fokus: billig/gratis automatisk atlet- + nyhedsopdagelse (se `WORKLOG-detection.md`):
- **PARSER-FIX (juni 2026, største atlet-unlock)**: `parseRoster` (`parsers/index.ts`) faldt aldrig tilbage til den generiske tabel-parser når `parseSidearm` gav 0 → **2.368 roster-checks hentede 200 OK men blev fejlagtigt 'error'** (Sidearm-tabel-layout). Fix: fald tilbage til `parseGeneric`. Stikprøve: ~27% genvindes straks af parser-fixet (~620 rosters), resten er JS-shells til render. 2.288 fetch-ok 'error'-rækker er nulstillet (`checked_at=NULL`) → genscrapes med fixet ved næste kørsel.
- **CF Browser Rendering** (`pipeline/lib/browser-render.ts`) som fallback i roster-scraping + backfill for JS-sider. ✅ Token-permission tilføjet (render virker; 429 = per-minut rate limit → retry/backoff). Resterende JS-shell 'error'/js_required genvindes herigennem.
- **Roster-audit**: 599/1761 skoler mangler website — scopet juni 2026: **alle er NJCAA (juco) + NAIA** (ingen NCAA mangler website; alle 1085 NCAA dækket). Lav dansk-densitet tier → **udskudt** (fokus NCAA). Hvis pursued senere: scrap njcaa.org/naia.org medlemskataloger (ikke 599 søgninger). 'empty'-status (4.533) = roster parset, ingen danskere (normalt, ikke fejl).
- **Præcis nyhedsmatching** (`extract-story.ts`): Unicode hele-ord + bekræftelse (fuldt navn/fornavn/sport-kontekst); almindelige efternavne kræver fornavn. Dræber navnedobbeltgængere.
- **Dansk by-detektion** (`danish-cities.ts`): by-liste som 2. signal (fanger rosters uden "Denmark"-markør); US-stat-guard bevaret.
- **Google News genindført** (`google-news.ts` + `verify-story.ts`): navnesøgning + matcher + isBlockedDomain + LLM-verifikation af ALLE kandidater (`source_type='google_news_rss'`). Daglig workflow 05:30 UTC.
- **Roster-prioritering**: skoler der allerede har en dansker scrapes først.
- **Oprydning**: 545 døde `google_news`-rækker (status='new') arkiveret → generate's fantom-backlog = 0.

**Frossen backlog ryddet**: de gamle Google News-rækker er nu `status='archived'` (reversibelt).

Kladder skal gennemgås manuelt i `/admin` — godkend, rediger eller afvis.

## Næste skridt

### Kræver kørsel nu
1. [x] **Migration-011 kørt** — `pageviews`-tabel verificeret i remote D1 (2026-05-26)
2. [x] **Deployet** — `/admin/analytics` returnerer 200 live (2026-05-26)
3. [ ] **CF Web Analytics** — hent token i CF Dashboard → Analytics → Web Analytics, uncomment script-tag i `layout.tsx`

### Redaktionelt (løbende)
4. **Gennemgå kladder** — godkend eller afvis i `/admin`
5. **Trigger generate manuelt** for at tømme backloggen (~189 historier, 5 pr. kørsel)

### Artikel-nøjagtighed — TO-FASE GENERERING BYGGET (juni 2026, plan: `clever-popping-storm.md`)
Pipeline er nu: **backfill (fase 0) → faktaark/fact-finding (fase 1) → skriv fra faktaark (fase 2) → verificér (fase 3)**. Kører i `generate-manual.yml`.
- [x] Prompt-hærdning (`system.ts` regel 16; betinget længde; ingen sæson-sammenligning).
- [x] **Fase 0**: `renderPage()` fallback i `backfill-content.ts` (dormant til CF token-permission).
- [x] **Fase 1**: `build-factsheet.ts` — udtrækker struktureret faktaark (stats + **kvalitative** fakta + citater, kilde-tagget); `fact_status` gate. Verificeret: midtbane-recap (0 mål/assists) fanget korrekt uden hallucination. Se [[feedback-article-prose-vs-stats]].
- [x] **Fase 2**: `generate-articles.ts` skriver KUN fra faktaark; DB-fakta via `athleteFactsBlock`.
- [x] **Fase 3**: `verify-article.ts` → `articles.fabrication_risk` + `fact_flags`; badge i admin. Kildebaseret prosa flages IKKE; kun upålagte påstande (fangede opdigtet alder "21" i test).
- [x] **$15 Claude**: `preferProvider:"anthropic"` for feature/season_update (dormant til `ANTHROPIC_API_KEY` sættes).
- [x] **Box scores (v2)** — task #16 BYGGET (juni 2026): `box-score.ts` detektér (`findBoxScoreUrl`, regelbaseret) + render + udtræk (`extractBoxScoreStats`, fail-open) box score som `source:"boxscore"` i fase 1 (`build-factsheet.ts`); tal-kryds-tjek i fase 3 (`verify-article.ts` — modstrid m. box score → `high`). Box scores = grundsandhed for TAL, aldrig erstatning for kvalitativ prosa. 39 unit-tests grønne; typecheck ren; wiring verificeret mod live D1. Afventer in-season validering på rigtig recap.

### Kræver dig (credentials)
- **CF token**: tilføj "Browser Rendering — Edit" permission → aktiverer render i roster-scrape + backfill.
- **`ANTHROPIC_API_KEY`** ($15-kredit): sæt som GitHub-secret → verifikation + feature-skrivning opgraderes automatisk til Claude.

### Kode (øvrigt)
8. **Statiske sider** — Om, Kontakt, AI-brug (30 min, indsæt indhold via admin → Sider)
8. **Statiske sider** — Om, Kontakt, AI-brug (30 min, indsæt indhold via admin → Sider)
9. **Billedgenerering** (modul 8) — Unsplash API anbefales som start
10. **Social media automation** (modul 7) — Bluesky AT Protocol API (gratis)

---

## Kendte problemer

| Problem | Status |
|---------|--------|
| `content_raw` er NULL for alle historier — JS-sider kan ikke scrapes med plain HTTP | Midlertidigt løst: genererer fra `summary`. Langsigtet fix: CF Browser Rendering |
| MAX_PENDING_DRAFTS = 20 stopper generering stille hvis kladder hober sig op | Dokumenteret — løses ved regelmæssig gennemgang af admin |
| Ralph-pipeline (JSON til output/) er ikke koblet til D1 | Ikke prioriteret — D1-pipeline bruges i stedet |

## Learnings

- **satori/ImageResponse på Cloudflare Workers (2026-06-10)**: ingen default-font (tekst forsvinder tavst — routen var blank i prod i månedsvis), `inset`-shorthand ignoreres (div'er kollapser til 0×0), alpha-hex i gradients (`#rrggbb88`) fejler tavst. Fonte skal leveres eksplicit (TTF via ASSETS-binding; statiske weights, IKKE variable fonts); brug eksplicitte top/left/right/bottom; rgba() i gradients. Egen zone kan ikke fetches fra Workeren → inline assets som data-URI.

- `fetchStoryContent` bruger plain HTTP og fejler for JS-renderede college-sider ved discovery OG backfill (samme funktion) — backfill-steget giver nul merværdi for disse URL'er
- GitHub Actions clockskew: `run.created_at` stempletes ~200ms inden `triggeredAt` returneres til klienten — `>=`-sammenligning skal have buffer
- Google News blev fjernet april 2026 (scam-redirects, navnedobbeltgængere) — **genindført juni 2026** med løsning på dobbeltgænger-problemet: præcis hele-ord-matcher + LLM-verifikation af alle kandidater + domæne-blocklist + obituary-filter. Den oprindelige svaghed var manglende disambiguering, ikke kilden selv.
