# StudentAthlete.dk — Status

**Sidst opdateret**: 2026-06-03 (box scores v2 bygget — sidste plan-trin færdigt)

## 👉 Næste session — start her (handoff 2026-06-03)
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

- `fetchStoryContent` bruger plain HTTP og fejler for JS-renderede college-sider ved discovery OG backfill (samme funktion) — backfill-steget giver nul merværdi for disse URL'er
- GitHub Actions clockskew: `run.created_at` stempletes ~200ms inden `triggeredAt` returneres til klienten — `>=`-sammenligning skal have buffer
- Google News blev fjernet april 2026 (scam-redirects, navnedobbeltgængere) — **genindført juni 2026** med løsning på dobbeltgænger-problemet: præcis hele-ord-matcher + LLM-verifikation af alle kandidater + domæne-blocklist + obituary-filter. Den oprindelige svaghed var manglende disambiguering, ikke kilden selv.
