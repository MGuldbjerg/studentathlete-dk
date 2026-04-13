# StudentAthlete.dk — Status

**Sidst opdateret**: 2026-04-13 (problem dokumenteret 2026-04-13)
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

1. **Gennemgå kladder** — godkend eller afvis kladder i `/admin` (inkl. Laura Ziegler-kladden)
2. **Prioritet: Google News redirect-fix + kilde-rangordning** — se dedikeret afsnit nedenfor
3. **Trigger generate manuelt** igen for at tømme backloggen hurtigere (5 pr. kørsel)
4. **Vurder artikel-kvalitet** — kladder fra kun headline/summary er kortere; overvej om de skal slettes eller redigeres
5. **Cloudflare Browser Rendering** til backfill — ville give `content_raw` for JS-renderede athletics-sider
6. **Billedgenerering** (modul 8 — ikke påbegyndt)
7. **Social media automation** (modul 7 — ikke påbegyndt)

---

## NÆSTE SESSION: Google News redirect-fix + kilde-rangordning

### Problemet

Google News er en aggregator. Dens RSS-feed returnerer URLs der ser sådan ud:
```
https://news.google.com/rss/articles/CBMi...
```
Disse er Googles egne redirect-links, der videresender til den faktiske artikel. Problemet:

1. **Svindel-redirects**: Nogle sider (fx i Laura Ziegler-casen) lader Google News linke til dem, men redirecter besøgende til "du har vundet en million"-sider eller lignende. Source_url i databasen peger på Google News-linket, men den faktiske destination er en svindelside.
2. **Forkert URL i databasen**: Vi gemmer Google News-redirect-URL'en, ikke den rigtige artikel-URL. Kildevisningen i admin og på artikelsiden peger på et Google-link, ikke det originale medie.
3. **Ingen tillids-rangordning**: Alle URL-domæner behandles ens — en artikel fra ESPN og en fra en ukendt blog får samme vægt.

### Løsning

**Trin 1 — Følg redirect til faktisk URL** (`pipeline/discover/check-sources.ts`, `checkGoogleNewsSources`)

For hvert Google News-hit: lav en HEAD-request (eller GET med `redirect: "follow"`) og hent den endelige URL efter alle redirects. Brug denne som `source_url` i databasen i stedet for Google News-linket.

```typescript
async function resolveRedirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": USER_AGENT },
    });
    return res.url; // Endelig URL efter redirects
  } catch {
    return null;
  }
}
```

Hvis `resolveRedirect` returnerer null (timeout, netværksfejl) → afvis historien.

**Trin 2 — Domænerangordning** (ny fil: `pipeline/lib/source-trust.ts`)

Klassificér domæner i tre lag:

| Lag | Eksempler | Handling |
|-----|-----------|----------|
| **Trusted** | ncaa.com, espn.com (kun til trust-tjek, ikke indhold), golfweek.com, swimswam.com, si.com, usatoday.com, collegiateathletics-domæner, .edu | Behold — sæt `relevance_score += 20` |
| **Neutral** | Lokale aviser, ukendte nyhedssites | Behold som nu |
| **Afvis** | Kendte scam-mønstre, pop-up sider, sites uden ordentlig TLD, redirecter til anden URL end den forventede | Marker som `status='rejected'` |

Scam-detektionen kan baseres på:
- Finale URL's domæne er forskelligt fra det domæne Google News antydede i RSS-titlen/summary
- TLD-tjek: afvis `.xyz`, `.click`, `.top`, `.win`, `.loan`, `.gdn` og lignende high-risk TLD'er
- Redirect-kæde er mere end N hop (tegn på cloaking)

**Trin 3 — Gem faktisk URL, ikke Google-link**

I `INSERT INTO stories`, brug den resolved URL som `source_url` (ikke Google News-URL'en). Google News-URL'en kan gemmes i et separat felt hvis ønsket, men er ikke nødvendig.

**Trin 4 — Relevance-score baseret på kilde-lag**

```
school_feed (RSS/HTML)  → relevance_score 80 (fuld match) / 40 (efternavn)
google_news trusted     → relevance_score 70
google_news neutral     → relevance_score 50
google_news afvist      → INSERT OR IGNORE + status='rejected'
```

### Filer der skal ændres

| Fil | Hvad |
|-----|------|
| `pipeline/lib/source-trust.ts` | NY — trusted-domæner, scam-TLD'er, `classifyDomain()`, `resolveRedirect()` |
| `pipeline/discover/check-sources.ts` | `checkGoogleNewsSources`: kald `resolveRedirect()` + `classifyDomain()` per story |
| `pipeline/discover/extract-story.ts` | Ingen ændring nødvendig |

### Hvad det løser

- Laura Ziegler-problemet: redirect til svindelside fanges af enten scam-TLD-tjek eller domain-mismatch-tjek
- Forkerte source_url'er erstattes med de faktiske artikel-URL'er
- Ranglisten giver generate-scriptet bedre sortering (trusted sources genereres først)

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
