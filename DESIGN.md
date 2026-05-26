# StudentAthlete.dk — Designsystem

## Æstetisk retning
**Editorial sportsmedie med skandinavisk minimalisme.**
Tænk The Athletic møder Kinfolk — seriøst, rent, typografidrevet.

## Designprincipper
- **Easy on the eye** — bløde kontraster, rigelig whitespace, intet visuelt støj. Øjnene skal hvile, ikke arbejde.
- **Læsbarhed først** — generøs linjeafstand, behagelig spaltebredde (~60-75 tegn), tydelig hierarki mellem overskrift, ingress og brødtekst.
- **Få, velvalgte elementer** — hvert element skal tjene et formål. Hellere én stærk detalje end ti halvhjertede. Fjern alt der ikke aktivt bidrager.
- **Dynamisk følelse gennem subtilitet** — én velplaceret hover-transition, en tynd rød accent-linje, et skifte i typografi-vægt. Dynamik kommer fra kontrast mellem rolige flader og enkelte præcise detaljer, ikke fra mængden af effekter.
- **Gennemtænkte mikrodetaljer** — drop-cap på features, fine border-separatorer, konsistent spacing-rytme, korrekt typografisk hierarki. Detaljerne signalerer kvalitet uden at råbe.
- **Tydelig kildesektion** — hver artikel skal have en visuelt afsat kildehenvisning i bunden. Adskilt fra brødteksten med en klar separator (linje eller spacing), egen typografi (mindre, muted), og struktureret så kilder er nemme at skimme. Kildesektionen er redaktionel troværdighed — den skal være synlig men ikke dominerende.

## Farver (defineret i globals.css `@theme`)
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

## Typografi
| Rolle | Font | CSS-variabel | Brug |
|-------|------|-------------|------|
| Overskrifter | **Playfair Display** (400, 600, 700, 900) | `font-serif` | Alle h1-h6, blockquotes, drop-cap |
| Brødtekst | **Geist** | `font-sans` | Body, knapper, labels, navigation |
| Kode | **Geist Mono** | `font-mono` | Kun hvis nødvendigt |

Brug **aldrig** Inter, Roboto, Poppins, Montserrat eller andre generiske fonts.

## Layout-principper
- Mobile-first responsive: 1 kolonne → 2 (sm:) → 3 (lg:)
- Max bredde for artikeltekst: ~680px
- Generøs whitespace — lad designet ånde
- Ingen generiske gradienter eller boxy card-designs
- Billeders aspect-ratio: 16:9 for hero, 3:2 for cards

## Artikel-templates
| Type | Fil | Karakteristik |
|------|-----|---------------|
| `news` | `NewsTemplate.tsx` | Kompakt, rød "NYHED" kicker |
| `feature` | `FeatureTemplate.tsx` | Fullscreen hero (85vh), drop-cap, lang form |
| `recruiting` | `RecruitingTemplate.tsx` | Rekrutteringsfokus |
| `season_update` | `SeasonUpdateTemplate.tsx` | Sæsonopdatering |

## Eksisterende komponenter
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

## Hvad der IKKE skal bruges
- Generiske gradienter (linear-gradient med tilfældige farver)
- Afrundede "pill"-knapper med skygger
- Inter, Roboto, Poppins eller andre standard-fonts
- Lilla, orange, grøn eller andre farver uden for paletten
- Overdrevne animationer eller parallax-effekter
- Stock-foto-æstetik eller "startup landing page"-look
- Emojis i UI-tekst

## Workflow for designændringer
1. Start dev-serveren
2. Lav ændringer i koden
3. Brug Playwright MCP til at tage screenshot og verificere visuelt
4. Justér baseret på hvad du ser
5. Gentag indtil resultatet er rigtigt
