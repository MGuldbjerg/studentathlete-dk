# StudentAthlete.dk — Status

**Sidst opdateret**: 2026-04-15 (Server-side analytics implementeret)
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
- **CF Browser Rendering** (`pipeline/lib/browser-render.ts`) som fallback i roster-scraping for JS-sider (de ~0,5% success-rate skyldes JS-blokerede Sidearm-sider). ⚠ Kræver "Browser Rendering"-permission på CF-token (auth-fejl 10000 indtil da; degraderer pænt til plain scraping).
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
- [ ] **Box scores (v2)** — task #16: detektér+render+udtræk box score som `source:"boxscore"` i fase 1; tal-kryds-tjek i fase 3. Box scores = grundsandhed for TAL, aldrig erstatning for kvalitativ prosa.

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
