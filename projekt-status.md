# StudentAthlete.dk — Status

**Sidst opdateret**: 2026-06-11 (social media-automation modul 7 — BYGGET, UNCOMMITTET)

## 👉 Næste session — start her (handoff 2026-06-11: social-kø)
**Modul 7 (social media-automation) er bygget og testet lokalt — migration 018 KØRT mod remote D1, men koden er UNCOMMITTET og workflowen kører først når den er pushet + secrets er sat.**

1. **Arkitektur**: `social_posts`-kø i D1 (én række pr. artikel × kanal, UNIQUE-dedup). Publicerede artikler enqueues automatisk (kun published_at < 48t — de 18 gamle artikler backfilles bevidst IKKE, verificeret mod prod). Timevis GitHub Actions-cron (`social-post.yml`, :15) dræner med **adaptiv pacing**: gap = 24t/kø-dybde, clamped 60–180 min. Lille kø → 3t mellem opslag; dyb kø → speeder op til hård grænse 1/time/kanal (Mikkels krav 2026-06-11: adaptiv + hård grænse + friskhed). Kø-rækker ældre end 48t → 'expired' (postes aldrig — friskhedsgarantien).
2. **Kanaler** (`pipeline/social/channels/`): Bluesky (AT Protocol, uploader kampkort som embed-thumb), X (API v2, OAuth 1.0a HMAC-signering i ren node:crypto, gratis tier ~500/md), Facebook Page (Graph API, link-preview automatisk). Ukonfigurerede kanaler (manglende secrets) springes helt over og får ingen kø-rækker → kanaler kan tilføjes gradvist.
3. **Opslagstekst er regelbaseret** (`copy.ts`, ingen LLM): Bluesky = titel (link i embed-kort), X = titel + URL, FB = titel + ingress (link separat). Kampkortet (OG-billedet) er det visuelle. 27 tests i `_social-test.ts` (pacing + copy), typecheck ren.
4. **Fejlhåndtering**: 3 forsøg → status 'failed'; enhver kanal-fejl → exit 1 → Discord-besked (KUN ved fejl, samme princip som discover-daily). `workflow_dispatch` har dry_run-input; lokalt: `npx tsx pipeline/social/post-social.ts --dry-run` (kræver CF-env-vars fra ~/.bashrc).
5. **Verificeret**: migration 018 kørt remote (14 tabeller), dry-run mod prod D1 OK (kø 0 = korrekt, seneste publish 5. juni er uden for vinduet), enqueue-SQL kørt uden fejl.

**TODO MIKKEL (nyt — social):**
- [ ] **Commit + push** (workflowen aktiveres først da)
- [ ] **Bluesky**: opret konto til StudentAthlete.dk → Settings → App Passwords → GitHub-secrets `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD` (5 min — kør først med kun denne kanal)
- [ ] **X**: developer.x.com → opret app (free tier) → secrets `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` (appens permissions skal være "Read and write" FØR access token genereres)
- [ ] **Facebook**: developers.facebook.com-app + page access token (long-lived via /me/accounts) → secrets `FB_PAGE_ID` + `FB_PAGE_ACCESS_TOKEN` (mest bøvl — kan vente)
- [ ] Test: Actions → "Social media-kø" → Run workflow med dry_run=true

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
