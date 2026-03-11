/**
 * Mock-data til lokal udvikling.
 * Bruges når D1-databasen ikke er tilgængelig (npm run dev uden Cloudflare).
 */

import type { Article, Athlete, School } from "./types";

// ─── Atleter ──────────────────────────────────────────────────────────────────

export const MOCK_ATHLETES: Athlete[] = [
  {
    id: 1,
    name: "Anders Haas",
    slug: "anders-haas",
    sport: "Football",
    position: "Kicker",
    hometown: "Brøndby",
    university: "University of Nebraska",
    university_state: "NE",
    division: "NCAA D1",
    year_enrolled: 2023,
    active: 1,
    photo_url: null,
    profile_summary:
      "Anders Haas er en dansk kicker på University of Nebraskas football-hold, Cornhuskers. Han voksede op i Brøndby og spillede fodbold i Danmark, inden han skiftede til amerikansk football. Haas har udmærket sig som en af Big Tens mest pålidelige kickers med en field goal-procent på over 85 % i sin første sæson.",
    created_at: "2025-08-15T10:00:00Z",
    updated_at: "2026-01-20T14:30:00Z",
  },
  {
    id: 2,
    name: "Sofie Østergaard",
    slug: "sofie-oestergaard",
    sport: "Svømning",
    position: "Freestyle / IM",
    hometown: "Aarhus",
    university: "University of Florida",
    university_state: "FL",
    division: "NCAA D1",
    year_enrolled: 2024,
    active: 1,
    photo_url: null,
    profile_summary:
      "Sofie Østergaard repræsenterer University of Florida Gators i svømning. Hun har specialiseret sig i freestyle og individuel medley og har tidligere svømmet for Aarhus Svømmeklub. Østergaard har allerede sat flere personlige rekorder i sin debutsæson i SEC-konferencen.",
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2026-02-10T09:15:00Z",
  },
  {
    id: 3,
    name: "Mathias Kjeldsen",
    slug: "mathias-kjeldsen",
    sport: "Basketball",
    position: "Guard",
    hometown: "København",
    university: "Gonzaga University",
    university_state: "WA",
    division: "NCAA D1",
    year_enrolled: 2024,
    active: 1,
    photo_url: null,
    profile_summary:
      "Mathias Kjeldsen spiller guard for Gonzaga Bulldogs. Han udviklede sit talent i Københavns Basketball Klub og det danske ungdomslandshold, før han fik tilbudt et fuldt stipendium til West Coast Conference-holdet. Kjeldsen er kendt for sin boldhåndtering og evne til at organisere spillet.",
    created_at: "2025-09-10T12:00:00Z",
    updated_at: "2026-02-15T11:00:00Z",
  },
  {
    id: 4,
    name: "Freja Nielsen",
    slug: "freja-nielsen",
    sport: "Fodbold",
    position: "Midtbane",
    hometown: "Odense",
    university: "Duke University",
    university_state: "NC",
    division: "NCAA D1",
    year_enrolled: 2023,
    active: 1,
    photo_url: null,
    profile_summary:
      "Freja Nielsen spiller midtbane for Duke Blue Devils i ACC-konferencen. Hun har tidligere spillet for OB's kvindehold i Danmark og har repræsenteret det danske U21-landshold. Nielsen er en teknisk stærk spiller med et godt overblik og præcise afleveringer.",
    created_at: "2025-07-20T09:00:00Z",
    updated_at: "2026-01-05T16:45:00Z",
  },
  {
    id: 5,
    name: "Oliver Sørensen",
    slug: "oliver-soerensen",
    sport: "Tennis",
    position: null,
    hometown: "Helsingør",
    university: "University of San Diego",
    university_state: "CA",
    division: "NCAA D1",
    year_enrolled: 2024,
    active: 1,
    photo_url: null,
    profile_summary:
      "Oliver Sørensen spiller tennis for University of San Diego Toreros. Han voksede op i Helsingør og spillede på eliteniveau i dansk tennis, inden han flyttede til Californien. Sørensen spiller typisk som nr. 2 eller 3 single og har bidraget til holdets stærke WCC-sæson.",
    created_at: "2025-08-25T14:00:00Z",
    updated_at: "2026-02-01T10:30:00Z",
  },
];

