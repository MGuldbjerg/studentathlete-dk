# StudentAthlete.dk — Claude Code-retningslinjer

## Sprog
- Alt brugersynlig tekst (UI, meta, alt-tekst) skal være på **dansk** med æ, ø, å
- Kun stort begyndelsesbogstav i overskrifter (dansk konvention)
- Kodekommentarer og variabelnavne på engelsk

## Tech stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** med `@theme`-blok i `globals.css`
- **Cloudflare Workers** via `@opennextjs/cloudflare`
- **D1 database** (SQLite) — binding `DB`
- Fonts importeret i `layout.tsx` via `next/font/google`

## Designsystem

Se **DESIGN.md** for farver, typografi, komponenter, layout-regler og artikel-templates.

## Sportsgrene (til navigation og kategorisering)
Football, Basketball, Baseball, Soccer, Swimming, Track and Field, Golf, Tennis, Volleyball, Ice Hockey

## Database-tabeller
- `athletes` — atletprofiler
- `schools` — universiteter
- `articles` — artikler med `article_type`, `slug`, `sport`
- `sources` — URL-kilder per atlet/skole
- `stories` — fundne historier (pipeline)
- `pipeline_runs` — pipeline-kørselspor

## Seed-data
Atletdata tilføjes i `pipeline/seed/seed-data.json` og indsættes med `bash scripts/seed.sh`.

## Scripts
| Script | Formål |
|--------|--------|
| `scripts/migrate.sh` | Kør D1 database-migrering |
| `scripts/seed.sh` | Indsæt atletdata fra seed-data.json |
| `npm run dev` | Start lokal dev-server |
| `npm run deploy` | Deploy til Cloudflare |

## Pipeline-scraping: Cloudflare Browser Rendering (VIGTIG)

**Inden du ændrer scraping- eller discovery-logik**, overvej Cloudflare Browser Rendering API:

| Opgave | Brug dette | Hvorfor |
|--------|-----------|---------|
| Crawl skolers nyhedssektioner | **CF /crawl** med `render: false`, `formats: ["markdown"]` | Gratis under beta, følger links automatisk, finder flere historier end enkelt-URL-fetch |
| Roster-sider der returnerer tom HTML | **CF /scrape** med `render: true` | Headless browser renderer JS — løser SPA-problemet |
| Roster-sider med data i HTML | Behold `fetch()` + Cheerio | Gratis og hurtigt |
| Struktureret data-udtræk | **UNDGÅ** CF JSON-format | Bruger Workers AI-tokens — brug markdown + Cheerio i stedet |

**API**: `https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/crawl`
**Token**: Kræver "Browser Rendering - Edit" permission i CF dashboard.
**Gratis plan**: 10 min browser-tid/dag (kun `render: true`). `render: false` er gratis under beta.
**Begrænsninger**: Fast User-Agent (`CloudflareBrowserRenderingCrawler/1.0`), respekterer robots.txt.
**Fuld reference**: `memory/reference-cf-browser-rendering.md`

Relevante filer: `pipeline/scrape/scrape-rosters.ts`, `pipeline/discover/check-sources.ts`, `pipeline/lib/auto-sources.ts`

## Workflow for designændringer
1. Start dev-serveren
2. Lav ændringer i koden
3. Brug Playwright MCP til at tage screenshot og verificere visuelt
4. Justér baseret på hvad du ser
5. Gentag indtil resultatet er rigtigt
