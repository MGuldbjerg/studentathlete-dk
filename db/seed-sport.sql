INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('football', 'DK', 'Football', '## Dansk football i NCAA

Amerikansk football er den sportsgren, der har åbnet flest døre for danske atleter i USA. Særligt kicker- og punter-positionen er blevet en dansk specialitet — det kræver præcision og is i maven, og en dansk fodboldopvækst træner benet i at ramme bolden rent. Det er en evne, som flere college-programmer aktivt rekrutterer efter i udlandet.

### Sæsonens gang

College football-sæsonen er kort og intens. Den regulære sæson løber fra slutningen af august til slutningen af november med typisk 12 kampe — næsten altid spillet om lørdagen, hvor college football ejer dagen (NFL spiller om søndagen). Først i december afgøres conference-mesterskaberne, og derefter følger bowl-kampe og College Football Playoff, der siden 2024 har 12 hold og slutter med et nationalt mesterskab i januar. Foråret bruges til styrketræning og "spring practice", hvor holdet bygges op til næste sæson.

### Sådan fungerer college-systemet

Frem til 2025 måtte et Division I-hold (FBS) give 85 fulde football-stipendier, men efter det store "House"-forlig i 2025 er der i stedet indført et samlet trupsloft på 105 spillere, hvor alle i princippet kan modtage stipendium. Den klassiske "walk-on" uden stipendium er dermed på vej ud — ingen er formelt forbudt, men hver plads tæller nu mod loftet. Hertil er selve spilleberettigelsen lagt om: den gamle "fire sæsoner inden for fem år" og redshirt-ordningen erstattes gradvist af en aldersbaseret model (op til fem års eligibility). Læs mere i [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Tidbits

Morten Andersen — "The Great Dane" — er den mest berømte dansker i amerikansk football og sidder i Pro Football Hall of Fame; han var i en årrække NFL''s mestscorende spiller gennem tiderne (i dag nummer to, efter Adam Vinatieri passerede ham i 2018) og kom selv gennem college som All-American kicker på Michigan State. En nyere profil er Hjalte Froholdt, der gik fra Danmark via University of Arkansas til NFL som offensive lineman. Stemningen er enorm: Michigans stadion "The Big House" rummer 107.601 tilskuere, flere end nogen by mellem København og Aarhus. Rekrutteringskalenderen har sin egen dramatik: den tidlige underskrivningsperiode i december er i dag den vigtigste, mens den traditionelle "National Signing Day" i februar stadig følges tæt.

### Kilder

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/news/2025/6/23/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits.aspx)
- [CBS Sports. (2025). NCAA removes scholarship limits, aligns with House settlement as roster sizes evolve.](https://www.cbssports.com/college-football/news/ncaa-removes-scholarship-limits-aligns-with-house-settlement-as-roster-sizes-evolve-in-new-college-sports-era/)
- [Sports Illustrated. (2025). College Football Playoff remains 12 teams in 2026.](https://www.si.com/college-football/playoffs/cfp-makes-decision-expansion-2026)
- [Pro Football Hall of Fame. (2017). Morten Andersen.](https://www.profootballhof.com/players/morten-andersen)', 'Danske football-atleter i NCAA – nyheder, profiler og resultater fra college football i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('basketball', 'DK', 'Basketball', '## Dansk basketball i NCAA

Basketball har i de seneste år set en stigende interesse fra danske atleter, der drømmer om at spille på højt niveau i USA. Den danske liga giver et godt fundament, og flere spillere har gjort springet til NCAA Division I og II.

### Sæsonens gang

NCAA basketball-sæsonen begynder i november og kulminerer med March Madness — det legendariske slutspil i marts og april. Holdene spiller typisk 30-35 kampe i den regulære sæson, fordelt på ikke-conference-kampe i efteråret og et tæt conference-program hen over vinteren. Conference-turneringerne i starten af marts afgør de sidste billetter til det store slutspil.

### Sådan fungerer March Madness

Slutspillet er en knockout-turnering, der spilles i én lang weekend-rytme over tre uger: taber man én kamp, er man ude. Holdene seedes 1 til 16 i fire regioner, og hvert år overrasker en lavtseedet "Cinderella"-skole ved at slå favoritterne. Faserne hedder Sweet Sixteen, Elite Eight og Final Four, og det hele afsluttes med en finale, der trods tidsforskellen også har sit danske publikum. Feltet har været på 68 hold, men NCAA besluttede i 2026 at udvide både herrernes og kvindernes turnering til 76 hold fra sæsonen 2026-27.

### Tidbits

College basketball har en helt anden stemning end de professionelle ligaer: studenter-sektioner, der står op hele kampen, marchorkestre og rivaliseringer, der går generationer tilbage. Turneringen er så uforudsigelig, at den årlige "bracket"-konkurrence — hvor man forsøger at gætte alle resultater — aldrig i historien er blevet ramt perfekt. Danske spillere roses ofte for deres alsidighed, holdspilsmentalitet og taktiske forståelse, som amerikanske trænere vurderer højt. To danske college-pionerer rager op: Christian Drejer spillede for Florida Gators og blev i 2004 den første dansker nogensinde, der blev draftet til NBA, mens Inge Nissen vandt to nationale mesterskaber med Old Dominion (1979 og 1980 — dengang under AIAW, forløberen for NCAA''s kvindeturnering) og siden er optaget i Women''s Basketball Hall of Fame.

### Kilder

- [NCAA. (2026, 7. maj). NCAA basketball tournaments expanding to 76 teams: What to know.](https://www.ncaa.org/sports/2026/5/7/ncaa-basketball-tournaments-expanding-to-76-teams-what-to-know.aspx)
- [NCAA. (2026, 7. maj). How the 2027 expanded NCAA tournament and March Madness brackets will work.](https://www.ncaa.com/news/basketball-men/article/2026-05-07/how-2027-expanded-ncaa-tournament-and-march-madness-brackets-will-work)
- [Women''s Basketball Hall of Fame. (2012). Inge Nissen.](https://wbhof.com/member/inge-nissen/)', 'Danske basketball-atleter i NCAA – nyheder, profiler og resultater fra college basketball i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('baseball', 'DK', 'Baseball', '## Dansk baseball i NCAA

Baseball er en nichesport i Danmark, men det lille danske baseballmiljø har alligevel produceret atleter, der kan konkurrere på NCAA-niveau. Den voksende interesse for sporten har åbnet døre for danske talenter.

### Sæsonens gang

College baseball-sæsonen løber fra midten af februar til juni — et af de mest intense programmer i NCAA med op til 56 kampe i den regulære sæson. Holdene spiller ofte tre kampe på en weekend mod samme modstander (en "series"), så pitching-staben skal være dyb. Sæsonen kulminerer med et regionalt slutspil og til sidst College World Series i Omaha, Nebraska, hvor de otte bedste hold mødes foran fyldte tribuner.

### Sådan adskiller det sig fra profferne

College baseball spilles med aluminiums- og kompositbat (BBCOR-godkendte) i stedet for de træbat, der bruges i professionel baseball. Det giver sportens helt egen lyd — et skarpt "ping" i stedet for et "knæk" — og lidt mere kraft, hvilket gør college-kampene højtscorende og hurtige.

### Tidbits

Baseball var historisk en såkaldt "equivalency sport": et hold delte et begrænset antal stipendier (11,7 i Division I) ud over en stor trup, så fuldt stipendium var sjældent. Det ændrede House-forliget i 2025: de sportsspecifikke stipendielofter er afskaffet og erstattet af et trupsloft på 34 spillere i D-I, hvor alle på truppen i princippet kan få fuldt stipendium. Mange spillere bliver draftet til den professionelle MLB direkte fra college. Softball og baseball er voksende sportsgrene i Danmark, og med flere unge, der tager sporten op, kan vi forvente at se flere danskere på amerikanske college-hold i de kommende år.

### Kilder

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/news/2025/6/23/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits.aspx)
- [NCSA. (2025). New NCAA scholarship and roster limits for 2025-26.](https://www.ncsasports.org/blog/ncaa-scholarship-roster-limits-2024)', 'Danske baseball-atleter i NCAA – nyheder, profiler og resultater fra college baseball i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('fodbold', 'DK', 'Fodbold', '## Dansk fodbold i NCAA (soccer)

Fodbold — eller soccer, som det hedder i USA — er en af de mest populære veje for danske atleter til amerikanske universiteter. Med et af verdens stærkeste ungdomssystemer har danske fodboldspillere et naturligt forspring.

### Sæsonens gang

NCAA soccer-sæsonen er kort og intens: kvinder og herrer spiller begge i efteråret, fra august til november, med omkring 18-20 kampe presset sammen på få måneder. Det betyder ofte to kampe om ugen og stor belastning på kroppen. NCAA-slutspillet (hvor finalestævnet kaldes College Cup) har 48 hold hos herrerne og 64 hold hos kvinderne og afgøres i begyndelsen af december. Foråret bruges til individuel udvikling, styrketræning og uofficielle forårsturneringer.

### Sådan adskiller reglerne sig

College soccer har sine egne særregler, der overrasker europæere. På de fleste niveauer — kvindefodbold og de lavere divisioner — må en spiller, der er skiftet ud, komme ind igen senere i kampen, og der skiftes generelt langt mere end i europæisk fodbold, hvilket gør spillet hurtigere og mere fysisk (herrernes Division I afskaffede dog gen-indskiftning i 2024 for at ligne FIFA-reglerne mere). Uafgjorte kampe i den regulære sæson kan ende med kort forlænget spilletid, og i slutspillet afgøres det hele til sidst på straffespark.

### Tidbits

Kvindefodbold er enormt i USA og i mange år bygget op netop omkring college-systemet — flere stjerner fra det amerikanske VM-vindende landshold er gået vejen gennem NCAA. Den danske fodboldtradition med fokus på boldbehandling, positionsspil og taktisk disciplin passer godt til college soccer, og mange danske spillere opnår startpladser fra dag ét. Fodbold er efter StudentAthlete.dk''s egen optælling blandt de sportsgrene, der sender flest danskere til NCAA — på tværs af herre- og kvindehold ligger danske spillere på rosters fra Division I til Division III over hele USA, selvom de største danske fodboldtalenter typisk går den professionelle vej herhjemme i stedet for over Atlanten.

### Kilder

- [NCAA. (2024, 18. april). Substitution rules changes approved for DI men''s soccer.](https://www.ncaa.org/news/2024/4/18/media-center-substitution-rules-changes-approved-for-di-mens-soccer.aspx)
- [NCAA. (n.d.). Road to the championship: Men''s soccer (College Cup).](https://www.ncaa.com/championships/soccer-men/d1/road-to-the-championship)', 'Danske fodboldspillere (soccer) i NCAA – nyheder, profiler og resultater fra college soccer i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('svoemning', 'DK', 'Svømning', '## Dansk svømning i NCAA

Danmark har en stærk svømmetradition, og NCAA tilbyder en unik mulighed for danske svømmere til at kombinere sport på højt niveau med en amerikansk universitetsuddannelse. Flere danske svømmere har opnået imponerende resultater i college-regi.

### Sæsonens gang

College-svømning løber fra oktober til marts, med conference-mesterskaberne i februar og NCAA Championships i marts som sæsonens højdepunkt. Træningen er intensiv — op til 20 timer om ugen i vandet plus styrketræning. Den lange opbygning er tilrettelagt med "tapering", så svømmerne topper præcis til mesterskaberne.

### Sådan afgøres en holdkamp

I et "dual meet" møder to skoler hinanden, og selvom hver svømmer kæmper individuelt, er det holdets samlede pointsum, der afgør sejren. I hver disciplin tildeles point efter placering — for eksempel 9 point for førstepladsen, derefter 4, 3, 2 og 1 til de næste — og stafetterne giver dobbelt op. Et hold kan altså vinde stævnet uden at have den hurtigste enkeltsvømmer, hvis bredden er stor nok. Udspring tæller med i den samlede score på lige fod med svømningen. Til de store mesterskaber stiller mange hold op samtidig, og pointene lægges sammen på tværs af alle discipliner.

### Tidbits

En vigtig detalje for danskere: amerikansk college-svømning foregår i et 25-yards-bassin ("short course yards"), ikke de 50 meter, man kender hjemmefra — så tiderne kan ikke sammenlignes direkte. De fleste stævner afvikles med indledende heat om morgenen og finaler om aftenen. Den danske svømmeskoles fokus på teknik og udholdenhed forbereder atleterne godt, og flere danskere har sat universitetsrekorder og kvalificeret sig til NCAA Championships. North Carolina State har været et samlingspunkt for danske svømmere: distancesvømmeren Anton Ipsen markerede sig blandt USA''s bedste, og Søren Dahl vandt to NCAA-titler med skolens stafetter i 2016 og 2017.

### Kilder

- [NCAA. (n.d.). NCAA Division I men''s swimming & diving.](https://www.ncaa.com/sports/swimming-men/d1)', 'Danske svømmere i NCAA – nyheder, profiler og resultater fra college-svømning i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('atletik', 'DK', 'Atletik', '## Dansk atletik i NCAA (track & field)

Atletik er en af de største sportsgrene i NCAA, og danske atleter har gode muligheder for at konkurrere på højt niveau. Fra sprint til kast, fra spring til mellemdistance — der er plads til danske talenter i alle discipliner.

### Sæsonens gang

College atletik strækker sig over næsten hele studieåret i tre faser: cross country om efteråret (september-november), indendørs atletik om vinteren (januar-marts) og udendørs atletik om foråret (marts-juni). NCAA Indoor og Outdoor Championships er sæsonens to store højdepunkter, og mange atleter konkurrerer i alle tre sæsoner som en del af samme program.

### Sådan afgøres en holdkamp

Selvom hver enkelt øvelse er en individuel præstation, samles det hele til en holdkamp gennem point. Ved et stævne — det være sig et "dual meet" mellem to skoler eller et stort invitational med mange hold — tildeles der point efter placering i hver disciplin, og skolens samlede sum afgør den endelige rangering. Et bredt hold, der scorer point i mange forskellige øvelser, slår derfor et hold med få store stjerner. Cross country har sin helt egen logik: her vinder holdet med den LAVESTE score, fordi man lægger placeringerne for de fem bedste løbere sammen — så en førsteplads er bedre end en tiendeplads.

### Tidbits

Stafetterne er blandt de mest populære øvelser, og holdfølelsen omkring dem er stor selv i en ellers individuel sport. NCAA-systemet har fostret mange olympiske medaljevindere, og flere danske atletikudøvere har sat sig spor med All-American-udnævnelser og conference-mesterskaber. Den danske atletiktradition, særligt inden for mellemdistance og spring, passer godt til det amerikanske college-system. Et godt eksempel er forhindringsløberen Ole Hesselbjerg, der blev tredobbelt All-American på Eastern Kentucky og senere repræsenterede Danmark i 3.000 m steeplechase ved OL i Rio 2016.

### Kilder

- [NCAA. (n.d.). NCAA Division I men''s outdoor track and field.](https://www.ncaa.com/sports/track-field-outdoor-men/d1)
- [NCAA. (n.d.). NCAA Division I men''s cross country.](https://www.ncaa.com/sports/cross-country-men/d1)', 'Danske atletikudøvere i NCAA – nyheder, profiler og resultater fra track and field i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('golf', 'DK', 'Golf', '## Dansk golf i NCAA

Golf er en af de sportsgrene, hvor danske atleter har markeret sig allermest i NCAA. Danmarks stærke golftradition og høje niveau i ungdomsgolf gør det til en naturlig vej til amerikanske universiteter.

### Sæsonens gang

College golf deler sit program over to dele af studieåret: en efterårssæson (september-november) og en forårssæson (februar-maj), der bygger op til mesterskaberne. NCAA Championships spilles i slutningen af maj og er en af golfsportens mest prestigefyldte college-begivenheder.

### Sådan afgøres en holdkamp

Det meste af sæsonen spilles som "stroke play" over 54 huller (tre runder): hvert hold stiller op med fem spillere, men kun de fire bedste runder tæller med hver dag, så den dårligste score smides væk. Holdet med færrest slag i alt vinder. Det betyder, at en enkelt katastroferunde kan reddes af holdkammeraterne — golf bliver pludselig en holdsport. Til selve NCAA-finalen ændres formatet undervejs: efter den indledende stroke play går de otte bedste hold videre til "match play", hvor skolerne sættes mod hinanden mand-mod-mand, og det hold, der vinder flest af de individuelle dueller, går videre. Den dramatiske afslutning blev indført i 2009 og har givet golfen et knockout-format, der minder om March Madness.

### Tidbits

Vejen fra dansk ungdomsgolf til NCAA er veletableret, og flere danskere har vundet individuelle NCAA-turneringer og bidraget til holdets succes i conference-mesterskaber. For mange er college golf et springbræt direkte til professionel golf på PGA- og LPGA-touren. Rasmus Neergaard-Petersen er et nutidigt eksempel: han blev All-American på Oklahoma State — samme stærke program som Viktor Hovland — og er siden rykket op på de professionelle touren.

### Kilder

- [NCAA. (n.d.). NCAA Division I men''s golf.](https://www.ncaa.com/sports/golf-men/d1)
- [NCAA. (n.d.). DI men''s golf championship history.](https://www.ncaa.com/history/golf-men/d1)', 'Danske golfspillere i NCAA – nyheder, profiler og resultater fra college golf i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('tennis', 'DK', 'Tennis', '## Dansk tennis i NCAA

Tennis er en af de mest populære sportsgrene for internationale atleter i NCAA, og danske spillere har en stærk tilstedeværelse. Det individuelle format og det høje niveau i dansk tennis gør det til en oplagt mulighed.

### Sæsonens gang

Holdsæsonen løber fra januar til maj og kulminerer med NCAA Championships i maj. Efteråret er derimod individuelt: her spiller spillerne turneringer for sig selv for at opbygge ranking, før de om foråret samles til holdkampene.

### Sådan afgøres en holdkamp

En "dual match" mellem to skoler afgøres på syv mulige point. Først spilles tre doubler samtidig, og det hold, der vinder to af dem, får ét samlet doublepoint. Derefter spilles seks singler, hvor hver kamp er ét point. Det hold, der først når fire point i alt, har vundet — og kampen stoppes i det øjeblik, afgørelsen er sikker, så de sidste singler ikke altid spilles færdige. Det gør college tennis langt mere holdorienteret end den professionelle sport: udfaldet afhænger af hele truppen, ikke kun af stjernen på førstepladsen.

### Tidbits

College tennis bryder med den professionelle sports stilhed: holdkammerater og studenter hepper højlydt mellem boldskifterne, og stemningen minder mere om en holdsport end om en Grand Slam. Mange kampe spilles desuden med "no-ad"-scoring, hvor et point ved 40-40 afgør hele partiet — det gør spillet hurtigere og mere nervepirrende. Den tekniske træning og kamperfaring fra dansk og europæisk tennis giver et solidt fundament for NCAA-konkurrence. Danskerne har sat markante aftryk: Mikael Torpegaard blev femdobbelt All-American på Ohio State, og August Holmgren spillede sig hele vejen til finalen i NCAA''s individuelle mesterskab i 2022 for San Diego.

### Kilder

- [NCAA. (2015, 13. august). Division I tennis championships move to no-ad scoring.](https://www.ncaa.com/news/tennis-men/article/2015-08-13/division-i-tennis-championships-move-no-ad-scoring)
- [Intercollegiate Tennis Association. (2025, 14. juli). 2025-2026 ITA rule modifications, changes and clarifications.](https://wearecollegetennis.com/2025/07/14/2025-2026-ita-rule-modifications-changes-and-clarifications/)', 'Danske tennisspillere i NCAA – nyheder, profiler og resultater fra college tennis i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('roning', 'DK', 'Roning', '## Dansk roning i NCAA

Roning har en særlig plads i NCAA, især for kvinder, og Danmarks stærke roklubber og traditioner gør det til en naturlig base for atleter, der vil konkurrere i USA.

### Sæsonens gang

College-roning har to vidt forskellige sæsoner. Om efteråret ros der "head races": lange løb på 4-6 km, hvor bådene sendes af sted med tidsmellemrum og kæmper mod uret frem for side om side. Om foråret skifter sporten til "sprint racing" — korte, eksplosive løb på typisk 2.000 meter, hvor flere både ligger på stribe og ror direkte mod hinanden mod målstregen. Sæsonen kulminerer med NCAA Championships i slutningen af maj eller starten af juni. Træningen er berygtet intensiv med både morgen- og eftermiddagssessioner.

### Sådan afgøres en holdkamp

Når to eller flere skoler mødes til en regatta, stiller hver skole op med flere både i forskellige klasser — typisk otter (med styrmand) og firere. Hvert løb giver point, og skolens samlede resultat på tværs af alle bådene afgør den endelige placering. Det er altså ikke nok at have én hurtig båd; dybden i hele programmet tæller. Styrmanden ("coxswainen") ror ikke selv, men styrer båden og dirigerer roernes rytme — ofte holdets mindste person ombord.

### Tidbits

Et kuriosum værd at kende: kvinderoning er en officiel NCAA-mesterskabssport, mens herreroningen historisk styres af en separat organisation (IRA) uden for NCAA — så stipendiemulighederne er klart størst for kvinder. Den danske roningstradition er stærk, og flere danskere har brugt college-roning som springbræt til international konkurrence og OL. Joachim Sutton blev den første dansker på roholdet ved University of California, Berkeley, da han ankom i 2015 — han vandt siden OL-bronze i toer uden styrmand.

### Kilder

- [NCAA. (n.d.). NCAA Division I women''s rowing.](https://www.ncaa.com/sports/rowing-women/d1)
- [California Golden Bears Athletics. (2017, 1. februar). Inside the lair: Danish rower makes immediate impact in Berkeley.](https://calbears.com/news/2017/2/1/inside-the-lair-danish-rower-makes-immediate-impact-in-berkeley.aspx)', 'Danske roere i NCAA – nyheder, profiler og resultater fra college rowing i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('gymnastik', 'DK', 'Gymnastik', '## Dansk gymnastik i NCAA

Gymnastik er en af NCAAʼs mest populære sportsgrene med stor publikumsinteresse. Danske gymnaster, der har trænet på højt niveau i Danmark eller Skandinavien, kan finde gode muligheder i det amerikanske college-system.

### Sæsonens gang

College-gymnastik løber fra januar til april, med conference-mesterskaber og NCAA Championships som klimaks i april. Sæsonen er kort og tæt, og fordi hver eneste øvelse tæller, er konsistens vigtigere end enkeltstående spektakulære præstationer.

### Sådan afgøres en holdkamp

Når to eller flere skoler mødes, konkurrerer gymnasterne i de enkelte apparater — fire for kvinder (spring, barre, bom og gulv) og seks for herrer. Hver gymnasts øvelse bedømmes med en score, og holdets samlede sum af de tællende scorer i hvert apparat afgør sejren. Et hold stiller typisk med flere gymnaster pr. apparat, men kun de bedste scorer tæller, så bredde og pålidelighed er afgørende. Det er kombinationen af holdets samlede præstation på tværs af alle apparater, der kårer vinderen — ikke en enkelt stjernes glansnummer.

### Tidbits

En charmerende særhed ved kvindernes college-gymnastik: den holder fast i den klassiske 10-skala, hvor det "perfekte 10-tal" stadig findes — i modsætning til både elitegymnastikkens internationale system og herrernes college-gymnastik, der begge bruger en åben skala uden loft. Et perfekt 10-tal i en fyldt amerikansk hal udløser euforisk jubel. Danmarks gymnastiktradition er bred, og de atleter, der tager springet til NCAA, kommer typisk fra konkurrencemiljøet med en stærk teknisk baggrund.

### Kilder

- [NCAA. (n.d.). NCAA Division I women''s gymnastics.](https://www.ncaa.com/sports/gymnastics-women/d1)', 'Danske gymnaster i NCAA – nyheder, profiler og resultater fra college gymnastics i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('ishockey', 'DK', 'Ishockey', '## Dansk ishockey i NCAA

Ishockey er en stor sport i det amerikanske college-system, med intense rivaliseringer og høj kvalitet. Danske ishockeyspillere, der har udviklet sig i Metal Ligaen eller danske ungdomsprogrammer, kan finde en vej til NCAA.

### Sæsonens gang

College hockey-sæsonen løber fra oktober til april. Holdene spiller omkring 34 kampe i den regulære sæson, ofte i serier med to kampe på samme weekend mod den samme modstander. Conference-turneringerne i marts fører frem til NCAA-turneringen, der kulminerer med "Frozen Four" — de fire bedste hold, der mødes om det nationale mesterskab.

### Tidbits

College hockey er en af de vigtigste leverandører af spillere til NHL: mange spillere udvikler sig her i stedet for i de canadiske juniorligaer, fordi de samtidig kan tage en uddannelse. En særhed ved amatørstatussen er, at en draftet NHL-spiller godt kan fortsætte i college, så længe han ikke har skrevet professionel kontrakt.

En historisk regelændring trådte i kraft 1. august 2025: spillere fra den canadiske major junior-liga (CHL) kan nu også spille NCAA Division I-hockey. Tidligere blev de betragtet som professionelle og var udelukket — ændringen åbner et helt nyt rekrutteringslandskab (gælder dog ikke Division III). Med den danske ishockeys stigende niveau og flere danske spillere i professionelle ligaer verden over er NCAA-vejen blevet en attraktiv mulighed for unge danske spillere, der vil kombinere sport og uddannelse. Forsvarsspilleren Oliver Lauridsen gik fx vejen gennem St. Cloud State, før han blev draftet og spillede i NHL.

### Kilder

- [NHL.com. (2024, 7. november). CHL players to be eligible to play NCAA hockey beginning in 2025-26.](https://www.nhl.com/news/chl-players-to-be-eligible-to-play-ncaa-hockey-beginning-in-2025-26)
- [College Hockey Inc. (2024, november). NCAA DI Council votes to make CHL players eligible.](https://www.collegehockeyinc.com/2024/11/breaking-ncaa-di-council-votes-to-make-chl-players-eligible/)', 'Danske ishockeyspillere i NCAA – nyheder, profiler og resultater fra college hockey i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('volleyball', 'DK', 'Volleyball', '## Dansk volleyball i NCAA

Volleyball er en af NCAAʼs største sportsgrene, især for kvinder, med tusindvis af hold på tværs af divisioner. Danske volleyballspillere har gode muligheder, da sporten er mindre eksponeret internationalt end fx fodbold.

### Sæsonens gang

De to køn spiller i hver sin halvdel af året: kvindevolleyball er en efterårssport (august-december), mens herrevolleyball spilles om foråret (januar-maj). Kvindernes NCAA Volleyball Championship i december er en af efterårets store tv-begivenheder og fylder store arenaer — finalestævnet trækker omkring 18.000-19.000 tilskuere.

### Tidbits

Ud over den klassiske indendørs 6-mod-6-volleyball er beachvolley vokset til en selvstændig NCAA-mesterskabssport, hvor par spiller mod par i sandet — en hurtigt voksende disciplin, hvor europæiske spillere klarer sig godt. En libero-spiller bærer afvigende trøjefarve og er specialist i forsvar, men må ikke angribe over nettet. Den danske volleyballtradition med fokus på teknik og taktik passer godt til college-sporten, og flere danske spillere har gjort sig bemærket med All-Conference-udnævnelser.

### Kilder

- [NCAA. (n.d.). NCAA Division I women''s volleyball.](https://www.ncaa.com/sports/volleyball-women/d1)', 'Danske volleyballspillere i NCAA – nyheder, profiler og resultater fra college volleyball i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('field-hockey', 'DK', 'Field hockey', '## Field hockey i NCAA

Field hockey er en lille sport i Danmark, og netop derfor er den amerikanske vej interessant: i USA er field hockey et etableret college-program med fuld støtte, egne stadions og et mesterskab, der følges på tv. Feltet er samtidig et af de mest internationale i NCAA — hollandske, tyske, engelske, argentinske og australske spillere fylder meget på de bedste hold.

**Én ting skal siges først: field hockey i NCAA er en kvindesport.** Der findes intet NCAA-mesterskab for herrer og ingen herrelegater i field hockey. For danske drenge findes vejen altså ikke — uanset niveau.

### Sæsonens gang

Field hockey er en efterårssport. Sæsonen begynder sidst i august, conference-turneringerne afvikles i begyndelsen af november, og NCAA-turneringen spilles midt i november med semifinaler og finale sidst på måneden. Det er en kort, tæt sæson på kunstgræs, hvor holdene ofte spiller to kampe om ugen.

### Sådan afgøres en kamp

Elleve spillere pr. hold, og kampen spilles i **fire kvarterer à 15 minutter** — ikke to halvlege, som mange forbinder med sporten fra Europa. Står kampen lige, forlænges den med sudden victory, og er der stadig ikke fundet en vinder, afgøres den på straffekonkurrence. Mål falder oftest efter et straffehjørne, så specialisterne på dødbolde er værdifulde.

### Legater og niveauer

Division I har godt 80 programmer fordelt på omkring 33 conferences, og et D1-hold må råde over op til 12 fulde legater, som typisk deles ud som delvise. Division II har op til 6,3, mens Division III slet ikke giver sportslegater — men ofte kan tilbyde akademisk støtte og behovsbestemt hjælp. Der spilles NCAA-mesterskab i alle tre divisioner.

### Tidbits

Feltet er internationalt i et omfang, der er usædvanligt selv for NCAA: allerede i 2015 kom mere end 10 procent af alle college-spillere i field hockey fra udlandet, og andelen er vokset siden. Sportsligt har nordøsten og Mid-Atlantic traditionelt domineret — i 2025 vandt Northwestern sit tredje mesterskab efter at have slået North Carolina i semifinalen i forlænget spilletid.

### Kilder

- [NCAA. (n.d.). Division I field hockey.](https://www.ncaa.org/championship/division-i/field-hockey/)
- [USA Field Hockey. (2025, August 25). 2025 NCAA field hockey season preview: Division I.](https://www.usafieldhockey.com/news/2025/august/25/2025-ncaa-field-hockey-season-preview-division-i)
- [ScholarshipStats.com. (n.d.). Field hockey scholarships.](https://scholarshipstats.com/fieldhockey)', 'Danske field hockey-spillere i NCAA – nyheder, profiler og resultater fra college field hockey i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('rugby', 'DK', 'Rugby', '## Rugby i amerikansk college-sport

**Det vigtigste at vide først: college-rugby er ikke ét system, men to.** For kvinder er rugby en af NCAA''s fire nuværende emerging sports — en anerkendt vej mod fuldt mesterskab, med legater efter NCAA''s regler og mesterskabskampe i National Intercollegiate Rugby Association. For mænd er rugby slet ikke en NCAA-sport. Herreholdene spiller under National Collegiate Rugby og Collegiate Rugby Association of America, og varsity-programmerne giver som hovedregel ikke sportslegater.

### Sæsonens gang

15-mands-rugby er en efterårssport. Kampene begynder sidst i august, og mesterskabet afgøres i november — i 2025 med semifinaler 15. november og finaler 22. november på Harvard. Foråret og forsommeren tilhører 7-mands-rugby, hvor National Collegiate Rugbys mesterskab er den største kollegiale rugbybegivenhed i verden.

### Sådan afgøres en kamp

Femten spillere pr. hold og to halvlege à 40 minutter. Et forsøg giver fem point, konverteringen bagefter to, og både straffespark og drop-mål tæller tre. Otte forwards vinder bolden, syv backs skal bruge den — og de to grupper rekrutteres på vidt forskellige kropstyper.

### Niveauer og programmer

58 amerikanske colleges har varsity-rugby: 35 herrehold og 43 damehold, fordelt på NCAA''s tre divisioner, NAIA og enkelte andre. NCAA''s egen oversigt tæller omkring 30 institutioner, der har kvinderugby som emerging sport, og NIRA''s øverste division bestod i 2025 af 13 hold. Kvinderugby er en equivalency-sport, så legaterne kan deles ud i delvise andele.

### Tidbits

Rugby deler emerging sport-status med ridning, flag football og triatlon. Listen er ikke pyntelig: otte sportsgrene er siden 1994 gået hele vejen fra emerging sport til fuldt NCAA-mesterskab — blandt dem roning, ishockey og vandpolo, som alle i dag er selvfølgelige dele af college-landskabet.

### Kilder

- [NCAA. (n.d.). Emerging sports for women.](https://www.ncaa.org/championships/emerging-sports-for-women/)
- [ScholarshipStats.com. (n.d.). Rugby scholarships and college varsity teams.](https://scholarshipstats.com/rugby)
- [The Rugby Breakdown. (n.d.). Tracking: NCAA varsity programs.](https://therugbybreakdown.com/tracking-ncaa-varsity-programs/)
- [National Collegiate Rugby. (2026). NCR partners with the All Women''s Sports Network for the 2026 National 7s Championships.](https://www.ncr.rugby/news/national-collegiate-rugby-partners-with-the-all-womens-sports-network-for-global-broadcast-of-2026-national-7s-championships/)', 'Rugby i amerikansk college-sport – nyheder, profiler og resultater fra NCAA-emerging sport og college-rugby i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('vandpolo', 'DK', 'Vandpolo', '## Vandpolo i NCAA

Vandpolo er en fuldgyldig NCAA-sport for både herrer og kvinder, og den har en detalje, som kun få college-sportsgrene deler: mesterskabet er et National Collegiate-mesterskab. Hold fra Division I, II og III spiller om den samme titel i den samme ottehold-turnering, hvor vinderen findes ved direkte udslagning.

### Sæsonens gang

Kønnene deler kalenderen mellem sig. Herrerne spiller om efteråret og afslutter med mesterskabet i december — i 2026 hos UC San Diego 18.-20. december. Kvinderne spiller om foråret; deres mesterskab blev afgjort i samme bassin 22.-26. april 2026.

### Sådan afgøres en kamp

Syv spillere i vandet ad gangen, heraf en målmand, og kampen spilles i **fire kvarterer à otte minutter**. Angrebene bygges op omkring centerspilleren — på amerikanske rosterlister kaldet "2-meter" eller "hole set" — mens driverne svømmer bolden frem fra siderne.

### Legater og niveauer

77 NCAA-skoler har vandpolo: 42 i Division I (29 herrehold og 37 damehold), 10 i Division II og 25 i Division III, tilsammen omkring 1.900 mandlige og 2.050 kvindelige udøvere. Efter House-forliget kan Division I-programmer fra 2025-26 tildele op til 24 legater inden for et rosterloft på 24 — mod tidligere 4,5 for herrer og 8 for kvinder. Division II har 4,5, og Division III giver ingen sportslegater.

### Tidbits

Vandpolo er selv et eksempel på, hvad en emerging sport kan blive til: sporten kom ind ad den vej for kvinder og har i dag sit eget mesterskab. Sportsligt er tyngdepunktet stadig Californien — UCLA gik ind i 2026-sæsonen som forsvarende herremester for andet år i træk.

### Kilder

- [ScholarshipStats.com. (n.d.). Water polo scholarships.](https://scholarshipstats.com/waterpolo)
- [Collegiate Water Polo Association. (n.d.). NCAA announces sites of the 2026-2028 men''s and women''s water polo championships.](https://collegiatewaterpolo.org/national-collegiate-athletic-association-announces-sites-of-2026-to-2028-national-collegiate-athletic-association-mens-womens-water-polo-championships/)
- [NCAA.com. (2026, April 13). 2026 National Collegiate women''s water polo championship selections.](https://www.ncaa.com/news/waterpolo-women/article/2026-04-13/2026-national-collegiate-womens-water-polo-championship-selections)
- [NCAA. (n.d.). National Collegiate men''s water polo.](https://www.ncaa.org/championship/national-collegiate/mens-water-polo/)', 'Vandpolo i NCAA – nyheder, profiler og resultater fra college-vandpolo i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('faegtning', 'DK', 'Fægtning', '## Fægtning i NCAA

Fægtning har et af de mest usædvanlige mesterskaber i NCAA: der er ingen opdeling i divisioner. Hold fra Division I, II og III kvalificerer sig til det samme National Collegiate-mesterskab og møder hinanden direkte — et lille D3-hold kan altså ende med at fægte mod et stipendiebærende D1-program om den samme titel.

### Sæsonens gang

Vinteren er holdkampenes tid, hvor programmerne mødes i stævner med mange dueller på én dag, og sæsonen kulminerer i marts. I 2026 blev mesterskabet afviklet 19.-22. marts hos Notre Dame med 144 deltagere fra 26 institutioner.

### Sådan afgøres et mesterskab

Der fægtes med tre våben — fleuret, kårde og sabel — og der uddeles individuelle titler i alle seks konkurrencer, altså hvert våben for både herrer og damer. Holdmesterskabet har lige skiftet form: fra 1990 til 2025 blev holdtitlen afgjort på kønnenes samlede point, men fra 2026 uddeles der igen separate holdtitler til herrer og damer. Ændringen løser et gammelt problem — et program med kun et damehold kunne ikke vinde den fælles titel.

### Niveauer og programmer

45 institutioner på tværs af de tre divisioner har fægtning, og de rummer tilsammen omkring 1.400 udøvere. Det er et lille, tæt miljø koncentreret i det nordøstlige USA og omkring et par store universiteter i Midtvesten.

### Tidbits

Notre Dame vandt begge holdtitler i 2026 — og skrev sig dermed ind som den første vinder af det selvstændige damemesterskab i tre våben.

### Kilder

- [NCAA. (n.d.). National Collegiate fencing.](https://www.ncaa.org/championship/national-collegiate/fencing/)
- [USA Fencing. (2026, March 11). 2026 NCAA championships preview: A historic new era begins.](https://www.usafencing.org/news/2026/march/11/2026-ncaa-championships-preview)
- [NCAA.com. (2026, March 10). NCAA men''s and women''s fencing committee selects championships participants.](https://www.ncaa.com/news/fencing/article/2026-03-10/ncaa-mens-and-womens-fencing-committee-selects-championships-participants)
- [NCAA.com. (2026, March 3). Notre Dame wins the 2026 NC men''s and women''s fencing championships.](https://www.ncaa.com/news/fencing/article/2026-03-03/notre-dame-wins-2026-nc-mens-and-womens-fencing-championships)', 'Fægtning i NCAA – nyheder, profiler og resultater fra college-fægtning i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('squash', 'DK', 'Squash', '## Squash i amerikansk college-sport

**Squash er ikke en NCAA-sport.** Den styres af College Squash Association, som er sit eget forbund — men alle CSA''s medlemsinstitutioner er NCAA-medlemmer, og forbundet læner sig tæt op ad NCAA''s regler. Det betyder, at squash på papiret er varsity-sport med træning, holdkampe og nationale mesterskaber, men uden NCAA-mesterskab og uden NCAA''s legatsystem.

### Sæsonens gang

Holdkampene ligger hen over vinteren, og sæsonen samles i de nationale holdmesterskaber i februar. Varsity-holdene fordeles i playoff-divisioner på otte hold — den øverste herredivision, Potter Cup, har dog tolv.

### Sådan afgøres en holdkamp

Ni spillere fra hvert hold møder hinanden i hver sin individuelle kamp, og holdets resultat er summen af de ni. Rosterne tæller typisk 12-14 spillere, så der er dækning ved skader, og nummer ti møder tit modstanderens nummer ti i en kamp uden for pointregnskabet. Pladsen på stigen er dermed hele holdets valuta.

### Niveauer og programmer

37 amerikanske colleges har varsity-squash — 33 herrehold og 32 damehold, med omkring 500 mandlige og 428 kvindelige spillere. Fjorten af skolerne er Division I-institutioner og 23 er Division III, og geografisk er sporten koncentreret i det nordøstlige USA. Kun ganske få CSA-hold kan tilbyde sportslegater: Ivy League-universiteterne og Division III-skolerne må ikke, og de udgør størstedelen af feltet.

### Tidbits

Fraværet af NCAA er ikke et tegn på lille niveau. Det amerikanske college-felt er et af verdens tætteste squashmiljøer, og de bedste holdkampe mellem Harvard, Trinity og Princeton har i årevis afgjort, hvem der reelt er bedst i landet.

### Kilder

- [College Squash Association. (n.d.). College squash recruiting FAQ.](https://csasquash.com/college-squash-recruiting-faq-2/)
- [College Squash Association. (2026). 2026 CSA national team championships.](https://csasquash.com/2026-national-team-championship/)
- [ScholarshipStats.com. (n.d.). Colleges with varsity squash teams.](https://scholarshipstats.com/squash)', 'Squash i amerikansk college-sport – nyheder, profiler og resultater fra college-squash i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('esport', 'DK', 'Esport', '## Esport i amerikansk college-sport

**Esport ligger uden for NCAA.** Der findes intet NCAA-mesterskab i League of Legends, og ingen NCAA-regler at holde sig inden for. I stedet har miljøet bygget sine egne forbund: National Association of Collegiate Esports og National Esports Collegiate Conference, mens spillenes udgivere kører deres egne kredsløb ved siden af — Riot Games'' College League of Legends er det største af dem.

### Sæsonens gang

Sæsonen følger studieåret. Efteråret bruges på ligaspil i konferencerne, foråret på slutspil, og College League of Legends kulminerer i sit mesterskab i forårssemesteret. Fordi kampene spilles online, ligger de fleste opgør på hverdagsaftener — rejsedage er forbeholdt LAN-finalerne.

### Sådan er holdet skruet sammen

Rosterlisten ser anderledes ud end i enhver anden college-sport: spillerne står opført efter titel og rolle, ikke position. I League of Legends er de fem roller top, jungle, mid, bot og support, og et program med flere titler har typisk selvstændige hold i Valorant, Rocket League, Overwatch 2 og Counter-Strike. NECC''s kernetitler tæller også Rainbow Six: Siege, Marvel Rivals og Super Smash Bros.

### Penge og programmer

Mere end 300 nordamerikanske programmer giver økonomisk støtte til deres varsity-spillere, og over 280 skoler tilbyder esportslegater gennem NACE. Beløbene er små sammenlignet med de store boldsportsgrene: gennemsnittet ligger omkring 4.800 dollar om året, mens de bedst finansierede programmer kan komme betydeligt højere op. NECC alene tæller over 500 deltagende colleges og universiteter.

### Tidbits

De største puljer følger de største titler — League of Legends, Valorant og Rocket League — fordi det er dem, skolerne kan fylde en tribune og en stream med. Og fordi der ikke er NCAA-regler, er reglerne skolernes egne: adgangskrav, spilletid og præmiepenge afgøres program for program.

### Kilder

- [National Esports Collegiate Conference. (2026). NECC announces 2026-2027 competition calendar.](https://necc.gg/blogs/news/necc-announces-2026-2027-competition-calendar)
- [Esports Insider. (2026). Esports scholarships in 2026: How gaming can put you through school.](https://esportsinsider.com/esports-scholarships)
- [Liquipedia. (2026). Collegiate League of Legends 2026 championship.](https://liquipedia.net/leagueoflegends/CLOL/2026/Championship)', 'Esport i amerikansk college-sport – nyheder, profiler og resultater fra college-esport i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('lacrosse', 'DK', 'Lacrosse', '## Lacrosse i NCAA

Lacrosse er en af de største holdsportsgrene i amerikansk college-sport målt på antal programmer, og den spilles på alle tre NCAA-niveauer for både herrer og damer. For en europæer er det den mest ukendte af de store — sporten har rødder hos de nordamerikanske oprindelige folk og er stadig tættest på skolerne i nordøst.

### Sæsonens gang

Lacrosse er en forårssport. Grundspillet løber fra februar, og NCAA-turneringerne afgøres i maj. I 2026 spillede 18 herrehold om Division I-titlen fra 6. til 25. maj, mens 29 damehold spillede fra 8. til 24. maj. Princeton vandt herretitlen, Northwestern damernes.

### Sådan afgøres en kamp

Herrer spiller **ti mod ti**, damer **tolv mod tolv**, og begge køn spiller fire kvarterer à 15 minutter — damernes to halvlege blev afskaffet i 2022. Den store forskel er kontakten: herrelacrosse tillader kropstacklinger og hårde stavtacklinger med hjelm og skulderbeskyttelse, mens damelacrosse forbyder kropstacklinger og kun tillader kontrollerede stavtacklinger væk fra hoved og krop.

### Legater og niveauer

Feltet er stort: 77 herrehold i Division I, 82 i Division II og 247 i Division III — og på damesiden 130, 119 og 290. Dertil kommer NAIA og junior colleges. Division I-programmer råder over op til 48 legater på herresiden og 38 på damesiden, Division II over 10,8 og 9,9, mens Division III ikke giver sportslegater.

### Tidbits

Antallet af Division III-programmer er det, der gør sporten særlig: tyngden ligger i de små skoler i nordøst, hvor lacrosse er hovedsporten, og hvor holdene rekrutterer bredt i udlandet — England, Canada og Australien fylder mest.

### Kilder

- [ScholarshipStats.com. (n.d.). Lacrosse scholarships and college programs.](https://scholarshipstats.com/lacrosse)
- [NCAA.com. (2026, May 3). NCAA Division I women''s lacrosse championship subcommittee announces 2026 field.](https://www.ncaa.com/news/lacrosse-women/article/2026-05-03/ncaa-division-i-womens-lacrosse-championship-subcommittee-announces-2026-field)
- [USA Lacrosse. (2026). NCAA 2026 preview: Your guide to the college lacrosse season.](https://www.usalacrosse.com/magazine/college/ncaa-2026-preview-your-guide-college-lacrosse-season)', 'Lacrosse i NCAA – nyheder, profiler og resultater fra college-lacrosse i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('softball', 'DK', 'Softball', '## Softball i NCAA

Softball er kvindesporten med flest programmer i amerikansk college-sport. Den er ikke damebaseball: banen er mindre, kastet er underhånds, og kampen er kortere — men rekrutteringen, sæsonstrukturen og mesterskabet ligner baseballs til forveksling.

### Sæsonens gang

Sæsonen begynder i begyndelsen af februar og slutter først i juni. I 2026 løb Division I-sæsonen fra 5. februar til 5. juni med 309 hold. Slutspillet begynder med 16 regionalstævner i midten af maj, fortsætter i super-regionaler, og de sidste otte hold mødes ved Women''s College World Series i Oklahoma City — i 2026 fra 28. maj til 5. juni, hvor Texas vandt.

### Sådan afgøres en kamp

Syv innings, ikke ni. Pitcheren kaster underhånds fra en kortere afstand end i baseball, og kombinationen af kort bane og hurtige kast gør spillet tættere: en enkelt fejl i infielden afgør ofte kampen.

### Legater og niveauer

1.673 amerikanske colleges har softball, fordelt på NCAA''s tre divisioner, NAIA, junior colleges og et par mindre forbund — tilsammen næsten 35.000 spillere. Division I tæller 310 skoler, Division II 277 og Division III 401. Efter House-forliget er Division I''s legatloft afløst af et rosterloft på 25 spillere, som alle kan få fuldt legat; Division II har 7,2 legater, og Division III giver ingen.

### Tidbits

Women''s College World Series er blandt de bedst besøgte NCAA-mesterskaber overhovedet — Devon Park i Oklahoma City er sportens faste hjem, og finalerne sendes på ESPN i bedste sendetid.

### Kilder

- [ScholarshipStats.com. (n.d.). Softball scholarships and college programs.](https://scholarshipstats.com/softball)
- [NCAA.com. (2026, June 4). Texas wins the 2026 NCAA DI softball championship.](https://www.ncaa.com/news/softball/article/2026-06-04/2026-ncaa-softball-tournament-bracket-schedule-womens-college-world-series-scores)', 'Softball i NCAA – nyheder, profiler og resultater fra college-softball i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('brydning', 'DK', 'Brydning', '## Brydning i NCAA

Brydning er en vinterens sport i USA og en af de mest gennemorganiserede: vægtklasser, dueller mellem skoler og et mesterskab, der fylder en NBA-arena. **Det største nye er kvindernes:** NCAA afviklede sit første damemesterskab i brydning 6.-7. marts 2026 i Coralville, Iowa, og brydning blev dermed NCAA''s 91. mesterskabssport. McKendree vandt den første titel 171-166 over Iowa.

### Sæsonens gang

Dueller og stævner fylder vinteren fra november, conference-mesterskaberne ligger i begyndelsen af marts, og NCAA-mesterskabet afvikles midt i måneden — herrernes Division I-mesterskab blev i 2026 afgjort 19.-21. marts i Cleveland.

### Sådan afgøres en dyst

Der brydes i vægtklasser, og en holddyst er summen af de individuelle kampe. Ved damernes første NCAA-mesterskab blev der kåret mestre i ti klasser fra 103 til 207 pund. En kamp vindes på point, på teknisk overlegenhed eller på fald — og faldet afslutter kampen på stedet, uanset stillingen.

### Legater og niveauer

440 amerikanske colleges har brydning: 433 herrehold og 170 damehold på tværs af NCAA, NAIA og junior colleges, med godt 12.400 mandlige og 2.050 kvindelige brydere. Division I-programmer råder over op til 30 legater pr. køn, Division II over 9 og 10, mens Division III ikke giver sportslegater.

### Tidbits

Damebrydning er en af de hurtigst voksende college-sportsgrene overhovedet — og at den nåede mesterskabsstatus i 2026 er den seneste påmindelse om, at NCAA''s sportsliste ikke er en fast størrelse.

### Kilder

- [NCAA. (2026, March 4). NCAA''s first women''s wrestling championships: What to know.](https://www.ncaa.org/media-center-ncaas-first-womens-wrestling-championships-what-to-know/)
- [NCAA.com. (2026, March 7). McKendree clinches the 2026 NC women''s wrestling championship.](https://www.ncaa.com/news/wrestling-women/article/2026-03-07/mckendree-clinches-2026-nc-womens-wrestling-championship)
- [ScholarshipStats.com. (n.d.). Wrestling scholarships and college programs.](https://scholarshipstats.com/wrestling)', 'Brydning i NCAA – nyheder, profiler og resultater fra college-brydning i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('bowling', 'DK', 'Bowling', '## Bowling i NCAA

Bowling er en NCAA-sport for kvinder, og som fægtning og vandpolo har den ét fælles mesterskab: hold fra Division I, II og III spiller om den samme titel. Herrebowling findes på en del skoler, men uden NCAA-mesterskab.

### Sæsonens gang

Sæsonen løber hen over efteråret og vinteren i stævneform, og mesterskabet afgøres i april. Det 22. NCAA-mesterskab blev spillet 10.-11. april 2026 i Parma Heights, Ohio, med 19 hold — Jacksonville State slog Wichita State i finalen og vandt sin anden titel.

### Sådan afgøres en holdkamp

Det er ikke fem individuelle serier lagt sammen. Mesterskabet bruger **Baker-formatet**, hvor de fem spillere deles om den samme serie og slår hver anden frame — holdet er ét spil, ikke fem. Regionalstævnerne afgøres bedst af tre: femmandsserie, samlet Baker-kegletal og til sidst Baker-matchspil, og selve titlen findes i et bedst-af-syv Baker-opgør.

### Legater og niveauer

37 Division I-skoler, 43 i Division II og 34 i Division III har damebowling. Division I-programmer råder over op til 10 legater, Division II over 5, og Division III giver ingen sportslegater.

### Tidbits

Baker-formatet er grunden til, at college-bowling ser anderledes ud på tv end alt andet bowling: én dårlig frame er hele holdets, og en finale kan vende på to kast.

### Kilder

- [NCAA. (n.d.). National Collegiate bowling.](https://www.ncaa.org/championship/national-collegiate/womens-bowling/)
- [NCAA.com. (2026, April 11). Jax State wins 2026 NC bowling championship.](https://www.ncaa.com/news/bowling/article/2026-04-11/jax-state-wins-2026-nc-bowling-championship)
- [ScholarshipStats.com. (n.d.). Bowling scholarships and college programs.](https://scholarshipstats.com/bowling)', 'Bowling i NCAA – nyheder, profiler og resultater fra college-bowling i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('sejlsport', 'DK', 'Sejlsport', '## Sejlsport i amerikansk college-sport

**Collegesejlsport ligger uden for NCAA.** Den styres af Inter-Collegiate Sailing Association, sejlsportens eget college-forbund, og det er ICSA — ikke NCAA — der afvikler de nationale mesterskaber. Sporten er varsity på en lang række skoler, med trænere, bådpark og fulde kapsejladsprogrammer.

### Sæsonens gang

Der sejles både efterår og forår. Efteråret bruges på ranglistestævner, mens de nationale mesterskaber ligger i maj. I 2026 blev fleet race-mesterskaberne sejlet i St. Petersburg i Florida: kvindernes fra 15. maj, det åbne fra 19. maj, hvert med 36 hold delt i to grupper, hvor de ni bedste i hver gik videre til de afsluttende dage.

### Sådan er sporten skruet sammen

ICSA kårer nationale mestre i syv kategorier: åben og kvinders fleet race, åben og kvinders team race, herrer og kvinders singlehanded samt match race. "Åben" betyder mixed — mænd og kvinder sejler i samme både og mod hinanden, hvilket er sjældent i amerikansk skolesport. Team racing, hvor tre både pr. skole sejler taktisk mod tre andre, er sportens mest særegne disciplin.

### Niveauer og programmer

Programmerne er koncentreret på øst- og vestkysten og omkring de store søer, og de bedste ligger på skoler med lange maritime traditioner. Kvindernes team race-mesterskab er nyt — det blev indstiftet i 2022 — og Stanford vandt det i 2026, mens Brown vandt det åbne fleet race-mesterskab for første gang siden 1948.

### Kilder

- [Inter-Collegiate Sailing Association. (n.d.). Championships.](https://www.collegesailing.org/championships/coed)
- [College Sailing National Championships. (2026). National championship regatta.](https://nationals.collegesailing.org/)
- [Inter-Collegiate Sailing Association. (n.d.). Women''s team race championships.](https://www.collegesailing.org/championships/womens-team-race)', 'Sejlsport i amerikansk college-sport – nyheder, profiler og resultater fra college-sejlsport i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('skydning', 'DK', 'Skydning', '## Skydning i amerikansk college-sport

Skydning dækker to nært beslægtede college-sportsgrene med hver sit forbund. **Riffel er NCAA-sport** med ét mesterskab for alle divisioner — og en sjældenhed i amerikansk skolesport: mænd og kvinder skyder i samme konkurrence om de samme titler. Formelt er riffel registreret som en herresport i NCAA''s regelværk, men den har været mixed siden 1980. **Pistol er ikke NCAA-sport**; de kollegiale pistolmesterskaber afvikles af NRA.

### Sæsonens gang

Riffelsæsonen løber hen over vinteren, og NCAA-mesterskabet afgøres i marts. I 2026 var Ohio State vært 13.-14. marts: smallbore med tre stillinger den første dag, luftgevær den anden. West Virginia vandt for andet år i træk — universitetets 21. riffeltitel. Pistolskytterne mødtes samme forår til det kollegiale mesterskab i Columbia, Missouri, hvor Ohio State vandt.

### Sådan afgøres en konkurrence

Riffelmesterskabet er en sammenlagt score over to dage: smallbore skydes i tre stillinger — liggende, stående og knælende — mens luftgevær kun skydes stående. Otte hold kvalificerer sig, og både hold- og individuelle titler afgøres på aggregatet. På pistolsiden skydes der i discipliner som frempistol, standardpistol og luftpistol.

### Niveauer og programmer

Feltet er lille og tæt: NCAA-mesterskabet i 2026 havde otte kvalificerede hold, blandt dem Kentucky, Nebraska, TCU, West Virginia, Ole Miss, Alaska-Fairbanks, Naval Academy og Georgia Southern. Netop fordi konkurrencen er mixed og feltet smalt, er internationale skytter en fast bestanddel af de bedste programmer.

### Tidbits

NRA vendte i 2026 tilbage til collegepistol efter syv års pause — et forbund, der havde ligget stille, mødtes igen med resten af skydesporten på samme bane samme weekend.

### Kilder

- [NCAA.com. (2026, March 14). West Virginia wins 2026 NCAA rifle championship.](https://www.ncaa.com/news/rifle/article/2026-03-14/west-virginia-wins-2026-ncaa-rifle-championship)
- [NCAA.com. (2026, February 23). 2026 National Collegiate men''s and women''s rifle selections.](https://www.ncaa.com/news/rifle/article/2026-02-23/2026-national-collegiate-mens-and-womens-rifle-selections)
- [NRA Shooting Sports USA. (2026). Ohio State captures 2026 intercollegiate pistol crown as NRA returns to the range.](https://www.ssusa.org/content/ohio-state-captures-2026-intercollegiate-pistol-crown-as-nra-returns-to-the-range/)', 'Skydning i amerikansk college-sport – nyheder, profiler og resultater fra college-riffel og -pistol i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('skisport', 'DK', 'Skisport', '## Skisport i NCAA

NCAA-ski er bygget anderledes end enhver anden vintersport i USA: **alpint og langrend er det samme hold**, mænd og kvinder scorer til den samme titel, og der findes kun ét mesterskab på tværs af divisionerne. Et universitet vinder altså ikke på slalom alene — det skal have både fartløbere og langrendsløbere.

### Sæsonens gang

Sæsonen løber gennem vinteren med regionale stævner, og mesterskabet afgøres i marts. I 2026 blev det afviklet 11.-14. marts i Utah: alpint i Utah Olympic Park i Park City, langrend i Soldier Hollow. Utah vandt for andet år i træk — programmets 18. NCAA-titel.

### Sådan afgøres et mesterskab

Der køres otte konkurrencer: slalom og storslalom for begge køn, og klassisk og fri stil i langrend for begge køn. 74 mænd og 74 kvinder udtages regionalt — to regioner i alpint, tre i langrend — og hver skole må højst stille med tolv løbere, tre pr. køn pr. disciplin. Pointene lægges sammen på tværs af det hele.

### Niveauer og programmer

Feltet er koncentreret i Rocky Mountains, New England og Alaska, hvor sneen er, og det er blandt de mest internationale i college-sporten: norske, svenske og finske løbere fylder meget på de bedste hold, netop fordi den nordiske træningskultur passer direkte ind i formatet.

### Tidbits

Kombinationen af alpint og langrend i én holdscore er unik for USA. Ingen andre steder i verden afgøres et universitetsmesterskab på, at den samme skole både kan køre storslalom og gå klassisk.

### Kilder

- [NCAA.com. (2026, March 4). 2026 NCAA skiing championships: Schedule, selections, results, how to watch.](https://www.ncaa.com/news/skiing/article/2026-03-04/2026-ncaa-skiing-championships-schedule-selections-results-how-to-watch)
- [NCAA.com. (2026, March 14). Utah wins 2026 NCAA skiing championship.](https://www.ncaa.com/news/skiing/article/2026-03-14/utah-wins-2026-ncaa-skiing-championship)
- [NCAA.com. (2026, March 4). NC men''s and women''s skiing committee selects 2026 championship field.](https://www.ncaa.com/news/skiing/article/2026-03-04/nc-mens-and-womens-skiing-committee-selects-2026-championship-field)', 'Skisport i NCAA – nyheder, profiler og resultater fra college-ski i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('triatlon', 'DK', 'Triatlon', '## Triatlon i amerikansk college-sport

Triatlon er en af NCAA''s fire nuværende emerging sports for kvinder — en anerkendt sport på vej mod fuldt mesterskab, men ikke fremme endnu. Den blev optaget i 2014, og i 2025-26 har 42 institutioner varsity-triatlon, heraf 14 i Division II. Der findes ingen tilsvarende NCAA-vej for mænd.

### Sæsonens gang

Triatlon er en efterårssport i USA, hvilket vender kalenderen på hovedet for en europæisk triatlet. Sæsonen kulminerer i november, og USA Triathlon afvikler mesterskabsløbet for alle tre NCAA-divisioner — i 2026 i Tempe, Arizona.

### Sådan afgøres et løb

College-triatlon køres på **sprintdistancen med drafting tilladt**: 750 meter svøm i åbent vand, 20 kilometer på cykel og 5 kilometer løb. At drafting er tilladt, ændrer sporten fundamentalt — cykelfeltet kører taktisk i grupper som i landevejscykling i stedet for hver for sig, og løbet afgøres derfor oftest på de sidste fem kilometer.

### Niveauer og programmer

Antallet af programmer vokser støt, og Conference Carolinas blev i efteråret 2026 den første NCAA-konference til at sponsorere sporten samlet. Vejen videre går gennem NCAA''s emerging sports-proces, hvor en sport skal have et bestemt antal værtsskoler for at få sit eget mesterskab.

### Kilder

- [USA Triathlon. (n.d.). NCAA triathlon.](https://www.usatriathlon.org/multisport/ncaa-triathlon)
- [NCAA. (n.d.). Emerging sports for women.](https://www.ncaa.org/championships/emerging-sports-for-women/)
- [NCAA. (2026, May 4). Conference Carolinas announces the addition of women''s triathlon.](https://www.ncaa.org/news/2026/5/4/media-center-conference-carolinas-announces-the-addition-of-womens-triathlon.aspx)', 'Triatlon i amerikansk college-sport – nyheder, profiler og resultater fra college-triatlon i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('hestepolo', 'DK', 'Hestepolo', '## Hestepolo i amerikansk college-sport

Hestepolo på college styres af United States Polo Association gennem forbundets Intercollegiate/Interscholastic-program. **Det er ikke en NCAA-sport**, men det er organiseret konkurrence med regionale kredse og et nationalt mesterskab — og det er en af de få college-sportsgrene, hvor holdene bruger skolens egne heste.

### Sæsonens gang

Sæsonen følger studieåret og afgøres i det tidlige forår: de nationale intercollegiate-mesterskaber blev i 2026 spillet 16.-22. marts, efter at de bedste herre- og damehold havde kvalificeret sig gennem deres regioner.

### Sådan afgøres en kamp

College-polo spilles **i arena, ikke på græsbane**, efter USPA''s arenaregler. Det betyder tre spillere pr. hold i stedet for fire, en mindre bane med bander og en større, blødere bold. Holdene deler hestene efter et "split string"-princip, hvor begge hold rider på den samme pulje — netop for at kampen afgøres af spillerne og ikke af, hvem der har de dyreste heste.

### Niveauer og programmer

Over 35 etablerede intercollegiate-programmer fordeler sig på 15 herrehold og 26 damehold i fire regioner. Feltet er lille, men stabilt, og USPA driver desuden et internationalt intercollegiate-opgør, hvor amerikanske collegespillere møder udenlandske.

### Kilder

- [United States Polo Association. (n.d.). Intercollegiate.](https://www.uspolo.org/association/programs/intercollegiate-interscholastic/intercollegiate)
- [United States Polo Association. (n.d.). Division I men''s national intercollegiate championship.](https://www.uspolo.org/calendar/tournaments/division-i-mens-national-intercollegiate-championship)
- [United States Polo Association. (2026). USA roster announced for 2026 international intercollegiate challenge cup.](https://www.uspolo.org/news-social/news/usa-roster-announced-for-2026-international-intercollegiate-challenge-cup)', 'Hestepolo i amerikansk college-sport – nyheder, profiler og resultater fra college-polo i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO pages (slug, country, title, content, meta_description, published, kind, category, updated_at)
VALUES ('andet', 'DK', 'Andre sportsgrene', '## Andre sportsgrene i NCAA

NCAA afvikler mesterskaber i omkring 24 sportsgrene, og danske atleter kan findes i mange af dem. Fra lacrosse til fægtning, fra vandpolo og sejlsport til skisport og wrestling — mulighederne er bredere, end de fleste tror. Udbuddet vokser stadig: kvindebrydning fik sit første NCAA-mesterskab i 2026, og acrobatics & tumbling samt stunt følger fra 2027.

### Holdsport og individuelle stævner

Sportsgrenene i denne kategori afgøres på vidt forskellige måder. Nogle, som lacrosse og vandpolo, er rene holdkampe mellem to skoler. Andre, som fægtning, wrestling og skisport, fungerer som "meets", hvor de enkelte dueller eller løb hver giver point, og skolernes samlede pointsum afgør holdsejren — på samme måde som i svømning og atletik. Det betyder, at en skole kan vinde et stævne på bredde og pålidelighed frem for på enkelte stjerner.

### Tidbits

Flere af NCAAʼs mindre sportsgrene har færre ansøgere til stipendierne, hvilket kan være en reel fordel for danske atleter med talent inden for en nichesport. Wrestling (amerikansk brydning) er fx en stor og traditionsrig college-sport, og lacrosse vokser hastigt. Efterhånden som kendskabet til NCAA-systemet breder sig i Danmark, ser vi atleter fra stadig flere sportsgrene tage springet over Atlanten.

### Kilder

- [NCAA. (2026, 16. januar). NCAA to add four new championships.](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-to-add-four-new-championships.aspx)
- [NCAA. (2026, 4. marts). NCAA''s first women''s wrestling championships: What to know.](https://www.ncaa.org/news/2026/3/4/media-center-ncaas-first-womens-wrestling-championships-what-to-know.aspx)', 'Danske atleter i øvrige NCAA-sportsgrene – nyheder og profiler fra niche-sportsgrene i USA.', 1, 'sport', NULL, datetime('now'))
ON CONFLICT(slug, country) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'sport',
  updated_at = datetime('now');

INSERT INTO site_content (key, country, value, updated_at) VALUES ('seedhash.sport', 'DK', 'ffdc2ad87ee70739c58c45a1f16f507327e010852973e524198f1f82eb108cc5', datetime('now'))
ON CONFLICT(key, country) DO UPDATE SET value = excluded.value, updated_at = datetime('now');
