/**
 * Statisk indhold til sport-landingssider (/{sport}/).
 * Intro vises i hero-banneret, pillar er evergreen SEO-tekst i bunden.
 */

export interface SportContent {
  /** Visningsnavn */
  title: string;
  /** 1-2 sætninger til hero-banneret */
  intro: string;
  /** SEO meta-description */
  metaDescription: string;
  /** Evergreen pillar-tekst (markdown). Placeres i bunden af siden. */
  pillar: string;
}

export const SPORT_CONTENT: Record<string, SportContent> = {
  football: {
    title: "Football",
    intro:
      "Danske kickers, punters og wide receivers på NCAA-hold i hele USA. Følg deres kampe, resultater og vejen fra Danmark til college football.",
    metaDescription:
      "Danske football-atleter i NCAA – nyheder, profiler og resultater fra college football i USA.",
    pillar: `## Dansk football i NCAA

Amerikansk football er den sportsgren, der har åbnet flest døre for danske atleter i USA. Særligt kicker- og punter-positionen er blevet en dansk specialitet — det kræver præcision og is i maven, og den danske fodboldtradition giver et solidt fundament for sparketeknik. En dansk fodboldopvækst lærer benet at ramme bolden rent, og det er præcis den evne, college-trænere mangler.

### Sæsonens gang

College football-sæsonen er kort og intens. Den regulære sæson løber fra slutningen af august til slutningen af november med typisk 12 kampe — næsten altid spillet om lørdagen, hvor college football ejer dagen (NFL spiller om søndagen). Først i december afgøres conference-mesterskaberne, og derefter følger bowl-kampe og College Football Playoff, der siden 2024 har 12 hold og slutter med et nationalt mesterskab i januar. Foråret bruges til styrketræning og "spring practice", hvor holdet bygges op til næste sæson.

### Sådan fungerer college-systemet

Frem til 2025 måtte et Division I-hold (FBS) give 85 fulde football-stipendier, men efter det store "House"-forlig i 2025 er der i stedet indført et samlet trupsloft på 105 spillere, hvor alle i princippet kan modtage stipendium. Den klassiske "walk-on" uden stipendium er dermed på vej ud — ingen er formelt forbudt, men hver plads tæller nu mod loftet. Hertil er selve spilleberettigelsen lagt om: den gamle "fire sæsoner inden for fem år" og redshirt-ordningen erstattes gradvist af en aldersbaseret model (op til fem års eligibility). Læs mere i [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Tidbits

Morten Andersen — "The Great Dane" — er den mest berømte dansker i amerikansk football og sidder i Pro Football Hall of Fame som NFL's mest scorende spiller gennem tiderne; han kom selv gennem college som All-American kicker på Michigan State. En nyere profil er Hjalte Froholdt, der gik fra Danmark via University of Arkansas til NFL som offensive lineman. Stemningen er enorm: Michigans stadion "The Big House" rummer over 107.000 tilskuere, flere end nogen by mellem København og Aarhus. Den store rekrutteringsdag, "National Signing Day" i februar, følges som en helligdag af amerikanske fans.

### Kilder

- [NCAA.org — DI Board vedtager nye trup-lofter (House-forliget)](https://www.ncaa.org/news/2025/6/23/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits.aspx)
- [CBS Sports — NCAA fjerner stipendielofter, indfører trup-lofter](https://www.cbssports.com/college-football/news/ncaa-removes-scholarship-limits-aligns-with-house-settlement-as-roster-sizes-evolve-in-new-college-sports-era/)
- [SI — College Football Playoff forbliver 12 hold i 2026](https://www.si.com/college-football/playoffs/cfp-makes-decision-expansion-2026)`,
  },

  basketball: {
    title: "Basketball",
    intro:
      "Danske basketballspillere på amerikanske universiteter. Fra danske klubber til NCAA-parkettet — følg deres udvikling og resultater.",
    metaDescription:
      "Danske basketball-atleter i NCAA – nyheder, profiler og resultater fra college basketball i USA.",
    pillar: `## Dansk basketball i NCAA

Basketball har i de seneste år set en stigende interesse fra danske atleter, der drømmer om at spille på højt niveau i USA. Den danske liga giver et godt fundament, og flere spillere har gjort springet til NCAA Division I og II.

### Sæsonens gang

NCAA basketball-sæsonen begynder i november og kulminerer med March Madness — det legendariske slutspil i marts og april. Holdene spiller typisk 30-35 kampe i den regulære sæson, fordelt på ikke-conference-kampe i efteråret og et tæt conference-program hen over vinteren. Conference-turneringerne i starten af marts afgør de sidste billetter til det store slutspil.

### Sådan fungerer March Madness

Slutspillet er en knockout-turnering, der spilles i én lang weekend-rytme over tre uger: taber man én kamp, er man ude. Holdene seedes 1 til 16 i fire regioner, og hvert år overrasker en lavtseedet "Cinderella"-skole ved at slå favoritterne. Faserne hedder Sweet Sixteen, Elite Eight og Final Four, og det hele afsluttes med en finale, der ses af titusinder af danskere på trods af tidsforskellen. Feltet har været på 68 hold, men NCAA besluttede i 2026 at udvide både herrernes og kvindernes turnering til 76 hold fra sæsonen 2026-27.

### Tidbits

College basketball har en helt anden stemning end de professionelle ligaer: studenter-sektioner, der står op hele kampen, marchorkestre og rivaliseringer, der går generationer tilbage. Turneringen er så uforudsigelig, at den årlige "bracket"-konkurrence — hvor man forsøger at gætte alle resultater — aldrig i historien er blevet ramt perfekt. Danske spillere roses ofte for deres alsidighed, holdspilsmentalitet og taktiske forståelse, som amerikanske trænere vurderer højt. To danske college-pionerer rager op: Christian Drejer spillede for Florida Gators og blev i 2004 den første dansker nogensinde, der blev draftet til NBA, mens Inge Nissen vandt to nationale mesterskaber med Old Dominion omkring 1980 og siden er optaget i Women's Basketball Hall of Fame.

### Kilder

- [NCAA.org — Turneringerne udvides til 76 hold](https://www.ncaa.org/sports/2026/5/7/ncaa-basketball-tournaments-expanding-to-76-teams-what-to-know.aspx)
- [NCAA.com — Sådan fungerer den udvidede 2027-turnering](https://www.ncaa.com/news/basketball-men/article/2026-05-07/how-2027-expanded-ncaa-tournament-and-march-madness-brackets-will-work)`,
  },

  baseball: {
    title: "Baseball",
    intro:
      "Danske baseball-spillere i NCAA. Følg danskerne, der har taget springet fra dansk baseball til amerikanske college-hold.",
    metaDescription:
      "Danske baseball-atleter i NCAA – nyheder, profiler og resultater fra college baseball i USA.",
    pillar: `## Dansk baseball i NCAA

Baseball er en nichesport i Danmark, men det lille danske baseballmiljø har alligevel produceret atleter, der kan konkurrere på NCAA-niveau. Den voksende interesse for sporten har åbnet døre for danske talenter.

### Sæsonens gang

College baseball-sæsonen løber fra midten af februar til juni — et af de mest intense programmer i NCAA med op til 56 kampe i den regulære sæson. Holdene spiller ofte tre kampe på en weekend mod samme modstander (en "series"), så pitching-staben skal være dyb. Sæsonen kulminerer med et regionalt slutspil og til sidst College World Series i Omaha, Nebraska, hvor de otte bedste hold mødes foran fyldte tribuner.

### Sådan adskiller det sig fra profferne

College baseball spilles med aluminiums- og kompositbat (BBCOR-godkendte) i stedet for de træbat, der bruges i professionel baseball. Det giver sportens helt egen lyd — et skarpt "ping" i stedet for et "knæk" — og lidt mere kraft, hvilket gør college-kampene højtscorende og hurtige.

### Tidbits

Baseball var historisk en såkaldt "equivalency sport": et hold delte et begrænset antal stipendier (11,7 i Division I) ud over en stor trup, så fuldt stipendium var sjældent. Det ændrede House-forliget i 2025: de sportsspecifikke stipendielofter er afskaffet og erstattet af et trupsloft på 34 spillere i D-I, hvor alle på truppen i princippet kan få fuldt stipendium. Mange spillere bliver draftet til den professionelle MLB direkte fra college. Softball og baseball er voksende sportsgrene i Danmark, og med flere unge, der tager sporten op, kan vi forvente at se flere danskere på amerikanske college-hold i de kommende år.

### Kilder

- [NCAA.org — DI Board vedtager nye trup-lofter (House-forliget)](https://www.ncaa.org/news/2025/6/23/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits.aspx)
- [NCSA — Nye NCAA-stipendie- og trup-lofter for 2025-26](https://www.ncsasports.org/blog/ncaa-scholarship-roster-limits-2024)`,
  },

  fodbold: {
    title: "Fodbold",
    intro:
      "Danske fodboldspillere på NCAA-hold. Fodbold (soccer) er en af de mest populære sportsgrene for danske atleter i USA.",
    metaDescription:
      "Danske fodboldspillere (soccer) i NCAA – nyheder, profiler og resultater fra college soccer i USA.",
    pillar: `## Dansk fodbold i NCAA (soccer)

Fodbold — eller soccer, som det hedder i USA — er en af de mest populære veje for danske atleter til amerikanske universiteter. Med et af verdens stærkeste ungdomssystemer har danske fodboldspillere et naturligt forspring.

### Sæsonens gang

NCAA soccer-sæsonen er kort og intens: kvinder og herrer spiller begge i efteråret, fra august til november, med omkring 18-20 kampe presset sammen på få måneder. Det betyder ofte to kampe om ugen og stor belastning på kroppen. NCAA-slutspillet (hvor finalestævnet kaldes College Cup) har 48 hold hos herrerne og 64 hold hos kvinderne og afgøres i begyndelsen af december. Foråret bruges til individuel udvikling, styrketræning og uofficielle forårsturneringer.

### Sådan adskiller reglerne sig

College soccer har sine egne særregler, der overrasker europæere. På de fleste niveauer — kvindefodbold og de lavere divisioner — må en spiller, der er skiftet ud, komme ind igen senere i kampen, og der skiftes generelt langt mere end i europæisk fodbold, hvilket gør spillet hurtigere og mere fysisk (herrernes Division I afskaffede dog gen-indskiftning i 2024 for at ligne FIFA-reglerne mere). Uafgjorte kampe i den regulære sæson kan ende med kort forlænget spilletid, og i slutspillet afgøres det hele til sidst på straffespark.

### Tidbits

Kvindefodbold er enormt i USA og i mange år bygget op netop omkring college-systemet — flere stjerner fra det amerikanske VM-vindende landshold er gået vejen gennem NCAA. Den danske fodboldtradition med fokus på boldbehandling, positionsspil og taktisk disciplin passer godt til college soccer, og mange danske spillere opnår startpladser fra dag ét. Fodbold er faktisk den sportsgren, der sender flest danskere til NCAA — på tværs af herre- og kvindehold ligger danske spillere på rosters fra Division I til Division III over hele USA, selvom de største danske fodboldtalenter typisk går den professionelle vej herhjemme i stedet for over Atlanten.

### Kilder

- [NCAA.org — Ændrede substitutionsregler i DI herrefodbold (2024)](https://www.ncaa.org/news/2024/4/18/media-center-substitution-rules-changes-approved-for-di-mens-soccer.aspx)
- [NCAA.com — Vejen til College Cup (herrer)](https://www.ncaa.com/championships/soccer-men/d1/road-to-the-championship)`,
  },

  svoemning: {
    title: "Svømning",
    intro:
      "Danske svømmere på NCAA-hold i USA. Fra danske svømmeklubber til college pools — følg de danske talenter.",
    metaDescription:
      "Danske svømmere i NCAA – nyheder, profiler og resultater fra college-svømning i USA.",
    pillar: `## Dansk svømning i NCAA

Danmark har en stærk svømmetradition, og NCAA tilbyder en unik mulighed for danske svømmere til at kombinere sport på højt niveau med en amerikansk universitetsuddannelse. Flere danske svømmere har opnået imponerende resultater i college-regi.

### Sæsonens gang

College-svømning løber fra oktober til marts, med conference-mesterskaberne i februar og NCAA Championships i marts som sæsonens højdepunkt. Træningen er intensiv — op til 20 timer om ugen i vandet plus styrketræning. Den lange opbygning er tilrettelagt med "tapering", så svømmerne topper præcis til mesterskaberne.

### Sådan afgøres en holdkamp

I et "dual meet" møder to skoler hinanden, og selvom hver svømmer kæmper individuelt, er det holdets samlede pointsum, der afgør sejren. I hver disciplin tildeles point efter placering — for eksempel 9 point for førstepladsen, derefter 4, 3, 2 og 1 til de næste — og stafetterne giver dobbelt op. Et hold kan altså vinde stævnet uden at have den hurtigste enkeltsvømmer, hvis bredden er stor nok. Udspring tæller med i den samlede score på lige fod med svømningen. Til de store mesterskaber stiller mange hold op samtidig, og pointene lægges sammen på tværs af alle discipliner.

### Tidbits

En vigtig detalje for danskere: amerikansk college-svømning foregår i et 25-yards-bassin ("short course yards"), ikke de 50 meter, man kender hjemmefra — så tiderne kan ikke sammenlignes direkte. De fleste stævner afvikles med indledende heat om morgenen og finaler om aftenen. Den danske svømmeskoles fokus på teknik og udholdenhed forbereder atleterne godt, og flere danskere har sat universitetsrekorder og kvalificeret sig til NCAA Championships. North Carolina State har været et samlingspunkt for danske svømmere: distancesvømmeren Anton Ipsen markerede sig blandt USA's bedste, og Søren Dahl vandt to NCAA-titler med skolens stafetter i 2016 og 2017.

### Kilder

- [NCAA.com — DI svømning & udspring (officiel)](https://www.ncaa.com/sports/swimming-men/d1)`,
  },

  atletik: {
    title: "Atletik",
    intro:
      "Danske atletikudøvere i NCAA. Sprint, spring, kast og mellemdistance — følg danskere på college-hold i USA.",
    metaDescription:
      "Danske atletikudøvere i NCAA – nyheder, profiler og resultater fra track and field i USA.",
    pillar: `## Dansk atletik i NCAA (track & field)

Atletik er en af de største sportsgrene i NCAA, og danske atleter har gode muligheder for at konkurrere på højt niveau. Fra sprint til kast, fra spring til mellemdistance — der er plads til danske talenter i alle discipliner.

### Sæsonens gang

College atletik strækker sig over næsten hele studieåret i tre faser: cross country om efteråret (september-november), indendørs atletik om vinteren (januar-marts) og udendørs atletik om foråret (marts-juni). NCAA Indoor og Outdoor Championships er sæsonens to store højdepunkter, og mange atleter konkurrerer i alle tre sæsoner som en del af samme program.

### Sådan afgøres en holdkamp

Selvom hver enkelt øvelse er en individuel præstation, samles det hele til en holdkamp gennem point. Ved et stævne — det være sig et "dual meet" mellem to skoler eller et stort invitational med mange hold — tildeles der point efter placering i hver disciplin, og skolens samlede sum afgør den endelige rangering. Et bredt hold, der scorer point i mange forskellige øvelser, slår derfor et hold med få store stjerner. Cross country har sin helt egen logik: her vinder holdet med den LAVESTE score, fordi man lægger placeringerne for de fem bedste løbere sammen — så en førsteplads er bedre end en tiendeplads.

### Tidbits

Stafetterne er blandt de mest populære øvelser, og holdfølelsen omkring dem er stor selv i en ellers individuel sport. NCAA-systemet har fostret mange olympiske medaljevindere, og flere danske atletikudøvere har sat sig spor med All-American-udnævnelser og conference-mesterskaber. Den danske atletiktradition, særligt inden for mellemdistance og spring, passer godt til det amerikanske college-system. Et godt eksempel er forhindringsløberen Ole Hesselbjerg, der blev tredobbelt All-American på Eastern Kentucky og senere repræsenterede Danmark i 3.000 m steeplechase ved OL i Rio 2016.

### Kilder

- [NCAA.com — DI udendørs atletik (officiel)](https://www.ncaa.com/sports/track-field-outdoor-men/d1)
- [NCAA.com — DI cross country (officiel)](https://www.ncaa.com/sports/cross-country-men/d1)`,
  },

  golf: {
    title: "Golf",
    intro:
      "Danske golfspillere på NCAA-hold. Danmark har en stærk golftradition, og flere talenter spiller på amerikanske universiteter.",
    metaDescription:
      "Danske golfspillere i NCAA – nyheder, profiler og resultater fra college golf i USA.",
    pillar: `## Dansk golf i NCAA

Golf er en af de sportsgrene, hvor danske atleter har markeret sig allermest i NCAA. Danmarks stærke golftradition og høje niveau i ungdomsgolf gør det til en naturlig vej til amerikanske universiteter.

### Sæsonens gang

College golf deler sit program over to dele af studieåret: en efterårssæson (september-november) og en forårssæson (februar-maj), der bygger op til mesterskaberne. NCAA Championships spilles i slutningen af maj og er en af golfsportens mest prestigefyldte college-begivenheder.

### Sådan afgøres en holdkamp

Det meste af sæsonen spilles som "stroke play" over 54 huller (tre runder): hvert hold stiller op med fem spillere, men kun de fire bedste runder tæller med hver dag, så den dårligste score smides væk. Holdet med færrest slag i alt vinder. Det betyder, at en enkelt katastroferunde kan reddes af holdkammeraterne — golf bliver pludselig en holdsport. Til selve NCAA-finalen ændres formatet undervejs: efter den indledende stroke play går de otte bedste hold videre til "match play", hvor skolerne sættes mod hinanden mand-mod-mand, og det hold, der vinder flest af de individuelle dueller, går videre. Den dramatiske afslutning blev indført i 2009 og har givet golfen et knockout-format, der minder om March Madness.

### Tidbits

Vejen fra dansk ungdomsgolf til NCAA er veletableret, og flere danskere har vundet individuelle NCAA-turneringer og bidraget til holdets succes i conference-mesterskaber. For mange er college golf et springbræt direkte til professionel golf på PGA- og LPGA-touren. Rasmus Neergaard-Petersen er et nutidigt eksempel: han blev All-American på Oklahoma State — samme stærke program som Viktor Hovland — og er siden rykket op på de professionelle touren.

### Kilder

- [NCAA.com — DI herregolf (officiel)](https://www.ncaa.com/sports/golf-men/d1)`,
  },

  tennis: {
    title: "Tennis",
    intro:
      "Danske tennisspillere i NCAA. Følg de danske talenter, der kombinerer topsport og uddannelse på amerikanske universiteter.",
    metaDescription:
      "Danske tennisspillere i NCAA – nyheder, profiler og resultater fra college tennis i USA.",
    pillar: `## Dansk tennis i NCAA

Tennis er en af de mest populære sportsgrene for internationale atleter i NCAA, og danske spillere har en stærk tilstedeværelse. Det individuelle format og det høje niveau i dansk tennis gør det til en oplagt mulighed.

### Sæsonens gang

Holdsæsonen løber fra januar til maj og kulminerer med NCAA Championships i maj. Efteråret er derimod individuelt: her spiller spillerne turneringer for sig selv for at opbygge ranking, før de om foråret samles til holdkampene.

### Sådan afgøres en holdkamp

En "dual match" mellem to skoler afgøres på syv mulige point. Først spilles tre doubler samtidig, og det hold, der vinder to af dem, får ét samlet doublepoint. Derefter spilles seks singler, hvor hver kamp er ét point. Det hold, der først når fire point i alt, har vundet — og kampen stoppes i det øjeblik, afgørelsen er sikker, så de sidste singler ikke altid spilles færdige. Det gør college tennis langt mere holdorienteret end den professionelle sport: udfaldet afhænger af hele truppen, ikke kun af stjernen på førstepladsen.

### Tidbits

College tennis bryder med den professionelle sports stilhed: holdkammerater og studenter hepper højlydt mellem boldskifterne, og stemningen minder mere om en holdsport end om en Grand Slam. Mange kampe spilles desuden med "no-ad"-scoring, hvor et point ved 40-40 afgør hele partiet — det gør spillet hurtigere og mere nervepirrende. Den tekniske træning og kamperfaring fra dansk og europæisk tennis giver et solidt fundament for NCAA-konkurrence. Danskerne har sat markante aftryk: Mikael Torpegaard blev femdobbelt All-American på Ohio State, og August Holmgren spillede sig hele vejen til finalen i NCAA's individuelle mesterskab i 2022 for San Diego.

### Kilder

- [NCAA.com — College tennis går over til no-ad-scoring](https://www.ncaa.com/news/tennis-men/article/2015-08-13/division-i-tennis-championships-move-no-ad-scoring)
- [ITA — Regelændringer for college tennis 2025-26](https://wearecollegetennis.com/2025/07/14/2025-2026-ita-rule-modifications-changes-and-clarifications/)`,
  },

  roning: {
    title: "Roning",
    intro:
      "Danske roere på NCAA-hold. Roning er en stor sport i det amerikanske college-system, og danske roere er eftertragtede.",
    metaDescription:
      "Danske roere i NCAA – nyheder, profiler og resultater fra college rowing i USA.",
    pillar: `## Dansk roning i NCAA

Roning har en særlig plads i NCAA, især for kvinder, og Danmarks stærke roklubber og traditioner gør det til en naturlig base for atleter, der vil konkurrere i USA.

### Sæsonens gang

College-roning har to vidt forskellige sæsoner. Om efteråret ros der "head races": lange løb på 4-6 km, hvor bådene sendes af sted med tidsmellemrum og kæmper mod uret frem for side om side. Om foråret skifter sporten til "sprint racing" — korte, eksplosive løb på typisk 2.000 meter, hvor flere både ligger på stribe og ror direkte mod hinanden mod målstregen. Sæsonen kulminerer med NCAA Championships i slutningen af maj eller starten af juni. Træningen er berygtet intensiv med både morgen- og eftermiddagssessioner.

### Sådan afgøres en holdkamp

Når to eller flere skoler mødes til en regatta, stiller hver skole op med flere både i forskellige klasser — typisk otter (med styrmand) og firere. Hvert løb giver point, og skolens samlede resultat på tværs af alle bådene afgør den endelige placering. Det er altså ikke nok at have én hurtig båd; dybden i hele programmet tæller. Styrmanden ("coxswainen") ror ikke selv, men styrer båden og dirigerer roernes rytme — ofte holdets mindste person ombord.

### Tidbits

Et kuriosum værd at kende: kvinderoning er en officiel NCAA-mesterskabssport, mens herreroningen historisk styres af en separat organisation (IRA) uden for NCAA — så stipendiemulighederne er klart størst for kvinder. Den danske roningstradition er stærk, og flere danskere har brugt college-roning som springbræt til international konkurrence og OL. Joachim Sutton var en af de første danske roere på et amerikansk universitetshold, da han ankom til University of California, Berkeley.

### Kilder

- [NCAA.com — DI kvinderoning (officiel)](https://www.ncaa.com/sports/rowing-women/d1)`,
  },

  gymnastik: {
    title: "Gymnastik",
    intro:
      "Danske gymnaster på NCAA-hold. Følg de danske talenter inden for kunstnerisk gymnastik og rytmisk gymnastik i USA.",
    metaDescription:
      "Danske gymnaster i NCAA – nyheder, profiler og resultater fra college gymnastics i USA.",
    pillar: `## Dansk gymnastik i NCAA

Gymnastik er en af NCAAʼs mest populære sportsgrene med stor publikumsinteresse. Danske gymnaster, der har trænet på højt niveau i Danmark eller Skandinavien, kan finde gode muligheder i det amerikanske college-system.

### Sæsonens gang

College-gymnastik løber fra januar til april, med conference-mesterskaber og NCAA Championships som klimaks i april. Sæsonen er kort og tæt, og fordi hver eneste øvelse tæller, er konsistens vigtigere end enkeltstående spektakulære præstationer.

### Sådan afgøres en holdkamp

Når to eller flere skoler mødes, konkurrerer gymnasterne i de enkelte apparater — fire for kvinder (spring, barre, bom og gulv) og seks for herrer. Hver gymnasts øvelse bedømmes med en score, og holdets samlede sum af de tællende scorer i hvert apparat afgør sejren. Et hold stiller typisk med flere gymnaster pr. apparat, men kun de bedste scorer tæller, så bredde og pålidelighed er afgørende. Det er kombinationen af holdets samlede præstation på tværs af alle apparater, der kårer vinderen — ikke en enkelt stjernes glansnummer.

### Tidbits

En charmerende særhed ved kvindernes college-gymnastik: den holder fast i den klassiske 10-skala, hvor det "perfekte 10-tal" stadig findes — i modsætning til både elitegymnastikkens internationale system og herrernes college-gymnastik, der begge bruger en åben skala uden loft. Et perfekt 10-tal i en fyldt amerikansk hal udløser euforisk jubel. Danmarks gymnastiktradition er bred, og de atleter, der tager springet til NCAA, kommer typisk fra konkurrencemiljøet med en stærk teknisk baggrund.

### Kilder

- [NCAA.com — DI kvindegymnastik (officiel)](https://www.ncaa.com/sports/gymnastics-women/d1)`,
  },

  ishockey: {
    title: "Ishockey",
    intro:
      "Danske ishockeyspillere på amerikanske universiteter. Følg danskerne i NCAA og college hockey.",
    metaDescription:
      "Danske ishockeyspillere i NCAA – nyheder, profiler og resultater fra college hockey i USA.",
    pillar: `## Dansk ishockey i NCAA

Ishockey er en stor sport i det amerikanske college-system, med intense rivaliseringer og høj kvalitet. Danske ishockeyspillere, der har udviklet sig i Metal Ligaen eller danske ungdomsprogrammer, kan finde en vej til NCAA.

### Sæsonens gang

College hockey-sæsonen løber fra oktober til april. Holdene spiller omkring 34 kampe i den regulære sæson, ofte i serier med to kampe på samme weekend mod den samme modstander. Conference-turneringerne i marts fører frem til NCAA-turneringen, der kulminerer med "Frozen Four" — de fire bedste hold, der mødes om det nationale mesterskab.

### Tidbits

College hockey er en af de vigtigste leverandører af spillere til NHL: mange spillere udvikler sig her i stedet for i de canadiske juniorligaer, fordi de samtidig kan tage en uddannelse. En særhed ved amatørstatussen er, at en draftet NHL-spiller godt kan fortsætte i college, så længe han ikke har skrevet professionel kontrakt.

En historisk regelændring trådte i kraft 1. august 2025: spillere fra den canadiske major junior-liga (CHL) kan nu også spille NCAA Division I-hockey. Tidligere blev de betragtet som professionelle og var udelukket — ændringen åbner et helt nyt rekrutteringslandskab (gælder dog ikke Division III). Med den danske ishockeys stigende niveau og flere danske spillere i professionelle ligaer verden over er NCAA-vejen blevet en attraktiv mulighed for unge danske spillere, der vil kombinere sport og uddannelse. Forsvarsspilleren Oliver Lauridsen gik fx vejen gennem St. Cloud State, før han blev draftet og spillede i NHL.

### Kilder

- [NHL.com — CHL-spillere bliver spilleberettigede til NCAA fra 2025-26](https://www.nhl.com/news/chl-players-to-be-eligible-to-play-ncaa-hockey-beginning-in-2025-26)
- [College Hockey Inc. — DI Council gør CHL-spillere spilleberettigede](https://www.collegehockeyinc.com/2024/11/breaking-ncaa-di-council-votes-to-make-chl-players-eligible/)`,
  },

  volleyball: {
    title: "Volleyball",
    intro:
      "Danske volleyballspillere i NCAA. Følg de danske talenter på amerikanske universitetshold.",
    metaDescription:
      "Danske volleyballspillere i NCAA – nyheder, profiler og resultater fra college volleyball i USA.",
    pillar: `## Dansk volleyball i NCAA

Volleyball er en af NCAAʼs største sportsgrene, især for kvinder, med tusindvis af hold på tværs af divisioner. Danske volleyballspillere har gode muligheder, da sporten er mindre eksponeret internationalt end fx fodbold.

### Sæsonens gang

De to køn spiller i hver sin halvdel af året: kvindevolleyball er en efterårssport (august-december), mens herrevolleyball spilles om foråret (januar-maj). Kvindernes NCAA Volleyball Championship i december er en af efterårets store tv-begivenheder og fylder arenaer med titusinder af tilskuere.

### Tidbits

Ud over den klassiske indendørs 6-mod-6-volleyball er beachvolley vokset til en selvstændig NCAA-mesterskabssport, hvor par spiller mod par i sandet — en hurtigt voksende disciplin, hvor europæiske spillere klarer sig godt. En libero-spiller bærer afvigende trøjefarve og er specialist i forsvar, men må ikke angribe over nettet. Den danske volleyballtradition med fokus på teknik og taktik passer godt til college-sporten, og flere danske spillere har gjort sig bemærket med All-Conference-udnævnelser.

### Kilder

- [NCAA.com — DI kvindevolleyball (officiel)](https://www.ncaa.com/sports/volleyball-women/d1)`,
  },

  andet: {
    title: "Andre sportsgrene",
    intro:
      "Danske atleter i mindre repræsenterede sportsgrene i NCAA — fra lacrosse til fægtning.",
    metaDescription:
      "Danske atleter i øvrige NCAA-sportsgrene – nyheder og profiler fra niche-sportsgrene i USA.",
    pillar: `## Andre sportsgrene i NCAA

NCAA afvikler mesterskaber i omkring 24 sportsgrene, og danske atleter kan findes i mange af dem. Fra lacrosse til fægtning, fra vandpolo og sejlsport til skisport og wrestling — mulighederne er bredere, end de fleste tror. Udbuddet vokser stadig: kvindebrydning fik sit første NCAA-mesterskab i 2026, og acrobatics & tumbling samt stunt følger fra 2027.

### Holdsport og individuelle stævner

Sportsgrenene i denne kategori afgøres på vidt forskellige måder. Nogle, som lacrosse og vandpolo, er rene holdkampe mellem to skoler. Andre, som fægtning, wrestling og skisport, fungerer som "meets", hvor de enkelte dueller eller løb hver giver point, og skolernes samlede pointsum afgør holdsejren — på samme måde som i svømning og atletik. Det betyder, at en skole kan vinde et stævne på bredde og pålidelighed frem for på enkelte stjerner.

### Tidbits

Flere af NCAAʼs mindre sportsgrene har færre ansøgere til stipendierne, hvilket kan være en reel fordel for danske atleter med talent inden for en nichesport. Wrestling (amerikansk brydning) er fx en stor og traditionsrig college-sport, og lacrosse vokser hastigt. Efterhånden som kendskabet til NCAA-systemet breder sig i Danmark, ser vi atleter fra stadig flere sportsgrene tage springet over Atlanten.

### Kilder

- [NCAA.org — NCAA tilføjer fire nye mesterskaber](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-to-add-four-new-championships.aspx)
- [NCAA.org — NCAA's første kvindebrydningsmesterskaber](https://www.ncaa.org/news/2026/3/4/media-center-ncaas-first-womens-wrestling-championships-what-to-know.aspx)`,
  },
};

/** Hent indhold for en sport — returnerer undefined hvis sporten ikke findes */
export function getSportContent(sport: string): SportContent | undefined {
  return SPORT_CONTENT[sport.toLowerCase()];
}

/** Alle sport-slugs der har en landingsside */
export function getSportSlugs(): string[] {
  return Object.keys(SPORT_CONTENT);
}
