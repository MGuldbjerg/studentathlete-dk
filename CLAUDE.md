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

### Æstetisk retning
**Editorial sportsmedie med skandinavisk minimalisme.**
Tænk The Athletic møder Kinfolk — seriøst, rent, typografidrevet.

### Designprincipper
- **Easy on the eye** — bløde kontraster, rigelig whitespace, intet visuelt støj. Øjnene skal hvile, ikke arbejde.
- **Læsbarhed først** — generøs linjeafstand, behagelig spaltebredde (~60-75 tegn), tydelig hierarki mellem overskrift, ingress og brødtekst.
- **Få, velvalgte elementer** — hvert element skal tjene et formål. Hellere én stærk detalje end ti halvhjertede. Fjern alt der ikke aktivt bidrager.
- **Dynamisk følelse gennem subtilitet** — én velplaceret hover-transition, en tynd rød accent-linje, et skifte i typografi-vægt. Dynamik kommer fra kontrast mellem rolige flader og enkelte præcise detaljer, ikke fra mængden af effekter.
- **Gennemtænkte mikrodetaljer** — drop-cap på features, fine border-separatorer, konsistent spacing-rytme, korrekt typografisk hierarki. Detaljerne signalerer kvalitet uden at råbe.
- **Tydelig kildesektion** — hver artikel skal have en visuelt afsat kildehenvisning i bunden. Adskilt fra brødteksten med en klar separator (linje eller spacing), egen typografi (mindre, muted), og struktureret så kilder er nemme at skimme. Kildesektionen er redaktionel troværdighed — den skal være synlig men ikke dominerende.

### Farver (defineret i globals.css `@theme`)
| Token | Hex | Brug |
|-------|-----|------|
| `flag-red` | `#BF0A30` | Accenter, tags, hover, kickers, blockquote-border, drop-cap |
| `flag-blue` | `#00205B` | Header, footer, hero-sections, primær-knapper |
| `ink` | `#111111` | Brødtekst, overskrifter |
| `paper` | `#ffffff` | Baggrund |
| `muted` | `#6B6B6B` | Metadata, sekundær tekst |
| `surface` | `#F7F6F4` | Subtile baggrunde, faktabokse, hover-states |
| `border` | `#E2E0DC` | Delere, grid-linjer |

Brug **kun** disse farver. Ingen lilla, grøn, orange eller andre farver.

### Typografi
| Rolle | Font | CSS-variabel | Brug |
|-------|------|-------------|------|
| Overskrifter | **Playfair Display** (400, 600, 700, 900) | `font-serif` | Alle h1-h6, blockquotes, drop-cap |
| Brødtekst | **Geist** | `font-sans` | Body, knapper, labels, navigation |
| Kode | **Geist Mono** | `font-mono` | Kun hvis nødvendigt |

Brug **aldrig** Inter, Roboto, Poppins, Montserrat eller andre generiske fonts.

### Layout-principper
- Mobile-first responsive: 1 kolonne → 2 (sm:) → 3 (lg:)
- Max bredde for artikeltekst: ~680px
- Generøs whitespace — lad designet ånde
- Ingen generiske gradienter eller boxy card-designs
- Billeders aspect-ratio: 16:9 for hero, 3:2 for cards

### Artikel-templates
| Type | Fil | Karakteristik |
|------|-----|---------------|
| `news` | `NewsTemplate.tsx` | Kompakt, rød "NYHED" kicker |
| `feature` | `FeatureTemplate.tsx` | Fullscreen hero (85vh), drop-cap, lang form |
| `recruiting` | `RecruitingTemplate.tsx` | Rekrutteringsfokus |
| `season_update` | `SeasonUpdateTemplate.tsx` | Sæsonopdatering |

### Komponenter der allerede eksisterer
- `Header.tsx` — mørk blå med rødt top-bar
- `Footer.tsx` — mørk blå med rødt top-bar, 3-kolonne
- `ArticleCard.tsx` — grid-kort med hover-animation
- `Carousel.tsx` — auto-roterende hero med 5 artikler
- `CategoryNav.tsx` — horisontalt sport-filter
- `SearchBar.tsx` — søgefelt med blå knap
- `ArticleBody.tsx` — parser markdown-lignende indhold
- `Breadcrumb.tsx` — med JSON-LD structured data
- `RelatedArticles.tsx` — grid med relaterede artikler
- `AthleteProfilePage.tsx` — atlet-profil med hero og faktaboks
- `SchoolProfilePage.tsx` — skole-profil med atlet-grid

### Hvad der IKKE skal bruges
- Generiske gradienter (linear-gradient med tilfældige farver)
- Afrundede "pill"-knapper med skygger
- Inter, Roboto, Poppins eller andre standard-fonts
- Lilla, orange, grøn eller andre farver uden for paletten
- Overdrevne animationer eller parallax-effekter
- Stock-foto-æstetik eller "startup landing page"-look
- Emojis i UI-tekst

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
