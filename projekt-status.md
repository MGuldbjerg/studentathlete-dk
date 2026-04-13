# StudentAthlete.dk — Status

**Sidst opdateret**: 2026-04-13
**Fase**: Pipeline fungerer / redaktionel gennemgang

## Oversigt

Nyhedsplatform for danske college-atleter i USA. Next.js + Cloudflare D1.
Pipeline: discovery (skole-feeds + Google News) → generering → kladder i admin.

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
- [x] Discovery: skolefeed-scraping (RSS + HTML) + Google News per atlet
- [x] Artikelgenerering via LLM ProviderChain (multi-provider fallback)
- [x] GitHub Actions: discovery hvert 6. time, backfill + generate kl. 07:00/07:30 UTC
- [x] Pipeline UI: knapper i admin med realtids-polling af GitHub Actions-status
- [x] **Pipeline-fix (april 2026)**: `content_raw IS NOT NULL`-kravet fjernet — genererer nu fra `summary` (RSS `<description>`) når fuld artikeltekst ikke kan hentes
- [x] **Diagnostik**: generate-scripts viser fordeling af historier per indholdskilde ved hver kørsel
- [x] **Google News-filtrering**: afviser navnedobbeltgængere via sport/universitets-kontekst-tjek
- [x] **Google News-datogrænse**: `<pubDate>` parses, artikler ældre end 7 dage afvises
- [x] **Polling-fix**: 30s clockskew-buffer i run-status API så "Venter i kø" ikke sidder fast
- [x] **Fane-titel**: browser-tab opdateres med kørestatus (Venter / Korer / Faerdig / Fejl)

## Aktuel status

Pipeline kører og producerer kladder. Seneste kørsel genererede 5 artikler fra 194 historier med summary. Backlog: ~189 historier resterende i `status='new'` (behandles 5 ad gangen per daglig kørsel).

Kladder skal gennemgås manuelt i `/admin` — godkend, rediger eller afvis. Kvaliteten varierer: Google News-historier uden fuldt indhold kan blive tynde.

## Næste skridt

1. **Gennemgå kladder** — godkend eller afvis de 5 genererede artikler i `/admin`
2. **Trigger generate manuelt** igen for at tømme backloggen hurtigere (5 pr. kørsel)
3. **Google News-historier om forkerte personer**: eksisterende fejlklader (Peter Webster / musikartikel) afvises manuelt i admin
4. **Vurder artikel-kvalitet** — kladder fra kun headline/summary er kortere; overvej om de skal slettes eller redigeres
5. **Cloudflare Browser Rendering** til backfill — ville give `content_raw` for JS-renderede athletics-sider (pt. er `content_raw = 0` for alle historier)
6. **Billedgenerering** (modul 8 — ikke påbegyndt)
7. **Social media automation** (modul 7 — ikke påbegyndt)

## Kendte problemer

| Problem | Status |
|---------|--------|
| `content_raw` er NULL for alle historier — JS-sider kan ikke scrapes med plain HTTP | Midlertidigt løst: genererer fra `summary`. Langsigtet fix: CF Browser Rendering |
| Google News kan returnere artikler om navnedobbeltgængere | Delvist løst: sport/uni-kontekstfilter + 7-dages datogrænse |
| MAX_PENDING_DRAFTS = 20 stopper generering stille hvis kladder hober sig op | Dokumenteret — løses ved regelmæssig gennemgang af admin |
| Ralph-pipeline (JSON til output/) er ikke koblet til D1 | Ikke prioriteret — D1-pipeline bruges i stedet |

## Learnings

- `fetchStoryContent` bruger plain HTTP og fejler for JS-renderede college-sider ved discovery OG backfill (samme funktion) — backfill-steget giver nul merværdi for disse URL'er
- Google News RSS-søgning matcher ikke altid begge citerede termer — efternavnsfiltrering alene er utilstrækkelig til at fange navnedobbeltgængere
- GitHub Actions clockskew: `run.created_at` stempletes ~200ms inden `triggeredAt` returneres til klienten — `>=`-sammenligning skal have buffer
