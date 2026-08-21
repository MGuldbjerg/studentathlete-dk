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
**Listen står i koden, ikke her**: `SPORT_KEYS` i `src/lib/sports.ts` (32 sportsgrene
+ `other` pr. 2026-08-20). Denne fil stod med ti sportsgrene længe efter at der var
flere — derfor peger den nu på kilden i stedet for at gentage den.

En ny sportsgren kræver en nøgle ALLE steder: navn og URL-slug i `src/lib/i18n/da.ts`
og `en.ts`, farve/emoji/ikon i `sports.ts`, ikonsti i `CategoryNav.tsx`,
positionskoder i `positions.ts` og pillartekst i `sport-content.ts` +
`sport-content-en.ts`. Typesystemet fejler, hvis én mangler.

## Claude Desktop

Skal Desktop-Claude arbejde på projektet (typisk artikeltekst, strategi, jura),
så byg kontekstpakken og læg den i Desktop under "Projektviden":

    ./scripts/build-desktop-pack.sh     (eller byg-desktop-pakke.bat fra Windows)
    → desktop-pakke/StudentAthlete-til-Claude-Desktop.md

Prosaen redigeres i `desktop-pakke/_brief-skabelon.md`; sportsnøgler, tabeller,
kladdekø og status hentes fra koden og D1, så pakken ikke kan stå og lyve.
Afleveringsformatet tilbage fra Desktop står i pakkens afsnit 8.

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

## SEO: plan først, indhold bestemmer (Mikkels regler, 2026-08-21)

1. **Aldrig SEO-arbejde uden en plan, Mikkel har set og udtrykkeligt godkendt.**
2. Er planen godkendt: små ændringer må laves selvstændigt — **store aldrig**.
3. **Indholdet er rammen.** Giver et nøgleord mening teknisk, men ikke for
   sidens faktiske indhold, så vinder indholdet. Eksemplet er Mikkels egen:
   for **Temple University** peger relaterede søgeord på templer i USA og
   religiøse templer — men siden handler om universitetet, og så er det dét,
   den skal handle om.

**Grænsen mod drift**: tekniske fejl er ikke «SEO-arbejde» og må rettes uden
plan — 404'er, døde sitemaps, forkerte canonicals, manglende hreflang, sprog-
og landelækager. Det er ændringer i TEKST og STRUKTUR med et søgeformål
(titler, meta-beskrivelser, overskrifter, intern linkning, URL-struktur, nye
sider mod et søgeord) der kræver en godkendt plan.

Tallene hentes med `./scripts/search-console.sh` (se `SETUP-search-console.md`).
Fund afleveres som forslag med begrundelse, ikke som en ændring.

## Roster-scraping: spørg skolen, gæt ikke (VIGTIGST)

**Inden du ændrer roster- eller discovery-logik**: holdlisten er DATA, ikke et gæt.

| Opgave | Brug dette | Hvorfor |
|--------|-----------|---------|
| Find skolens hold | `pipeline/scrape/sport-inventory.ts` (årlig) | Sitemap/menu/API giver de RIGTIGE holdnavne — inkl. kvindeholdene og lacrosse/water polo/softball |
| Hold skolen ikke har | `roster_checks.sponsored = 0`, status `not_sponsored` | Det negative register. Spørg aldrig igen; inventaret åbner rækken hvis holdet dukker op |
| Roster på ny Sidearm (Nuxt) | `parsers/roster-api.ts` → `/api/v2/rosters?sportId=N` | 42% af D1. HTML'en er tom for spillere; JSON'en er rigere (køn, forrige skole, årgang i ord) |
| Roster i HTML | `parsers/` som før | Gratis og hurtigt |
| Ny sportsgren fra en skole | `SOURCE_ALIASES` i `src/lib/sports.ts` | Ukendt slug → `other`. Giv ALDRIG en forkert etiket (softball ≠ baseball) |
| Hentning | `robotsAllows()` fra `pipeline/lib/robots.ts` | robots.txt er en betingelse i interesseafvejningen og i DSM art. 4 |

**Fejl er ikke ét begreb**: `not_found`/`robots_denied` er permanente; 429/403/5xx/timeout
er forbigående og SKAL prøves igen (ellers gør ét 429 et hold usynligt for altid).

Se `projekt-status.md` (afsnittet «Scraperen ser nu ALLE hold») for hele diagnosen.

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