// ─── Skoler ───────────────────────────────────────────────────────────────────

export const MOCK_SCHOOLS: School[] = [
  {
    id: 1,
    name: "University of Nebraska",
    slug: "university-of-nebraska",
    state: "NE",
    division: "NCAA D1",
    conference: "Big Ten",
    website: "https://huskers.com",
  },
  {
    id: 2,
    name: "University of Florida",
    slug: "university-of-florida",
    state: "FL",
    division: "NCAA D1",
    conference: "SEC",
    website: "https://floridagators.com",
  },
  {
    id: 3,
    name: "Gonzaga University",
    slug: "gonzaga-university",
    state: "WA",
    division: "NCAA D1",
    conference: "West Coast",
    website: "https://gozags.com",
  },
  {
    id: 4,
    name: "Duke University",
    slug: "duke-university",
    state: "NC",
    division: "NCAA D1",
    conference: "ACC",
    website: "https://goduke.com",
  },
  {
    id: 5,
    name: "University of San Diego",
    slug: "university-of-san-diego",
    state: "CA",
    division: "NCAA D1",
    conference: "West Coast",
    website: "https://usdtoreros.com",
  },
];

// ─── Artikler ─────────────────────────────────────────────────────────────────

export const MOCK_ARTICLES: Article[] = [
  // ── 1. NEWS: Anders Haas ──────────────────────────────────────────────────
  {
    id: 1,
    title: "Anders Haas sparkede afgørende field goal i Nebraskas sejr",
    slug: "anders-haas-sparkede-afgoerende-field-goal-i-nebraskas-sejr",
    summary:
      "Den danske kicker sikrede Nebraska en dramatisk 24-21-sejr over Iowa med et field goal i de døende sekunder.",
    content: `Det var et øjeblik, Anders Haas aldrig kommer til at glemme. Med bare syv sekunder tilbage på uret i Memorial Stadium trådte den danske kicker op til et 47-yard field goal, der ville afgøre kampen mod ærkerivalerne fra Iowa.

Bolden sejlede gennem stængerne med god margin, og 85.000 tilskuere eksploderede i jubel. Nebraska vandt 24-21, og Haas blev båret fra banen af sine holdkammerater.

> Det er det smukkeste øjeblik i mit liv. At høre hele stadion råbe dit navn — det er surrealistisk.

## Vejen til øjeblikket

Haas, der voksede op i Brøndby og spillede fodbold som barn, opdagede amerikansk football som 16-årig. Han begyndte at sparke field goals i baghaven, og talentfulde videoer på sociale medier fangede opmærksomheden hos amerikanske scouts.

I 2023 landede han et stipendium til University of Nebraska, og han har siden udviklet sig til en af Big Tens mest pålidelige kickers.

## Statistik for sæsonen

Haas har i denne sæson ramt 18 af 21 field goal-forsøg — en succesrate på 85,7 procent. Hans længste field goal var på 52 yards mod Wisconsin tidligere på sæsonen.

Cheftræner Matt Rhule var fuld af ros efter kampen: "Anders er iskold under pres. Han har den der skandinaviske ro, som bare smitter af på hele holdet."

Nebraska ligger nu nummer to i Big Ten West med en samlet rekord på 8-2, og Haas' spark kan vise sig at være afgørende for holdets slutspilshåb.`,
    article_type: "news",
    published: 1,
    published_at: "2026-02-15T19:30:00Z",
    created_at: "2026-02-15T18:00:00Z",
    updated_at: "2026-02-15T19:30:00Z",
    athlete_id: 1,
    cover_image_url: null,
    author: "StudentAthlete.dk",
    athlete_name: "Anders Haas",
    athlete_slug: "anders-haas",
    sport: "Football",
  },

  // ── 2. NEWS: Sofie Østergaard ─────────────────────────────────────────────
  {
    id: 2,
    title: "Sofie Østergaard slog personlig rekord ved SEC Championships",
    slug: "sofie-oestergaard-slog-personlig-rekord-ved-sec-championships",
    summary:
      "Den danske svømmer forbedrede sin tid i 200m freestyle med næsten et helt sekund ved konferencemesterskaberne.",
    content: `Sofie Østergaard leverede sin bedste præstation nogensinde, da SEC Championships blev afholdt i Gainesville i weekenden. Den danske svømmer svømmede 200 meter freestyle på 1:46.82 og slog dermed sin personlige rekord med 0,94 sekunder.

Tiden rakte til en sjetteplads i finalen, og Østergaard var tydeligt bevæget efter løbet.

> Jeg har trænet så hårdt for det her. At slå min PR ved det største stævne i sæsonen — det viser, at arbejdet betaler sig.

## Tilpasning til amerikansk svømmekultur

Østergaard, der flyttede fra Aarhus til Gainesville i sommeren 2024, har haft en stejl læringskurve. Træningskulturen i NCAA er markant anderledes end i Danmark, med dobbelte daglige træninger og et stærkt fokus på styrketræning.

"I Danmark trænede jeg måske 15 timer om ugen. Her er det nærmere 25, og styrketræningen er på et helt andet niveau," forklarer hun.

## Næste mål

Østergaards næste mål er at kvalificere sig til NCAA Championships i marts, hvor hun skal under 1:46.00 for at sikre sig en plads. Med den nuværende formkurve ser det lovende ud.

Floridas cheftræner Anthony Nesty kaldte Østergaards udvikling "exceptionel" og fremhævede hendes arbejdsmoral som et forbillede for resten af holdet.`,
    article_type: "news",
    published: 1,
    published_at: "2026-02-22T14:00:00Z",
    created_at: "2026-02-22T12:00:00Z",
    updated_at: "2026-02-22T14:00:00Z",
    athlete_id: 2,
    cover_image_url: null,
    author: "StudentAthlete.dk",
    athlete_name: "Sofie Østergaard",
    athlete_slug: "sofie-oestergaard",
    sport: "Svømning",
  },

  // ── 3. FEATURE: Anders Haas ───────────────────────────────────────────────
  {
    id: 3,
    title: "Fra Brøndby til Big Ten: Anders Haas' utrolige rejse",
    slug: "fra-broendby-til-big-ten-anders-haas-utrolige-rejse",
    summary:
      "Historien om den danske dreng, der droppede fodbolden og blev en af college footballs mest lovende kickers.",
    content: `Det er en grå novemberdag i Brøndby, og Anders Haas sidder i sin barndomslejlighed og ser på gamle videokip fra sin tid som ungdomsspiller i Brøndby IF. Han griner lidt ad sig selv — dengang var drømmen at spille i Superligaen.

I dag spiller han for et af de mest ikoniske football-programmer i USA, foran 85.000 tilskuere hver lørdag. Det er en rejse, selv han har svært ved at forstå.

## Drengen fra Brøndby

Anders voksede op i en blok ved Brøndby Strand med sin mor og lillebror. Fodbold var alt. Han spillede for Brøndby IF's ungdomshold og drømte om at følge i fodsporene på Daniel Agger og Nicklas Bendtner.

Men som 15-årig begyndte tvivlen at melde sig. "Jeg var god, men ikke god nok til at komme på førsteholdet," erkender han. "Der var 30 andre drenge, der var mindst lige så gode som mig."

## En tilfældig YouTube-video

Det ændrede sig en aften i 2020, da Anders sad og scrollede på YouTube. Han faldt over en video af Justin Tucker, Baltimore Ravens' legendariske kicker, og blev fascineret.

"Jeg tænkte: det er jo bare at sparke til en bold. Det kan jeg."

Han begyndte at øve sig på en græsmark ved Brøndby Strand. Først med en almindelig fodbold, senere med en amerikansk football, som hans mor bestilte fra Amazon. Inden for et halvt år kunne han konsistent ramme field goals fra 40 yards.

> Den første gang bolden gik mellem stængerne fra 45 yards — der vidste jeg, at det her var min vej.

## Vejen til Nebraska

Anders begyndte at lægge videoer op på sociale medier og kontaktede amerikanske trænere via e-mail. Han fik hjælp fra en dansk rekrutteringsagent, der specialiserede sig i at placere europæiske atleter på amerikanske universiteter.

I foråret 2023 modtog han et tilbud fra University of Nebraska — et fuldt atletisk stipendium, der dækkede undervisning, bolig og kost. Værdien: cirka 250.000 kroner om året.

### De første måneder i Lincoln

At flytte til Lincoln, Nebraska var et kulturchok. "Alt er stort i USA," siger Haas med et grin. "Stadion, bilerne, portionerne på restauranterne. Og alle taler om football hele tiden."

Men det var på banen, det virkelig betød noget. Haas imponerede fra dag ét med sin stærke sparketeknik og iskoldhed under pres.

## Fremtiden

Anders Haas har tre år tilbage på sit stipendium og drømmer om NFL. "Det er et langt skud," siger han realistisk. "Men det var det også at komme hertil. Og se, hvor jeg er nu."

Historien om drengen fra Brøndby, der bytted fodboldstøvler med football-cleats, er endnu ikke færdig. Men den er allerede bemærkelsesværdig.`,
    article_type: "feature",
    published: 1,
    published_at: "2026-01-10T08:00:00Z",
    created_at: "2026-01-09T20:00:00Z",
    updated_at: "2026-01-10T08:00:00Z",
    athlete_id: 1,
    cover_image_url: null,
    author: "Mikkel Guldbjerg",
    athlete_name: "Anders Haas",
    athlete_slug: "anders-haas",
    sport: "Football",
  },

  // ── 4. FEATURE: Freja Nielsen ─────────────────────────────────────────────
  {
    id: 4,
    title: "Drømmen om NCAA: Freja Nielsens rejse fra Odense til Duke",
    slug: "droemmen-om-ncaa-freja-nielsens-rejse-fra-odense-til-duke",
    summary:
      "Freja Nielsen forlod OB og Danmark for at spille college-fodbold i USA. Her er historien om hendes vej til ACC-konferencen.",
    content: `Freja Nielsen sad i sin lejlighed i Durham, North Carolina og kiggede ud over Duke Universitys campus. Bladene på de gamle egetræer var skiftet til guld og rødt, og hun mærkede den velkendte følelse af at være langt hjemmefra — men også af at være præcis, hvor hun skulle være.

"Jeg vidste, at det ville blive svært," siger hun. "Men jeg vidste også, at det var den rigtige beslutning."

## Rødder i OB

Freja begyndte at spille fodbold som femårig i en lille klub i Odense. Talentet var tydeligt fra starten, og som 12-årig blev hun optaget på OB's kvindeafdeling. Her udviklede hun sig til en teknisk stærk midtbanespiller med et usædvanligt godt overblik.

Hun repræsenterede Danmark ved U17- og U19-EM og tiltrak sig opmærksomhed fra udenlandske klubber. Men det var en anden vej, der lokkede.

## Rekrutteringsprocessen

"Jeg havde en veninde, der spillede college-fodbold i Texas," fortæller Freja. "Hun fortalte mig om stipendierne, studierne og hele oplevelsen. Jeg blev nysgerrig."

Freja begyndte at sende highlight-videoer til amerikanske universiteter i foråret 2022. Duke University var blandt de første til at svare, og efter et virtuelt besøg og flere samtaler tilbød de hende et fuldt stipendium.

### At balancere sport og studier

I modsætning til professionel fodbold i Europa kræver NCAA-systemet, at atleterne også er studerende. Freja læser statskundskab og har formået at holde et gennemsnit på 3,7 — trods de 20+ timer om ugen, hun bruger på træning og kampe.

"Det er hårdt, men det er også det, der gør det unikt," siger hun. "I Danmark ville jeg bare spille fodbold. Her får jeg en uddannelse oven i købet."

## Livet i ACC

ACC-konferencen er en af de stærkeste i kvindernes college-fodbold. Duke spiller mod hold som North Carolina, Virginia og Florida State — hold med spillere, der har været til VM og OL.

> Niveauet er sindssygt. Hver kamp er som en landskamp. Det har gjort mig til en bedre spiller.

Freja har i denne sæson startet inde i alle kampe og bidraget med fire mål og syv assists. Hendes evne til at diktere spillet fra midtbanen har gjort hende til en nøglespiller på holdet.

## Hvad kommer efter?

Freja har endnu et år tilbage på sit stipendium og overvejer sine muligheder. Professionel fodbold i USA (NWSL) eller en retur til Europa er begge i spil.

"Lige nu fokuserer jeg på sæsonen og mine studier. Men uanset hvad der sker, har denne oplevelse ændret mit liv."`,
    article_type: "feature",
    published: 1,
    published_at: "2026-02-01T10:00:00Z",
    created_at: "2026-01-31T22:00:00Z",
    updated_at: "2026-02-01T10:00:00Z",
    athlete_id: 4,
    cover_image_url: null,
    author: "StudentAthlete.dk",
    athlete_name: "Freja Nielsen",
    athlete_slug: "freja-nielsen",
    sport: "Fodbold",
  },

  // ── 5. RECRUITING: Mathias Kjeldsen ───────────────────────────────────────
  {
    id: 5,
    title: "Ny dansk guard på vej til Gonzaga",
    slug: "ny-dansk-guard-paa-vej-til-gonzaga",
    summary:
      "Mathias Kjeldsen fra København har underskrevet med Gonzaga University og bliver den første dansker på holdets basketball-program.",
    content: `Gonzaga University har officielt annonceret, at den danske guard Mathias Kjeldsen tilslutter sig Bulldogs' basketball-program fra sæsonen 2024-25. Kjeldsen bliver dermed den første danske spiller i programmets historie.

Den 19-årige Kjeldsen har spillet for Københavns Basketball Klub og repræsenteret Danmark på ungdomslandsholdene. Han er 191 cm høj og spiller primært som point guard.

## Scouting-rapport

Gonzagas cheftræner Mark Few beskriver Kjeldsen som en "europæisk playmaker med exceptionelt spilleoverblik."

"Mathias har den der europæiske basketball-IQ, som vi elsker," sagde Few i en pressemeddelelse. "Han ser banen utroligt godt, og hans evne til at organisere angrebsspillet er imponerende for en spiller på hans alder."

> Gonzaga er et af de bedste basketball-programmer i USA. Det er en ære at blive en del af holdet.

## Kjeldsens baggrund

Kjeldsen begyndte at spille basketball som niårig i en lille hal i Valby. Han steg hurtigt gennem rækkerne og var som 16-årig fast mand på det danske U18-landshold.

Det var ved en international turnering i Litauen, at Gonzagas europæiske scout først bemærkede ham. "Han styrede spillet fuldstændigt," husker scouten. "Vi vidste med det samme, at han havde potentialet til at spille på dette niveau."

## Hvad det betyder for dansk basketball

Kjeldsen er en af kun en håndfuld danske basketballspillere, der har fået et NCAA D1-stipendium. Hans succes kan åbne døre for andre unge danske spillere, der drømmer om at spille college-basketball i USA.

"Jeg håber, at min historie kan inspirere andre danske spillere," siger Kjeldsen. "Der er et kæmpe potentiale i Danmark, og vejen til USA er mere tilgængelig, end de fleste tror."`,
    article_type: "recruiting",
    published: 1,
    published_at: "2026-01-25T12:00:00Z",
    created_at: "2026-01-25T10:00:00Z",
    updated_at: "2026-01-25T12:00:00Z",
    athlete_id: 3,
    cover_image_url: null,
    author: "StudentAthlete.dk",
    athlete_name: "Mathias Kjeldsen",
    athlete_slug: "mathias-kjeldsen",
    sport: "Basketball",
  },

  // ── 6. RECRUITING: Oliver Sørensen ────────────────────────────────────────
  {
    id: 6,
    title: "Oliver Sørensen skifter til University of San Diego",
    slug: "oliver-soerensen-skifter-til-university-of-san-diego",
    summary:
      "Dansk tennisspiller har underskrevet med USD Toreros og rykker til Californien for at spille NCAA D1-tennis.",
    content: `Oliver Sørensen fra Helsingør har underskrevet med University of San Diego og vil fra efteråret 2024 repræsentere Toreros i NCAA Division I-tennis.

Sørensen, der er 20 år gammel, har de seneste to år spillet på højeste niveau i dansk tennis og er rangeret som nummer 8 i Danmark i aldersgruppen U21.

## Californisk drøm

For Sørensen har drømmen om at spille i USA altid været til stede. "Jeg har set op til spillere som John Isner og Sam Querrey, der startede deres karriere i college-systemet," fortæller han. "Det er en fantastisk måde at udvikle sig som spiller og samtidig få en uddannelse."

University of San Diego har et stærkt tennisprogram i West Coast Conference og har de seneste år rekrutteret flere internationale spillere.

### Rekrutteringsprocessen

Sørensen fik kontakt til USD's træner gennem et internationalt showcaseevent i Barcelona, hvor han spillede sig til semifinalen. "Træneren kunne lide min spillestil — aggressiv grundlinjespiller med et stærkt serve," siger han.

## Planen fremad

Sørensen forventer at spille som nummer 2 eller 3 i single-rangordningen og vil også bidrage i double. Han planlægger at læse økonomi ved siden af tennissen.

> At bo i San Diego og spille tennis hver dag — det lyder næsten for godt til at være sandt. Men det er virkelighed nu.

USD's cheftræner udtrykte begejstring over tilgangen: "Oliver bringer en intensitet og kampgejst, som vi har brug for. Hans europæiske grus-baggrund giver ham et unikt spil, der vil fungere godt på vores hardcourt-baner."`,
    article_type: "recruiting",
    published: 1,
    published_at: "2026-02-05T09:00:00Z",
    created_at: "2026-02-05T08:00:00Z",
    updated_at: "2026-02-05T09:00:00Z",
    athlete_id: 5,
    cover_image_url: null,
    author: "StudentAthlete.dk",
    athlete_name: "Oliver Sørensen",
    athlete_slug: "oliver-soerensen",
    sport: "Tennis",
  },

  // ── 7. SEASON_UPDATE: Sofie Østergaard / Svømning ─────────────────────────
  {
    id: 7,
    title: "Sæsonstart 2025-26: Danske svømmere gør sig bemærket i NCAA",
    slug: "saesonstart-2025-26-danske-swoemmere-goer-sig-bemaerket-i-ncaa",
    summary:
      "Flere danske svømmere har fået en stærk start på NCAA-sæsonen. Vi giver overblik over de bedste præstationer.",
    content: `NCAA-svømmesæsonen 2025-26 er godt i gang, og de danske svømmere gør sig allerede bemærket på tværs af konferencerne. Her er et overblik over, hvordan det går for de danske atleter i poolen.

## Sofie Østergaard — University of Florida

Østergaard har haft en imponerende start på sin anden sæson hos Gators. Hun har forbedret sine personlige rekorder i både 200m freestyle (1:47.76) og 200m IM (2:01.33). Ved Florida Invitational i november svømmede hun en tid, der placerede hende blandt de 30 bedste i hele NCAA i 200m freestyle.

## Andre danske svømmere

Ud over Østergaard er der flere danske svømmere, der gør det godt i denne sæson:

### Mænd

De danske mandlige svømmere har også gjort sig bemærket. Flere har kvalificeret sig til deres respektive konferencemesterskaber, og niveauet bland de danske svømmere i NCAA er generelt stigende.

### Kvinder

På kvindesiden er det særligt Østergaard, der har tiltrukket sig opmærksomhed, men der er tegn på, at flere danske kvindelige svømmere er på vej mod det amerikanske universitetssystem.

## Konferencemesterskaberne

De store konferencemesterskaber finder sted i februar og marts. SEC Championships, hvor Østergaard deltager, afholdes i Gainesville — på hjemmebane for Florida. Det kan give den danske svømmer en ekstra fordel.

> Det bliver spændende at følge de danske svømmere resten af sæsonen. Niveauet stiger år for år, og vi forventer flere gennembrud.

NCAA Championships afholdes i midten af marts i Indianapolis, og flere danske svømmere har realistiske chancer for at kvalificere sig.`,
    article_type: "season_update",
    published: 1,
    published_at: "2025-12-01T07:00:00Z",
    created_at: "2025-11-30T20:00:00Z",
    updated_at: "2025-12-01T07:00:00Z",
    athlete_id: 2,
    cover_image_url: null,
    author: "StudentAthlete.dk",
    athlete_name: "Sofie Østergaard",
    athlete_slug: "sofie-oestergaard",
    sport: "Svømning",
  },

  // ── 8. SEASON_UPDATE: Generel ─────────────────────────────────────────────
  {
    id: 8,
    title: "Foråret 2026: Status på danske atleter i NCAA",
    slug: "foraaret-2026-status-paa-danske-atleter-i-ncaa",
    summary:
      "En samlet oversigt over, hvordan det går for de danske student athletes i forårssæsonen 2026.",
    content: `Forårssæsonen 2026 er i fuld gang i NCAA, og de danske atleter leverer på tværs af sportsgrene. Her samler vi op på de vigtigste præstationer og nyheder.

## Football

Forårssæsonen i college football er primært præget af spring practice og forberedelse til næste års sæson. Anders Haas ved University of Nebraska har deltaget i Cornhuskers' forårstræning og forventes at være startende kicker igen til efteråret.

## Svømning

NCAA Swimming & Diving Championships finder sted i marts, og Sofie Østergaard fra University of Florida er blandt favoritterne til at repræsentere SEC-konferencen. Hendes seneste tider placerer hende i top 30 nationalt.

## Basketball

Mathias Kjeldsen har fået en lovende start hos Gonzaga Bulldogs. Den danske guard har i sin debutsæson vist glimt af sit talent med flere stærke præstationer fra bænken. West Coast Conference-turneringen i marts bliver en vigtig test.

## Fodbold

Freja Nielsen og Duke Blue Devils har haft en stærk efterårssæson i ACC. Forårets træning er i gang, og Nielsen forventes at have en endnu større rolle i sit seniorår.

## Tennis

Oliver Sørensen har tilpasset sig godt til livet ved University of San Diego. Han har vundet seks af sine første otte singlkampe og har etableret sig som en vigtig del af Toreros' lineup.

## Samlet billede

Antallet af danske atleter i NCAA er stigende, og kvaliteten følger med. Fra football til svømning til tennis bidrager danske atleter på højeste niveau i amerikansk college-sport.

> Foråret 2026 tegner lovende for dansk college-sport. Følg med på StudentAthlete.dk for de seneste opdateringer.`,
    article_type: "season_update",
    published: 1,
    published_at: "2026-03-01T08:00:00Z",
    created_at: "2026-02-28T22:00:00Z",
    updated_at: "2026-03-01T08:00:00Z",
    athlete_id: null,
    cover_image_url: null,
    author: "StudentAthlete.dk",
    athlete_name: null,
    athlete_slug: null,
    sport: null,
  },
];
