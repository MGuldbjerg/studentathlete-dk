-- Sport pillar texts: sync D1 with the new code defaults (2026-09-15).
--
-- WHY THIS FILE EXISTS. `resolveSportContent()` reads the D1 row over the code
-- default (`pillar: db.content || base.pillar`). All 33 Danish sport pages HAVE
-- a published row in `pages(kind='sport', country='DK')`, seeded from the old
-- code default. Deploying the new texts therefore changes NOTHING on the Danish
-- site — only the UK site, which has no rows at all.
--
-- CHECKED BEFORE WRITING THIS FILE: all 33 rows were byte-identical to the old
-- code default (git HEAD 132159e), so there are no hand-edits to lose. Repeat
-- that check if this file is run later than 2026-09-15.
--
-- This is a PRODUCTION WRITE of reader-facing text. Run it only after Mikkel
-- has approved it:
--   npx wrangler d1 execute studentathlete-dk --remote --file db/update-sport-pages-2026-09-15.sql
--
-- Only `content` and `updated_at` are touched. Title, meta, published, kind and
-- category are left alone. The UK has no rows and needs none: there the code
-- default wins, as it should.

UPDATE pages SET content = '## Dansk football i NCAA

Amerikansk football er den sportsgren, der har åbnet flest døre for danske atleter i USA. Særligt kicker- og punter-positionen er blevet en dansk specialitet — det kræver præcision og is i maven, og en dansk fodboldopvækst træner benet i at ramme bolden rent. Det er en evne, som flere college-programmer aktivt rekrutterer efter i udlandet.

### Sæsonens gang

College football-sæsonen er kort og intens. Den regulære sæson løber fra slutningen af august til slutningen af november med typisk 12 kampe — næsten altid spillet om lørdagen, hvor college football ejer dagen (NFL spiller om søndagen). Først i december afgøres conference-mesterskaberne, og derefter følger bowl-kampe og College Football Playoff, der siden 2024 har 12 hold og slutter med et nationalt mesterskab i januar. Foråret bruges til styrketræning og "spring practice", hvor holdet bygges op til næste sæson.

### Formatet

Fire kvarterer à 15 minutter, men uret stoppes så ofte, at en kamp let tager over tre timer. Et hold har fire forsøg til at flytte bolden ti yards; lykkes det, får det fire nye. Touchdown giver seks point plus et forsøg på et eller to ekstra, et field goal tre. Det afgørende for en dansk læser er, at holdet reelt er tre hold: angreb, forsvar og "special teams", som kun er på banen ved spark. Det er dér, kickere og puntere hører hjemme — en specialistrolle med få spillere om buddet, og netop derfor den realistiske indgang for en dansker, der starter sent.

### Stipendier og trupstørrelse

Frem til 2025 måtte et Division I-hold (FBS) give 85 fulde football-stipendier, men efter det store "House"-forlig i 2025 er der i stedet indført et samlet trupsloft på 105 spillere, hvor alle i princippet kan modtage stipendium. Den klassiske "walk-on" uden stipendium er dermed på vej ud — ingen er formelt forbudt, men hver plads tæller nu mod loftet. Hertil er selve spilleberettigelsen lagt om: den gamle "fire sæsoner inden for fem år" og redshirt-ordningen erstattes gradvist af en aldersbaseret model (op til fem års eligibility). Læs mere i [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

105 er det største truploft i college-sporten, og det er stadig et loft: en kicker konkurrerer ikke med 104 andre om sin plads, men med de to-tre andre specialister på holdkortet. Uden for forligets skoler, i Division II og i NAIA gælder de gamle stipendieregler videre, og Division III giver ingen idrætsstipendier — se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

College football er delt i to niveauer inden for Division I, og forskellen er større end navnene antyder: **FBS** er det, man ser på tv, med bowl-kampe og College Football Playoff, mens **FCS** har sit eget slutspil og færre stipendier. Derunder ligger Division II, Division III og NAIA, som alle spiller football med egne mesterskaber.

Conference-tilhørsforholdet har flyttet sig voldsomt i de senere år, fordi tv-aftaler har trukket skoler på tværs af landet ind i nye conferences — en skole på vestkysten kan i dag spille i en conference, hvis øvrige hold ligger midt i USA. For spilleren betyder det rejsetid og kampe sent om aftenen. Og football har det mest berømte eksempel på en **independent** i amerikansk sport: Notre Dame spiller uden conference i football, med sin egen tv-aftale og sit eget kampprogram, mens skolens øvrige hold spiller i en almindelig conference. Det er den klareste illustration af, at conference-tilhørsforhold følger sporten, ikke skolen.

### Vejen til prof

NFL-draften har syv runder, og det store flertal af college-spillere bliver aldrig kaldt op. Mange får i stedet en kontrakt som udraftet spiller og skal spille sig på holdet gennem træningslejren. For danskere er specialistpositionerne den realistiske vej, og de har båret: Morten Andersen kom gennem college som All-American kicker og endte i Pro Football Hall of Fame, og Hjalte Froholdt gik fra Danmark via Arkansas til NFL som offensive lineman.

Det er værd at holde proportionerne: college football er for de allerfleste fire år med sporten og en uddannelse, ikke en venteposition før NFL.

### Tidbits

Morten Andersen — "The Great Dane" — er den mest berømte dansker i amerikansk football og sidder i Pro Football Hall of Fame; han var i en årrække NFL''s mestscorende spiller gennem tiderne (i dag nummer to, efter Adam Vinatieri passerede ham i 2018) og kom selv gennem college som All-American kicker på Michigan State. En nyere profil er Hjalte Froholdt, der gik fra Danmark via University of Arkansas til NFL som offensive lineman. Stemningen er enorm: Michigans stadion "The Big House" rummer 107.601 tilskuere, flere end nogen by mellem København og Aarhus. Rekrutteringskalenderen har sin egen dramatik: den tidlige underskrivningsperiode i december er i dag den vigtigste, mens den traditionelle "National Signing Day" i februar stadig følges tæt.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal), som i football har ændret rekruttering fundamentalt.

### Kilder

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)
- [CBS Sports. (2025). NCAA removes scholarship limits, aligns with House settlement as roster sizes evolve.](https://www.cbssports.com/college-football/news/ncaa-removes-scholarship-limits-aligns-with-house-settlement-as-roster-sizes-evolve-in-new-college-sports-era/)
- [Sports Illustrated. (2025). College Football Playoff remains 12 teams in 2026.](https://www.si.com/college-football/playoffs/cfp-makes-decision-expansion-2026)
- [Pro Football Hall of Fame. (2017). Morten Andersen.](https://www.profootballhof.com/players/morten-andersen)', updated_at = datetime('now')
 WHERE slug = 'football' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk basketball i NCAA

Basketball har i de seneste år set en stigende interesse fra danske atleter, der drømmer om at spille på højt niveau i USA. Den danske liga giver et godt fundament, og flere spillere har gjort springet til NCAA Division I og II.

### Sæsonens gang

NCAA basketball-sæsonen begynder i november og kulminerer med March Madness — det legendariske slutspil i marts og april. Holdene spiller typisk 30-35 kampe i den regulære sæson, fordelt på ikke-conference-kampe i efteråret og et tæt conference-program hen over vinteren. Conference-turneringerne i starten af marts afgør de sidste billetter til det store slutspil.

### Formatet

Slutspillet er en knockout-turnering, der spilles i én lang weekend-rytme over tre uger: taber man én kamp, er man ude. Holdene seedes 1 til 16 i fire regioner, og hvert år overrasker en lavtseedet "Cinderella"-skole ved at slå favoritterne. Faserne hedder Sweet Sixteen, Elite Eight og Final Four, og det hele afsluttes med en finale, der trods tidsforskellen også har sit danske publikum. Feltet har været på 68 hold, men NCAA besluttede i 2026 at udvide både herrernes og kvindernes turnering til 76 hold fra sæsonen 2026-27.

### Stipendier og trupstørrelse

Basketball var historisk en **headcount-sport**: ethvert stipendium tælte som et helt, uanset størrelse, så trænerne gav i praksis kun fulde stipendier — 13 på herresiden, 15 på kvindesiden. Efter House-forliget i 2025 er det system væk for de Division I-skoler, der tilsluttede sig, og erstattet af et truploft på **15 spillere** for begge køn, hvor skolen frit kan fordele støtten, også i delvise andele.

For en dansk spiller er den praktiske konsekvens, at truppen er lille, og at hver plads er dyr. Femten pladser betyder, at et program ikke henter nogen "for at se, hvordan det går" — man rekrutteres til en rolle. Uden for forligets skoler og i Division II gælder de gamle regler videre, og Division II er i den forbindelse værd at tage alvorligt: niveauet er højt, delstipendier kan kombineres med akademisk støtte, og flere danskere spiller der. Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Basketball er den sport, hvor conferencen betyder allermest for, hvad en sæson er værd. Hver conference afholder sin egen turnering i marts, og **vinderen får en automatisk plads i NCAA-turneringen uanset resten af sæsonen** — det er derfor en skole fra en lille conference kan spille sig ind ved at vinde tre kampe på fire dage. De resterende pladser uddeles af en udvælgelseskomité på baggrund af styrken i kampprogrammet, og dér vejer en stærk conference tungt: hold fra de største conferences kommer med på en god sæson, hold fra de mindste skal som regel vinde turneringen.

Independents er efterhånden sjældne i basketball, netop fordi et hold uden conference hverken har en automatisk plads eller et fast kampprogram at måles på. Når en dansker vælger mellem to tilbud, er spørgsmålet om conferencens styrke derfor ikke prestige — det er direkte adgang til marts.

### Vejen til prof

NBA-draften har kun to runder, og langt de fleste college-spillere bliver aldrig draftet. For danske og europæiske spillere er den realistiske vej som regel en anden: professionel kontrakt i Europa efter endt uddannelse, eventuelt via NBA''s G League. Det gør college-ruten til noget andet end i USA, hvor draften er målet — her er den fire år med topkonkurrence og en grad, der stadig gælder, hvis basketballen ikke rækker hele vejen.

Christian Drejer blev i 2004 den første dansker draftet til NBA efter sin tid på Florida, og det er stadig undtagelsen snarere end reglen.

### Tidbits

College basketball har en helt anden stemning end de professionelle ligaer: studenter-sektioner, der står op hele kampen, marchorkestre og rivaliseringer, der går generationer tilbage. Turneringen er så uforudsigelig, at den årlige "bracket"-konkurrence — hvor man forsøger at gætte alle resultater — aldrig i historien er blevet ramt perfekt. Danske spillere roses ofte for deres alsidighed, holdspilsmentalitet og taktiske forståelse, som amerikanske trænere vurderer højt. To danske college-pionerer rager op: Christian Drejer spillede for Florida Gators og blev i 2004 den første dansker nogensinde, der blev draftet til NBA, mens Inge Nissen vandt to nationale mesterskaber med Old Dominion (1979 og 1980 — dengang under AIAW, forløberen for NCAA''s kvindeturnering) og siden er optaget i Women''s Basketball Hall of Fame.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (2026, 7. maj). NCAA basketball tournaments expanding to 76 teams: What to know.](https://www.ncaa.org/sports/2026/5/7/ncaa-basketball-tournaments-expanding-to-76-teams-what-to-know.aspx)
- [NCAA. (2026, 7. maj). How the 2027 expanded NCAA tournament and March Madness brackets will work.](https://www.ncaa.com/news/basketball-men/article/2026-05-07/how-2027-expanded-ncaa-tournament-and-march-madness-brackets-will-work)
- [Women''s Basketball Hall of Fame. (2012). Inge Nissen.](https://wbhof.com/member/inge-nissen/)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'basketball' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk baseball i NCAA

Baseball er en nichesport i Danmark, men det lille danske baseballmiljø har alligevel produceret atleter, der kan konkurrere på NCAA-niveau. Den voksende interesse for sporten har åbnet døre for danske talenter.

### Sæsonens gang

College baseball-sæsonen løber fra midten af februar til juni — et af de mest intense programmer i NCAA med op til 56 kampe i den regulære sæson. Holdene spiller ofte tre kampe på en weekend mod samme modstander (en "series"), så pitching-staben skal være dyb. Sæsonen kulminerer med et regionalt slutspil og til sidst College World Series i Omaha, Nebraska, hvor de otte bedste hold mødes foran fyldte tribuner.

### Formatet
College baseball spilles med aluminiums- og kompositbat (BBCOR-godkendte) i stedet for de træbat, der bruges i professionel baseball. Det giver sportens helt egen lyd — et skarpt "ping" i stedet for et "knæk" — og lidt mere kraft, hvilket gør college-kampene højtscorende og hurtige.

### Stipendier og trupstørrelse

Baseball var historisk det tydeligste eksempel på en **equivalency-sport**: et Division I-program delte blot 11,7 stipendier ud over en trup på 30 spillere eller flere, så et fuldt stipendium var sjældent, og de fleste havde en brøkdel. Det ændrede House-forliget for de skoler, der tilsluttede sig — stipendieloftet er væk og erstattet af et **truploft på 34 spillere**, som alle i princippet kan få fuld støtte.

Det er en stor ændring i en sport, der er berygtet for tynd finansiering, men den gælder kun forligets skoler. Uden for dem, og i hele Division II, kører den gamle equivalency-regning videre; Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Conferencen vejer tungt i baseball, fordi sæsonen er så lang: hovedparten af kampene spilles i weekendserier mod conference-modstandere, og conference-turneringen i maj giver en automatisk plads i NCAA-slutspillet. Resten af feltet udvælges nationalt, og dér tæller geografi: programmer i den varme sydstat spiller udendørs fra februar og opbygger stærkere resultatlister end nordlige skoler, der stadig venter på vejret.

Enkelte skoler spiller baseball som independents uden conference og skal både stykke et kampprogram sammen og fortjene en at-large-plads på resultater alene.

### Vejen til prof

Baseball har den dybeste professionelle fødekæde af nogen college-sport. **MLB-draften** har 20 runder, afvikles i juli, og amerikansk college-baseball er dens største enkeltkilde af spillere — med et omfattende minor league-system under sig, der optager mange flere. For en dansk spiller er den realistiske ambition som regel college-opholdet i sig selv frem for draften, men ruten findes og er usædvanligt veltrådt.

### Tidbits

Softball og baseball er voksende sportsgrene i Danmark, og med flere unge, der tager sporten op, kan vi forvente at se flere danskere på amerikanske college-hold i de kommende år.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/news/2025/6/23/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits.aspx)
- [NCSA. (2025). New NCAA scholarship and roster limits for 2025-26.](https://www.ncsasports.org/blog/ncaa-scholarship-roster-limits-2024)

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'baseball' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk fodbold i NCAA (soccer)

Fodbold — eller soccer, som det hedder i USA — er en af de mest populære veje for danske atleter til amerikanske universiteter. Med et af verdens stærkeste ungdomssystemer har danske fodboldspillere et naturligt forspring.

### Sæsonens gang

NCAA soccer-sæsonen er kort og intens: kvinder og herrer spiller begge i efteråret, fra august til november, med omkring 18-20 kampe presset sammen på få måneder. Det betyder ofte to kampe om ugen og stor belastning på kroppen. NCAA-slutspillet (hvor finalestævnet kaldes College Cup) har 48 hold hos herrerne og 64 hold hos kvinderne og afgøres i begyndelsen af december. Foråret bruges til individuel udvikling, styrketræning og uofficielle forårsturneringer.

### Formatet

College soccer har sine egne særregler, der overrasker europæere. På de fleste niveauer — kvindefodbold og de lavere divisioner — må en spiller, der er skiftet ud, komme ind igen senere i kampen, og der skiftes generelt langt mere end i europæisk fodbold, hvilket gør spillet hurtigere og mere fysisk (herrernes Division I afskaffede dog gen-indskiftning i 2024 for at ligne FIFA-reglerne mere). Uafgjorte kampe i den regulære sæson kan ende med kort forlænget spilletid, og i slutspillet afgøres det hele til sidst på straffespark.

### Stipendier og trupstørrelse

Fodbold er en af de sportsgrene, hvor reglerne blev lagt fuldstændig om 1. juli 2025. For de Division I-skoler, der tilsluttede sig House-forliget, findes de gamle stipendielofter ikke længere; i stedet er der et truploft på **28 spillere** pr. hold, og skolen må i princippet give stipendium til alle 28. Det lyder som en gevinst, og for nogle er det — men truploftet skærer også i den anden ende: en bred amerikansk trup på 35 spillere skal nu ned på 28, og det er de marginale pladser, der forsvinder.

Vigtigt for en dansk læser: **det gælder kun de Division I-skoler, der har tilsluttet sig.** Skoler uden for forliget kører videre på de gamle stipendielofter, Division II uddeler som før delstipendier efter equivalency-modellen — altså en pose penge fordelt på mange spillere, ikke et fuldt stipendium til hver — og Division III giver slet ingen idrætsstipendier, kun almindelig studiestøtte og legater. Forskellen er stor nok til at være hele valget værd at forstå, inden man skriver under: [se divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

En ting, der forvirrer næsten alle europæere: **en skoles conference er ikke den samme i alle sportsgrene.** Ikke alle conferences udbyder fodbold, så et universitet, hvis hovedconference ikke har herrefodbold, spiller sin fodbold i en helt anden conference. Det er derfor, man kan møde et hold, hvis football-program ligger ét sted og hvis soccer-program ligger et andet. Nogle få skoler har slet ingen conference i sporten og spiller som **independents** — de skal selv stykke et kampprogram sammen og kan ikke vinde en conference-titel, så vejen til slutspillet går gennem en at-large-plads, der tildeles på resultater.

Det har praktisk betydning for en spiller: conferencen afgør, hvem man møder hver uge, hvor langt man rejser, og hvor stærk en automatisk slutspilsplads er værd. Danske fodboldspillere lander overvejende højt i systemet — omkring syv ud af ti af de danske fodboldspillere, vi følger, er på Division I-hold, hvilket er en markant anden fordeling end for eksempel de britiske spillere, der i overtal går til Division II.

### Vejen til prof

College soccer er en reel, men ikke automatisk, vej til professionel fodbold. På herresiden findes **MLS SuperDraft** stadig — den blev afholdt i december 2025 for 2026-sæsonen — men den er langt fra den eneste indgang: klubberne henter i stigende grad spillere direkte, og en draftplads er ingen kontraktgaranti. På kvindesiden er billedet grundlæggende anderledes efter 2024: **NWSL afskaffede sin draft** i den nye overenskomst og blev dermed den første store amerikanske liga uden draft, så spillere nu selv forhandler med klubberne som frie agenter.

For danske spillere er den mest almindelige rute en anden end begge dele: hjem til europæisk klubfodbold med en amerikansk universitetsgrad i baglommen.

### Tidbits

Kvindefodbold er enormt i USA og i mange år bygget op netop omkring college-systemet — flere stjerner fra det amerikanske VM-vindende landshold er gået vejen gennem NCAA. Den danske fodboldtradition med fokus på boldbehandling, positionsspil og taktisk disciplin passer godt til college soccer, og mange danske spillere opnår startpladser fra dag ét. Fodbold er efter StudentAthlete.dk''s egen optælling blandt de sportsgrene, der sender flest danskere til NCAA — på tværs af herre- og kvindehold ligger danske spillere på rosters fra Division I til Division III over hele USA, selvom de største danske fodboldtalenter typisk går den professionelle vej herhjemme i stedet for over Atlanten.

Skifter man undervejs, foregår det gennem [transfer-portalen](/viden/transfer-portal), og et år på bænken eller en skadessæson behøver ikke koste et spilleår — se [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (2024, 18. april). Substitution rules changes approved for DI men''s soccer.](https://www.ncaa.org/news/2024/4/18/media-center-substitution-rules-changes-approved-for-di-mens-soccer.aspx)
- [NCAA. (n.d.). Road to the championship: Men''s soccer (College Cup).](https://www.ncaa.com/championships/soccer-men/d1/road-to-the-championship)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)
- [Major League Soccer. (2025). 2026 MLS SuperDraft rules and regulations.](https://www.mlssoccer.com/news/2026-mls-superdraft-rules-and-regulations)
- [NWSL Players Association. (2024, 22. august). NWSL players announce groundbreaking CBA, first American league to eliminate the draft.](https://www.nwslplayers.com/news/nwsl-players-announce-groundbreaking-cba,-first-american-league-to-eliminate-the-draft-)', updated_at = datetime('now')
 WHERE slug = 'fodbold' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk svømning i NCAA

Danmark har en stærk svømmetradition, og NCAA tilbyder en unik mulighed for danske svømmere til at kombinere sport på højt niveau med en amerikansk universitetsuddannelse. Flere danske svømmere har opnået imponerende resultater i college-regi.

### Sæsonens gang

College-svømning løber fra oktober til marts, med conference-mesterskaberne i februar og NCAA Championships i marts som sæsonens højdepunkt. Træningen er intensiv — op til 20 timer om ugen i vandet plus styrketræning. Den lange opbygning er tilrettelagt med "tapering", så svømmerne topper præcis til mesterskaberne.

### Formatet

I et "dual meet" møder to skoler hinanden, og selvom hver svømmer kæmper individuelt, er det holdets samlede pointsum, der afgør sejren. I hver disciplin tildeles point efter placering — for eksempel 9 point for førstepladsen, derefter 4, 3, 2 og 1 til de næste — og stafetterne giver dobbelt op. Et hold kan altså vinde stævnet uden at have den hurtigste enkeltsvømmer, hvis bredden er stor nok. Udspring tæller med i den samlede score på lige fod med svømningen. Til de store mesterskaber stiller mange hold op samtidig, og pointene lægges sammen på tværs af alle discipliner.

### Stipendier og trupstørrelse

Svømning er en af de sportsgrene, hvor House-forliget gjorde mest ondt. For de Division I-skoler, der tilsluttede sig, er de gamle stipendielofter afskaffet og erstattet af et **truploft på 30 svømmere og udspringere tilsammen** — og det er et lille tal for en sport, hvor et program skal dække alle fire svømmearter, alle distancer, stafetter og udspring. Mange amerikanske hold havde rosters langt over 30 og har skullet skære. Til gengæld må skolen give stipendium til alle 30, hvor den før skulle dele en begrænset pulje ud.

Uden for forligets skoler og i Division II gælder equivalency-modellen som hidtil: én samlet pulje delt ud i brøkdele, så et fuldt stipendium er sjældent, og de fleste svømmere har en blanding af idrætsstøtte, akademiske legater og egenbetaling. Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Conferencen sætter hverdagen i svømning — dual meets hen over efteråret og conference-mesterskabet i februar, som for de fleste svømmere er årets vigtigste stævne. Men adgangen til NCAA Championships går **ikke** gennem conferencen: den går gennem **tider**. Man svømmer sig ind ved at ramme et kvalifikationskrav, og de hurtigste i landet inviteres. Det er den samme individuelle logik som i atletikken, og den har en vigtig konsekvens for en dansk svømmer: man kan nå et nationalt amerikansk mesterskab fra et program, der ikke er blandt landets bedste, hvis uret siger god for det.

Fordi svømning kræver et 50-meters- eller 25-yards-anlæg, er programmerne dyre at drive, og flere universiteter har nedlagt deres hold gennem årene. Det er værd at spørge ind til programmets økonomi, inden man takker ja.

### Vejen til prof

Der er ingen draft og ingen stor professionel svømmeliga at gå til. Vejen videre er landsholdet: DM, internationale stævner, EM, VM og OL. Til gengæld er NCAA i praksis verdens tætteste konkurrencemiljø for svømmere i den aldersgruppe, og mange nationers olympiske svømmere er udviklet i amerikanske college-programmer. For en dansk svømmer er regnestykket ofte enkelt: fire år med to daglige træninger, fysisk træner, fysioterapeut og et hold omkring sig — og en uddannelse ved siden af.

### Tidbits

En vigtig detalje for danskere: amerikansk college-svømning foregår i et 25-yards-bassin ("short course yards"), ikke de 50 meter, man kender hjemmefra — så tiderne kan ikke sammenlignes direkte. De fleste stævner afvikles med indledende heat om morgenen og finaler om aftenen. Den danske svømmeskoles fokus på teknik og udholdenhed forbereder atleterne godt, og flere danskere har sat universitetsrekorder og kvalificeret sig til NCAA Championships. North Carolina State har været et samlingspunkt for danske svømmere: distancesvømmeren Anton Ipsen markerede sig blandt USA''s bedste, og Søren Dahl vandt to NCAA-titler med skolens stafetter i 2016 og 2017.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). NCAA Division I men''s swimming & diving.](https://www.ncaa.com/sports/swimming-men/d1)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'svoemning' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk atletik i NCAA (track & field)

Atletik er en af de største sportsgrene i NCAA, og danske atleter har gode muligheder for at konkurrere på højt niveau. Fra sprint til kast, fra spring til mellemdistance — der er plads til danske talenter i alle discipliner.

### Sæsonens gang

College atletik strækker sig over næsten hele studieåret i tre faser: cross country om efteråret (september-november), indendørs atletik om vinteren (januar-marts) og udendørs atletik om foråret (marts-juni). NCAA Indoor og Outdoor Championships er sæsonens to store højdepunkter, og mange atleter konkurrerer i alle tre sæsoner som en del af samme program.

### Formatet

Selvom hver enkelt øvelse er en individuel præstation, samles det hele til en holdkamp gennem point. Ved et stævne — det være sig et "dual meet" mellem to skoler eller et stort invitational med mange hold — tildeles der point efter placering i hver disciplin, og skolens samlede sum afgør den endelige rangering. Et bredt hold, der scorer point i mange forskellige øvelser, slår derfor et hold med få store stjerner. Cross country har sin helt egen logik: her vinder holdet med den LAVESTE score, fordi man lægger placeringerne for de fem bedste løbere sammen — så en førsteplads er bedre end en tiendeplads.

### Stipendier og trupstørrelse

Atletikken har en særegenhed, der er værd at forstå, før man læser tal om trupstørrelser: **cross country og track & field tælles som to forskellige sportsgrene**, selv om det i praksis ofte er de samme udøvere og den samme træner. For de Division I-skoler, der tilsluttede sig House-forliget i 2025, er de gamle stipendielofter væk og erstattet af et truploft på **45 udøvere i track & field** og **17 i cross country** — og inden for det loft må skolen give stipendium til hvem den vil.

45 lyder af meget, og det er det også: atletik har et af de største trupslofter i college-sporten, fordi et hold skal dække alt fra 100 meter til hammerkast. Men det betyder også, at stipendiet næsten altid er et **delstipendium**. Uden for forligets skoler, og i Division II, gælder equivalency-modellen som før — én samlet pulje delt ud på mange atleter — og Division III giver ingen idrætsstipendier overhovedet. Læs [divisionerne](/viden/ncaa-divisioner), før du sammenligner to tilbud.

### Conferences og independents

Atletik hører til de sportsgrene, hvor næsten alle conferences har et program, så conference-billedet ligner skolens øvrige tilhørsforhold tættere end i de smalle sportsgrene. Conference-mesterskaberne ligger sidst i hver af de tre sæsoner og er holdets egentlige målestok — men de afgør ikke adgangen til NCAA-finalen. **Atletikken kvalificerer på præstation, ikke på holdresultat:** man kommer til NCAA Championships ved at løbe, springe eller kaste sig ind på listen over de bedste i landet, eventuelt gennem et regionalt kvalifikationsstævne. Det er en vigtig forskel fra holdsportene, hvor slutspilspladsen følger holdet: en enkelt stærk dansker på et middelmådigt hold kan sagtens nå nationalt mesterskab alene.

Alle de danske atletikudøvere, vi i øjeblikket følger, er på Division I-programmer.

### Vejen til prof

Atletik har ingen draft. Vejen videre går gennem resultater: en kontrakt med en skoproducent, plads på landsholdet, internationale stævner — og for de bedste OL. Derfor er NCAA i praksis verdens største udviklingssystem for atletik, også for udøvere, der aldrig kommer til at repræsentere USA. Fordi kvalifikationen er individuel, og fordi sæsonen er lang og tæt besat, får en college-atlet flere seriøse konkurrencer om året, end de fleste kan få hjemme.

### Tidbits

Stafetterne er blandt de mest populære øvelser, og holdfølelsen omkring dem er stor selv i en ellers individuel sport. NCAA-systemet har fostret mange olympiske medaljevindere, og flere danske atletikudøvere har sat sig spor med All-American-udnævnelser og conference-mesterskaber. Den danske atletiktradition, særligt inden for mellemdistance og spring, passer godt til det amerikanske college-system. Et godt eksempel er forhindringsløberen Ole Hesselbjerg, der blev tredobbelt All-American på Eastern Kentucky og senere repræsenterede Danmark i 3.000 m steeplechase ved OL i Rio 2016.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal), og en skadessæson koster ikke nødvendigvis et spilleår — se [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). NCAA Division I men''s outdoor track and field.](https://www.ncaa.com/sports/track-field-outdoor-men/d1)
- [NCAA. (n.d.). NCAA Division I men''s cross country.](https://www.ncaa.com/sports/cross-country-men/d1)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'atletik' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk golf i NCAA

Golf er en af de sportsgrene, hvor danske atleter har markeret sig allermest i NCAA. Danmarks stærke golftradition og høje niveau i ungdomsgolf gør det til en naturlig vej til amerikanske universiteter.

### Sæsonens gang

College golf deler sit program over to dele af studieåret: en efterårssæson (september-november) og en forårssæson (februar-maj), der bygger op til mesterskaberne. NCAA Championships spilles i slutningen af maj og er en af golfsportens mest prestigefyldte college-begivenheder.

### Formatet

Det meste af sæsonen spilles som "stroke play" over 54 huller (tre runder): hvert hold stiller op med fem spillere, men kun de fire bedste runder tæller med hver dag, så den dårligste score smides væk. Holdet med færrest slag i alt vinder. Det betyder, at en enkelt katastroferunde kan reddes af holdkammeraterne — golf bliver pludselig en holdsport. Til selve NCAA-finalen ændres formatet undervejs: efter den indledende stroke play går de otte bedste hold videre til "match play", hvor skolerne sættes mod hinanden mand-mod-mand, og det hold, der vinder flest af de individuelle dueller, går videre. Den dramatiske afslutning blev indført i 2009 og har givet golfen et knockout-format, der minder om March Madness.

### Stipendier og trupstørrelse

Golf har et af de **mindste trupslofter i college-sporten: 9 spillere** for de Division I-skoler, der tilsluttede sig House-forliget i 2025. Tallet giver sig selv, når man husker formatet — der stilles op med fem spillere, og fire scorer tæller. Ni pladser betyder til gengæld, at konkurrencen om en plads er benhård hele vejen, også efter man har skrevet under: den femte plads på holdkortet skal genvindes fra stævne til stævne.

Til gengæld er det en af de sportsgrene, hvor et fuldt stipendium er realistisk, netop fordi puljen skal deles på få hoveder. Uden for forligets skoler, og i Division II, gælder den gamle equivalency-model, hvor beløbet deles ud i brøkdele; Division III giver ingen idrætsstipendier, men til gengæld ofte betydelig akademisk støtte — en reel vej for en stærk studerende med lavt handicap. Forskellene er beskrevet i [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Golf er en individuel sport med et holdresultat ovenpå, og det sætter sit præg på conference-strukturen. Conference-mesterskabet afvikles som et samlet stævne over typisk tre dage i stedet for en sæson af indbyrdes kampe, og vinderen får en automatisk plads videre. Resten af feltet udvælges på **rangering**: college golf styres i høj grad af nationale ranglister, og et hold, der spiller sig højt op gennem stærke invitationals i efteråret, kan kvalificere sig uden at vinde noget som helst. Derfor betyder det mindre i golf end i holdsportene, hvilken conference man ender i — og derfor kan en enkelt spiller fra et lille program gå videre individuelt, selv når holdet ikke gør.

Vejen til NCAA-finalen går gennem regionale stævner, hvor både hold og enkeltspillere kvalificerer sig. Omkring fire ud af fem af de danske golfspillere, vi følger, er på Division I-programmer.

### Vejen til prof

Golf har den mest formaliserede overgang fra college til professionel sport af alle college-sportsgrene. **PGA TOUR University** rangerer Division I-herrer efter de sidste to år af deres college-karriere, og efter NCAA-finalen i maj giver de 20 bedste pladser adgang til professionelt spil med det samme: nummer ét bliver medlem af PGA TOUR, nummer 1-10 får status på Korn Ferry Tour, og nummer 6-20 på PGA TOUR Americas. Det er en direkte, offentligt beregnet rute — man kan følge sin egen placering gennem sæsonen.

På kvindesiden findes ikke det samme enkeltstående rangsystem; ruten går typisk gennem LPGA''s kvalifikationsturneringer og amatørranglisten. For danske spillere har college i begge tilfælde fungeret som et springbræt: fire år med topkonkurrence, træningsfaciliteter og en uddannelse, hvis golfen ikke bærer hele vejen.

### Tidbits

Vejen fra dansk ungdomsgolf til NCAA er veletableret, og flere danskere har vundet individuelle NCAA-turneringer og bidraget til holdets succes i conference-mesterskaber. For mange er college golf et springbræt direkte til professionel golf på PGA- og LPGA-touren. Rasmus Neergaard-Petersen er et nutidigt eksempel: han blev All-American på Oklahoma State — samme stærke program som Viktor Hovland — og er siden rykket op på de professionelle touren.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). NCAA Division I men''s golf.](https://www.ncaa.com/sports/golf-men/d1)
- [NCAA. (n.d.). DI men''s golf championship history.](https://www.ncaa.com/history/golf-men/d1)
- [PGA TOUR. (n.d.). How it works: PGA TOUR University Ranking.](https://www.pgatour.com/article/news/how-it-works/pga-tour-university-ranking-criteria-points-eligibility-benefits-status)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'golf' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk tennis i NCAA

Tennis er en af de mest populære sportsgrene for internationale atleter i NCAA, og danske spillere har en stærk tilstedeværelse. Det individuelle format og det høje niveau i dansk tennis gør det til en oplagt mulighed.

### Sæsonens gang

Holdsæsonen løber fra januar til maj og kulminerer med NCAA Championships i maj. Efteråret er derimod individuelt: her spiller spillerne turneringer for sig selv for at opbygge ranking, før de om foråret samles til holdkampene.

### Formatet

En "dual match" mellem to skoler afgøres på syv mulige point. Først spilles tre doubler samtidig, og det hold, der vinder to af dem, får ét samlet doublepoint. Derefter spilles seks singler, hvor hver kamp er ét point. Det hold, der først når fire point i alt, har vundet — og kampen stoppes i det øjeblik, afgørelsen er sikker, så de sidste singler ikke altid spilles færdige. Det gør college tennis langt mere holdorienteret end den professionelle sport: udfaldet afhænger af hele truppen, ikke kun af stjernen på førstepladsen.

### Stipendier og trupstørrelse

Tennis har sammen med golf det mindste truploft i college-sporten: **10 spillere** for de Division I-skoler, der tilsluttede sig House-forliget i 2025. Med seks singler og tre doubler i en dual match er hele truppen i spil hver eneste kamp — der er ingen bænk at gemme sig på. Det er også grunden til, at fulde stipendier er mere almindelige i tennis end i de store truppsportsgrene: der er få pladser at fordele pengene på.

Netop derfor er tennis en af de mest internationalt besatte sportsgrene i NCAA. Når et program kun har ti pladser og skal vinde seks singler, rekrutterer det på niveau frem for geografi, og det har i årtier trukket europæiske spillere over Atlanten. Uden for forligets skoler og i Division II gælder equivalency-modellen; Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner) for hvad det betyder i kroner.

### Conferences og independents

I tennis afgør conferencen hverdagen — hvem man møder i dual matches, og hvor langt holdet rejser i foråret — men den afgør ikke alene adgangen til mesterskaberne. Conference-mesteren får en automatisk plads til NCAA-holdturneringen, mens resten af feltet udvælges på **ITA''s nationale ranglister**, der opdateres gennem sæsonen for både hold, singlespillere og doublepar. Den individuelle NCAA-turnering kører parallelt med holdturneringen, så en spiller kan nå et nationalt mesterskab, selv om holdet ryger ud.

Fordi rangeringen vejer så tungt, betyder det mere for en spiller, hvor højt på holdkortet man spiller, end hvilken conference skolen tilhører. De danske tennisspillere, vi følger, fordeler sig næsten ligeligt mellem Division I og Division II, med nogle få på Division III.

### Vejen til prof

Der er ingen draft i tennis. Overgangen er en ranglistesag: man spiller sig op gennem ITF- og challenger-turneringer, og college-årene tæller ikke imod noget. Det gør college til en usædvanlig lavrisiko-rute i en sport, hvor alternativet er at rejse verden rundt som teenager for egen regning. Holdningen til college har ændret sig markant — ruten er i dag helt almindelig blandt spillere, der senere når ATP- og WTA-touren, og fire år med gratis træning, fysisk udvikling og kamperfaring er for mange en bedre investering end fire år i kvalifikationen.

August Holmgren er det tydeligste danske eksempel: han nåede finalen i NCAA''s individuelle mesterskab for San Diego i 2022 og er siden gået professionel.

### Tidbits

College tennis bryder med den professionelle sports stilhed: holdkammerater og studenter hepper højlydt mellem boldskifterne, og stemningen minder mere om en holdsport end om en Grand Slam. Mange kampe spilles desuden med "no-ad"-scoring, hvor et point ved 40-40 afgør hele partiet — det gør spillet hurtigere og mere nervepirrende. Den tekniske træning og kamperfaring fra dansk og europæisk tennis giver et solidt fundament for NCAA-konkurrence. Danskerne har sat markante aftryk: Mikael Torpegaard blev femdobbelt All-American på Ohio State, og August Holmgren spillede sig hele vejen til finalen i NCAA''s individuelle mesterskab i 2022 for San Diego.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (2015, 13. august). Division I tennis championships move to no-ad scoring.](https://www.ncaa.com/news/tennis-men/article/2015-08-13/division-i-tennis-championships-move-no-ad-scoring)
- [Intercollegiate Tennis Association. (2025, 14. juli). 2025-2026 ITA rule modifications, changes and clarifications.](https://wearecollegetennis.com/2025/07/14/2025-2026-ita-rule-modifications-changes-and-clarifications/)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'tennis' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk roning i NCAA

Roning har en særlig plads i NCAA, især for kvinder, og Danmarks stærke roklubber og traditioner gør det til en naturlig base for atleter, der vil konkurrere i USA.

### Sæsonens gang

College-roning har to vidt forskellige sæsoner. Om efteråret ros der "head races": lange løb på 4-6 km, hvor bådene sendes af sted med tidsmellemrum og kæmper mod uret frem for side om side. Om foråret skifter sporten til "sprint racing" — korte, eksplosive løb på typisk 2.000 meter, hvor flere både ligger på stribe og ror direkte mod hinanden mod målstregen. Sæsonen kulminerer med NCAA Championships i slutningen af maj eller starten af juni. Træningen er berygtet intensiv med både morgen- og eftermiddagssessioner.

### Formatet

Når to eller flere skoler mødes til en regatta, stiller hver skole op med flere både i forskellige klasser — typisk otter (med styrmand) og firere. Hvert løb giver point, og skolens samlede resultat på tværs af alle bådene afgør den endelige placering. Det er altså ikke nok at have én hurtig båd; dybden i hele programmet tæller. Styrmanden ("coxswainen") ror ikke selv, men styrer båden og dirigerer roernes rytme — ofte holdets mindste person ombord.

### Stipendier og trupstørrelse

Roning er den sport i hele college-systemet, hvor forskellen mellem kønnene er skarpest, og det skal man kende, før man søger. **Kvinderoning er en NCAA-mesterskabssport** med alt hvad det indebærer af stipendier og struktur; **herreroning ligger uden for NCAA** og styres af Intercollegiate Rowing Association (IRA). Konsekvensen er kontant: NCAA-stipendiereglerne gælder simpelthen ikke for mændene, og støtten til en mandlig roer afhænger helt af den enkelte skole.

På kvindesiden er truploftet for de Division I-skoler, der tilsluttede sig House-forliget, **68 roere** — det største loft i nogen college-sport. Det er der en grund til: en otter kræver ni personer ombord, et program stiller flere både, og hele modellen bygger på at kunne tage imod nybegyndere. Netop derfor rekrutterer amerikanske roprogrammer aktivt **walk-ons** — høje, veltrænede studerende uden roerfaring, der læres op fra bunden. Uden for forligets skoler og i Division II gælder equivalency-modellen som hidtil, og Division III giver ingen idrætsstipendier; [divisionerne](/viden/ncaa-divisioner) er forklaret for sig.

### Conferences og independents

Roning er en smal sport geografisk, og det former conference-billedet: programmerne ligger koncentreret på øst- og vestkysten og omkring de store søer, hvor der er vand nok til en 2.000-meter-bane. Fordi mange conferences slet ikke udbyder roning, ligger et roprogram ofte i en **anden conference end skolens øvrige hold** — flere af de stærkeste roskoler konkurrerer i rospecifikke sammenslutninger frem for i deres hovedconference. Adgangen til NCAA-finalen for kvinder går gennem både automatiske pladser og at-large-udvælgelse, så et hurtigt program uden conference-titel kan stadig komme med.

For herrerne er IRA National Championship Regatta det, NCAA-finalen er for kvinderne — samme prestige, andet forbund.

### Vejen til prof

Der findes ingen professionel roliga at blive draftet til. Vejen videre går gennem landsholdet: klub- og landsholdsudtagelse, internationale regattaer, verdensmesterskaber og OL. Det gør college-roning til noget i retning af et fireårigt eliteforløb med uddannelse indbygget, og det er præcis derfor ruten er attraktiv for danske roere — træningsmængde, bådpark og træneradgang på et niveau, de færreste kan finansiere privat.

### Tidbits

Et kuriosum værd at kende: kvinderoning er en officiel NCAA-mesterskabssport, mens herreroningen historisk styres af en separat organisation (IRA) uden for NCAA — så stipendiemulighederne er klart størst for kvinder. Den danske roningstradition er stærk, og flere danskere har brugt college-roning som springbræt til international konkurrence og OL. Joachim Sutton blev den første dansker på roholdet ved University of California, Berkeley, da han ankom i 2015 — han vandt siden OL-bronze i toer uden styrmand.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). NCAA Division I women''s rowing.](https://www.ncaa.com/sports/rowing-women/d1)
- [California Golden Bears Athletics. (2017, 1. februar). Inside the lair: Danish rower makes immediate impact in Berkeley.](https://calbears.com/news/2017/2/1/inside-the-lair-danish-rower-makes-immediate-impact-in-berkeley.aspx)
- [Intercollegiate Rowing Association. (n.d.). Compliance.](https://www.irarowing.com/compliance)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'roning' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk gymnastik i NCAA

Gymnastik er en af NCAAʼs mest populære sportsgrene med stor publikumsinteresse. Danske gymnaster, der har trænet på højt niveau i Danmark eller Skandinavien, kan finde gode muligheder i det amerikanske college-system.

### Sæsonens gang

College-gymnastik løber fra januar til april, med conference-mesterskaber og NCAA Championships som klimaks i april. Sæsonen er kort og tæt, og fordi hver eneste øvelse tæller, er konsistens vigtigere end enkeltstående spektakulære præstationer.

### Formatet
Når to eller flere skoler mødes, konkurrerer gymnasterne i de enkelte apparater — fire for kvinder (spring, barre, bom og gulv) og seks for herrer. Hver gymnasts øvelse bedømmes med en score, og holdets samlede sum af de tællende scorer i hvert apparat afgør sejren. Et hold stiller typisk med flere gymnaster pr. apparat, men kun de bedste scorer tæller, så bredde og pålidelighed er afgørende. Det er kombinationen af holdets samlede præstation på tværs af alle apparater, der kårer vinderen — ikke en enkelt stjernes glansnummer.

### Stipendier og trupstørrelse

Kvindegymnastik var historisk en **headcount-sport** i Division I: stipendiet tælte som et helt uanset størrelse, så der blev i praksis kun givet fulde stipendier — og netop derfor er college-gymnastik et af de mest eftertragtede mål i sporten. Efter House-forliget i 2025 er systemet afløst af et **truploft på 20 gymnaster** for de skoler, der tilsluttede sig, hvor støtten må fordeles frit.

Herregymnastik står i den modsatte ende: der er meget få programmer tilbage i USA, og de er gennem årtier blevet nedlagt et efter et. For en dansk gymnast betyder det, at mulighederne er reelle på kvindesiden og meget tynde på herresiden. Uden for forligets skoler og i Division II gælder de gamle regler; Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Gymnastik har et tyndt conference-landskab, fordi så få skoler har programmer, og flere hold konkurrerer derfor i gymnastikspecifikke sammenslutninger frem for i skolens hovedconference. Adgangen til NCAA-mesterskabet går gennem regionale stævner og en national rangering af holdenes scorer gennem sæsonen — altså ikke gennem conference-titlen alene.

Det gør det muligt for et stærkt hold fra en lille conference at nå mesterskabet, og for en enkelt gymnast at kvalificere sig individuelt, selv om holdet ikke gør.

### Vejen til prof

Der findes ingen professionel gymnastikliga. Vejen videre er landsholdet, EM, VM og OL — og her har college fået en ny rolle: en del gymnaster på eliteniveau bruger i dag NCAA som det sted, karrieren fortsætter efter en OL-deltagelse, frem for at stoppe som nittenårig. For en dansk gymnast er det argumentet for ruten: fire år med daglig træning, fysisk opfølgning og konkurrencer — og en uddannelse, som elitesporten ellers sjældent levner plads til.

### Tidbits

En charmerende særhed ved kvindernes college-gymnastik: den holder fast i den klassiske 10-skala, hvor det "perfekte 10-tal" stadig findes — i modsætning til både elitegymnastikkens internationale system og herrernes college-gymnastik, der begge bruger en åben skala uden loft. Et perfekt 10-tal i en fyldt amerikansk hal udløser euforisk jubel. Danmarks gymnastiktradition er bred, og de atleter, der tager springet til NCAA, kommer typisk fra konkurrencemiljøet med en stærk teknisk baggrund.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). NCAA Division I women''s gymnastics.](https://www.ncaa.com/sports/gymnastics-women/d1)

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'gymnastik' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk ishockey i NCAA

Ishockey er en stor sport i det amerikanske college-system, med intense rivaliseringer og høj kvalitet. Danske ishockeyspillere, der har udviklet sig i Metal Ligaen eller danske ungdomsprogrammer, kan finde en vej til NCAA.

### Sæsonens gang

College hockey-sæsonen løber fra oktober til april. Holdene spiller omkring 34 kampe i den regulære sæson, ofte i serier med to kampe på samme weekend mod den samme modstander. Conference-turneringerne i marts fører frem til NCAA-turneringen, der kulminerer med "Frozen Four" — de fire bedste hold, der mødes om det nationale mesterskab.

### Formatet

Tre perioder à 20 minutter, fem markspillere og en målmand pr. hold. College-hockey spilles på nordamerikansk bane, som er smallere end den europæiske — spillet bliver tættere, hårdere og hurtigere afgjort langs banderne, og det er den største tekniske omstilling for en europæisk spiller. Uafgjort i grundspillet afgøres med forlænget spilletid og straffeslag efter conferencens egne regler.

### Stipendier og trupstørrelse

Ishockey er en equivalency-sport: stipendierne har altid kunnet deles ud i brøkdele, og de fleste spillere har haft en andel frem for et fuldt stipendium. For de Division I-skoler, der tilsluttede sig House-forliget i 2025, er stipendieloftet afløst af et **truploft på 26 spillere**, inden for hvilket skolen må støtte frit.

Antallet af Division I-programmer er lille — hockey er dyrt at drive og kræver is — så konkurrencen om en plads er hård, og mange spillere går vejen om ad juniorhockey først. Uden for forligets skoler og i Division II gælder de gamle regler; Division III giver ingen idrætsstipendier, men har til gengæld mange hockeyprogrammer. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Hockeyens conferences er sportens egne og har intet at gøre med skolens øvrige tilhørsforhold — det er en af de tydeligste illustrationer af, at conference følger sporten. Conference-turneringerne i marts giver automatiske pladser til NCAA-turneringen, og resten udvælges på en national rangering. Enkelte programmer spiller som independents.

Den store nyhed er, at rekrutteringsgrundlaget blev lagt om 1. august 2025, da spillere fra den canadiske CHL blev spilleberettigede. Det har trukket et helt nyt lag af spillere ind i Division I — og gjort konkurrencen om pladserne mærkbart hårdere for alle andre, europæere inklusive.

### Vejen til prof

College-hockey er en af NHL''s vigtigste leverandører, og ruten har en særlig fordel: en spiller kan blive draftet til NHL og alligevel fortsætte i college, så længe han ikke skriver professionel kontrakt. Det giver fire år til at udvikle sig med et draftvalg i baghånden — og en uddannelse, hvis det ikke rækker. For danske spillere er alternativet typisk juniorhockey i Nordamerika eller seniorhockey hjemme, og college er den eneste af de tre, der giver en grad med.

### Tidbits

College hockey er en af de vigtigste leverandører af spillere til NHL: mange spillere udvikler sig her i stedet for i de canadiske juniorligaer, fordi de samtidig kan tage en uddannelse. En særhed ved amatørstatussen er, at en draftet NHL-spiller godt kan fortsætte i college, så længe han ikke har skrevet professionel kontrakt.

En historisk regelændring trådte i kraft 1. august 2025: spillere fra den canadiske major junior-liga (CHL) kan nu også spille NCAA Division I-hockey. Tidligere blev de betragtet som professionelle og var udelukket — ændringen åbner et helt nyt rekrutteringslandskab (gælder dog ikke Division III). Med den danske ishockeys stigende niveau og flere danske spillere i professionelle ligaer verden over er NCAA-vejen blevet en attraktiv mulighed for unge danske spillere, der vil kombinere sport og uddannelse. Forsvarsspilleren Oliver Lauridsen gik fx vejen gennem St. Cloud State, før han blev draftet og spillede i NHL.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NHL.com. (2024, 7. november). CHL players to be eligible to play NCAA hockey beginning in 2025-26.](https://www.nhl.com/news/chl-players-to-be-eligible-to-play-ncaa-hockey-beginning-in-2025-26)
- [College Hockey Inc. (2024, november). NCAA DI Council votes to make CHL players eligible.](https://www.collegehockeyinc.com/2024/11/breaking-ncaa-di-council-votes-to-make-chl-players-eligible/)

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'ishockey' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Dansk volleyball i NCAA

Volleyball er en af NCAAʼs største sportsgrene, især for kvinder, med tusindvis af hold på tværs af divisioner. Danske volleyballspillere har gode muligheder, da sporten er mindre eksponeret internationalt end fx fodbold.

### Sæsonens gang

De to køn spiller i hver sin halvdel af året: kvindevolleyball er en efterårssport (august-december), mens herrevolleyball spilles om foråret (januar-maj). Kvindernes NCAA Volleyball Championship i december er en af efterårets store tv-begivenheder og fylder store arenaer — finalestævnet trækker omkring 18.000-19.000 tilskuere.

### Formatet

Seks mod seks på hver side af nettet, og der spilles bedst af fem sæt til 25 point (det femte til 15). Rotationen er sportens særkende: holdet rykker én plads med uret, hver gang det vinder serven, så alle seks spillere skal kunne fungere både ved nettet og i baglinjen. Undtagelsen er liberoen, der bærer afvigende trøje, kun spiller i baglinjen og ikke må angribe over nettet.

### Stipendier og trupstørrelse

Kvindevolleyball var historisk en **headcount-sport** i Division I: et stipendium tælte som et helt, uanset størrelse, så der blev i praksis kun uddelt fulde stipendier. Efter House-forliget i 2025 er det system væk for de skoler, der tilsluttede sig, og erstattet af et **truploft på 18 spillere** for både herrer og kvinder, hvor støtten må fordeles frit.

Herrevolleyball har langt færre programmer end kvindevolleyball og har altid været en equivalency-sport — delstipendier er normen dér. Uden for forligets skoler og i Division II gælder de gamle regler, og Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Volleyball følger et almindeligt conference-mønster med kampe hen over sæsonen og en conference-turnering, der giver en automatisk plads i NCAA-turneringen. Det er værd at vide, at **beachvolley tæller som en selvstændig NCAA-sport** med sit eget mesterskab og sine egne conferences — mange skoler har begge dele, og en del spillere dyrker begge, men det er to forskellige hold med to forskellige sæsoner.

Fordi herrevolleyball har så få programmer, er conference-landskabet dér tyndt, og flere herrehold spiller i conferences, der ikke har noget med skolens øvrige tilhørsforhold at gøre.

### Vejen til prof

Der er ingen draft i volleyball, og den professionelle karriere ligger for langt de fleste i Europa og Asien, hvor klubvolleyball er stort og velbetalt. Det er en fordel for en dansk spiller: college giver fire år med topkonkurrence og en uddannelse, og vejen videre går hjem til et kontinent, hvor sporten står stærkere end i USA. Landsholdet og beachvolley — med OL som mål — er de andre ruter.

### Tidbits

Ud over den klassiske indendørs 6-mod-6-volleyball er beachvolley vokset til en selvstændig NCAA-mesterskabssport, hvor par spiller mod par i sandet — en hurtigt voksende disciplin, hvor europæiske spillere klarer sig godt. En libero-spiller bærer afvigende trøjefarve og er specialist i forsvar, men må ikke angribe over nettet. Den danske volleyballtradition med fokus på teknik og taktik passer godt til college-sporten, og flere danske spillere har gjort sig bemærket med All-Conference-udnævnelser.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). NCAA Division I women''s volleyball.](https://www.ncaa.com/sports/volleyball-women/d1)

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'volleyball' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Field hockey i NCAA

Field hockey er en lille sport i Danmark, og netop derfor er den amerikanske vej interessant: i USA er field hockey et etableret college-program med fuld støtte, egne stadions og et mesterskab, der følges på tv. Feltet er samtidig et af de mest internationale i NCAA — hollandske, tyske, engelske, argentinske og australske spillere fylder meget på de bedste hold.

**Én ting skal siges først: field hockey i NCAA er en kvindesport.** Der findes intet NCAA-mesterskab for herrer og ingen herrelegater i field hockey. For danske drenge findes vejen altså ikke — uanset niveau.

### Sæsonens gang

Field hockey er en efterårssport. Sæsonen begynder sidst i august, conference-turneringerne afvikles i begyndelsen af november, og NCAA-turneringen spilles midt i november med semifinaler og finale sidst på måneden. Det er en kort, tæt sæson på kunstgræs, hvor holdene ofte spiller to kampe om ugen.

### Formatet

Elleve spillere pr. hold, og kampen spilles i **fire kvarterer à 15 minutter** — ikke to halvlege, som mange forbinder med sporten fra Europa. Står kampen lige, forlænges den med sudden victory, og er der stadig ikke fundet en vinder, afgøres den på straffekonkurrence. Mål falder oftest efter et straffehjørne, så specialisterne på dødbolde er værdifulde.

### Stipendier og trupstørrelse

Division I har godt 80 programmer fordelt på omkring 33 conferences. Historisk måtte et D1-hold råde over op til 12 fulde legater, som typisk blev delt ud som delvise, mens Division II havde op til 6,3. De tal gælder stadig for de skoler, der **ikke** tilsluttede sig House-forliget, og i Division II.

For de Division I-skoler, der tilsluttede sig forliget i 2025, er stipendielofterne derimod afskaffet og erstattet af et **truploft på 27 spillere**, inden for hvilket skolen må støtte hvem den vil. Det er en reel forbedring i en sport, hvor 12 legater før skulle strækkes over en hel trup — men truppen er til gengæld blevet en fast størrelse. Division III giver ingen sportslegater, men ofte akademisk og behovsbestemt støtte, og der spilles NCAA-mesterskab i alle tre divisioner. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Field hockey er geografisk skæv: programmerne er koncentreret i nordøst og Mid-Atlantic, hvor sporten har rod i skolesystemet. Det har en konsekvens, der forvirrer mange — fordi en del conferences slet ikke udbyder field hockey, spiller flere universiteter deres field hockey i **en anden conference end resten af skolens hold**, og enkelte spiller som independents uden conference overhovedet. Det er ikke et tegn på et svagt program; det er et spørgsmål om, hvem der har et hold at spille imod.

Conference-mesteren får en automatisk plads i NCAA-turneringen, resten af feltet udvælges. For en international spiller er det værd at bemærke, at rejseafstandene i denne sport er små sammenlignet med resten af college-sporten — meget af sæsonen ligger inden for få timers kørsel.

### Vejen til prof

Der findes ingen stor professionel field hockey-liga i USA, og der er ingen draft. Vejen videre går den modsatte vej af de fleste andre sportsgrene: hjem til europæisk klubhockey — Holland, England, Tyskland og Belgien har de stærkeste ligaer — og videre gennem landsholdet. Det gør college til fire år med topkonkurrence og en amerikansk grad, før karrieren fortsætter i Europa, og det er præcis derfor feltet er så internationalt.

### Tidbits

Feltet er internationalt i et omfang, der er usædvanligt selv for NCAA: allerede i 2015 kom mere end 10 procent af alle college-spillere i field hockey fra udlandet, og andelen er vokset siden. Sportsligt har nordøsten og Mid-Atlantic traditionelt domineret — i 2025 vandt Northwestern sit tredje mesterskab efter at have slået North Carolina i semifinalen i forlænget spilletid.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). Division I field hockey.](https://www.ncaa.org/championship/division-i/field-hockey/)
- [USA Field Hockey. (2025, August 25). 2025 NCAA field hockey season preview: Division I.](https://www.usafieldhockey.com/news/2025/august/25/2025-ncaa-field-hockey-season-preview-division-i)
- [ScholarshipStats.com. (n.d.). Field hockey scholarships.](https://scholarshipstats.com/fieldhockey)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'field-hockey' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Rugby i amerikansk college-sport

**Det vigtigste at vide først: college-rugby er ikke ét system, men to.** For kvinder er rugby en af NCAA''s fire nuværende emerging sports — en anerkendt vej mod fuldt mesterskab, med legater efter NCAA''s regler og mesterskabskampe i National Intercollegiate Rugby Association. For mænd er rugby slet ikke en NCAA-sport. Herreholdene spiller under National Collegiate Rugby og Collegiate Rugby Association of America, og varsity-programmerne giver som hovedregel ikke sportslegater.

### Sæsonens gang

15-mands-rugby er en efterårssport. Kampene begynder sidst i august, og mesterskabet afgøres i november — i 2025 med semifinaler 15. november og finaler 22. november på Harvard. Foråret og forsommeren tilhører 7-mands-rugby, hvor National Collegiate Rugbys mesterskab er den største kollegiale rugbybegivenhed i verden.

### Formatet

Femten spillere pr. hold og to halvlege à 40 minutter. Et forsøg giver fem point, konverteringen bagefter to, og både straffespark og drop-mål tæller tre. Otte forwards vinder bolden, syv backs skal bruge den — og de to grupper rekrutteres på vidt forskellige kropstyper.

### Stipendier og trupstørrelse

Her ligger den skarpeste forskel mellem de to systemer, og den bør afgøre forventningerne. **Kvinderugby følger NCAA''s regler:** det er en equivalency-sport, så legaterne deles ud i delvise andele, og for de Division I-skoler, der tilsluttede sig House-forliget i 2025, gælder et truploft på **36 spillere**. **Herrerugby står uden for NCAA**, og dermed uden for hele stipendiesystemet — de fleste varsity-programmer tilbyder ingen sportslegater, og det, der findes, er skolens egen ordning.

For en dansk spiller betyder det, at spørgsmålet "hvad kan jeg få i støtte?" har to helt forskellige svar afhængigt af køn, og at en mandlig rugbyspiller i praksis skal finansiere studiet ad anden vej — akademiske legater, behovsbestemt støtte eller egenbetaling. [Divisionerne](/viden/ncaa-divisioner) forklarer grundmodellen.

### Conferences og independents

Rugbyens ligastruktur følger ikke skolens øvrige conference, og det er hele pointen: fordi sporten ligger uden for NCAA på herresiden og kun er emerging sport på kvindesiden, spilles der i rugbyens egne sammenslutninger. NIRA''s øverste division samlede 13 hold i 2025, mens herreholdene er fordelt på National Collegiate Rugbys egne conferences og divisioner. Et universitet kan derfor være et stort navn i college-sporten generelt og et lille navn i rugby — og omvendt.

Det gør research vigtigere i rugby end i næsten nogen anden sport: skolens brand siger meget lidt om rugbyprogrammets niveau, og man skal se på ligaen og resultaterne, ikke på navnet.

### Vejen til prof

For kvinder er ruten videre klar nok: klubrugby i England, Frankrig eller New Zealand og derfra landsholdet — og med rugbyens sevens-format på det olympiske program er OL et reelt mål. For mænd er den amerikanske college-rugby ikke en etableret fødekæde til professionel rugby, og den realistiske vej går hjem til europæisk klubrugby.

Fælles for begge: college giver fire år med struktureret træning og kampe ved siden af en uddannelse — i en sport, hvor karrieren er kort og skaderne mange, er graden ikke en biting.

### Tidbits

Rugby deler emerging sport-status med ridning, flag football og triatlon. Listen er ikke pyntelig: otte sportsgrene er siden 1994 gået hele vejen fra emerging sport til fuldt NCAA-mesterskab — blandt dem roning, ishockey og vandpolo, som alle i dag er selvfølgelige dele af college-landskabet.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). Emerging sports for women.](https://www.ncaa.org/championships/emerging-sports-for-women/)
- [ScholarshipStats.com. (n.d.). Rugby scholarships and college varsity teams.](https://scholarshipstats.com/rugby)
- [The Rugby Breakdown. (n.d.). Tracking: NCAA varsity programs.](https://therugbybreakdown.com/tracking-ncaa-varsity-programs/)
- [National Collegiate Rugby. (2026). NCR partners with the All Women''s Sports Network for the 2026 National 7s Championships.](https://www.ncr.rugby/news/national-collegiate-rugby-partners-with-the-all-womens-sports-network-for-global-broadcast-of-2026-national-7s-championships/)
- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'rugby' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Vandpolo i NCAA

Vandpolo er en fuldgyldig NCAA-sport for både herrer og kvinder, og den har en detalje, som kun få college-sportsgrene deler: mesterskabet er et National Collegiate-mesterskab. Hold fra Division I, II og III spiller om den samme titel i den samme ottehold-turnering, hvor vinderen findes ved direkte udslagning.

### Sæsonens gang

Kønnene deler kalenderen mellem sig. Herrerne spiller om efteråret og afslutter med mesterskabet i december — i 2026 hos UC San Diego 18.-20. december. Kvinderne spiller om foråret; deres mesterskab blev afgjort i samme bassin 22.-26. april 2026.

### Formatet
Syv spillere i vandet ad gangen, heraf en målmand, og kampen spilles i **fire kvarterer à otte minutter**. Angrebene bygges op omkring centerspilleren — på amerikanske rosterlister kaldet "2-meter" eller "hole set" — mens driverne svømmer bolden frem fra siderne.

### Stipendier og trupstørrelse
77 NCAA-skoler har vandpolo: 42 i Division I (29 herrehold og 37 damehold), 10 i Division II og 25 i Division III, tilsammen omkring 1.900 mandlige og 2.050 kvindelige udøvere. Efter House-forliget kan Division I-programmer fra 2025-26 tildele op til 24 legater inden for et rosterloft på 24 — mod tidligere 4,5 for herrer og 8 for kvinder. Division II har 4,5, og Division III giver ingen sportslegater.

### Conferences og independents

Vandpolo er den mest geografisk koncentrerede sport i college-landskabet: tyngden ligger i Californien, hvor sporten har rod i skolesystemet, og de fleste mesterskaber er gennem årtier endt der. Conference-landskabet afspejler det — flere hold uden for vestkysten spiller i vandpolo-specifikke conferences frem for i skolens hovedconference, simpelthen fordi der ikke er modstandere i nærheden.

En særhed er, at NCAA kun afvikler ét samlet mesterskab på tværs af divisionerne i vandpolo (et såkaldt National Collegiate-mesterskab) frem for et pr. division. Det betyder, at et Division II- eller III-program i princippet spiller om den samme titel som de store Division I-skoler.

### Vejen til prof

Professionel vandpolo findes i Sydeuropa — Italien, Spanien, Kroatien, Ungarn og Grækenland har de stærkeste ligaer — mens der ikke er nogen stor professionel liga i USA. Vejen videre for en dansk spiller går derfor hjem til Europa eller gennem landsholdet mod EM, VM og OL. College giver fire år med daglig træning i et af verdens tætteste konkurrencemiljøer og en amerikansk uddannelse, før karrieren fortsætter på den anden side af Atlanten.

### Tidbits

Vandpolo er selv et eksempel på, hvad en emerging sport kan blive til: sporten kom ind ad den vej for kvinder og har i dag sit eget mesterskab. Sportsligt er tyngdepunktet stadig Californien — UCLA gik ind i 2026-sæsonen som forsvarende herremester for andet år i træk.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [ScholarshipStats.com. (n.d.). Water polo scholarships.](https://scholarshipstats.com/waterpolo)
- [Collegiate Water Polo Association. (n.d.). NCAA announces sites of the 2026-2028 men''s and women''s water polo championships.](https://collegiatewaterpolo.org/national-collegiate-athletic-association-announces-sites-of-2026-to-2028-national-collegiate-athletic-association-mens-womens-water-polo-championships/)
- [NCAA.com. (2026, April 13). 2026 National Collegiate women''s water polo championship selections.](https://www.ncaa.com/news/waterpolo-women/article/2026-04-13/2026-national-collegiate-womens-water-polo-championship-selections)
- [NCAA. (n.d.). National Collegiate men''s water polo.](https://www.ncaa.org/championship/national-collegiate/mens-water-polo/)', updated_at = datetime('now')
 WHERE slug = 'vandpolo' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Fægtning i NCAA

Fægtning har et af de mest usædvanlige mesterskaber i NCAA: der er ingen opdeling i divisioner. Hold fra Division I, II og III kvalificerer sig til det samme National Collegiate-mesterskab og møder hinanden direkte — et lille D3-hold kan altså ende med at fægte mod et stipendiebærende D1-program om den samme titel.

### Sæsonens gang

Vinteren er holdkampenes tid, hvor programmerne mødes i stævner med mange dueller på én dag, og sæsonen kulminerer i marts. I 2026 blev mesterskabet afviklet 19.-22. marts hos Notre Dame med 144 deltagere fra 26 institutioner.

### Formatet
Der fægtes med tre våben — fleuret, kårde og sabel — og der uddeles individuelle titler i alle seks konkurrencer, altså hvert våben for både herrer og damer. Holdmesterskabet har lige skiftet form: fra 1990 til 2025 blev holdtitlen afgjort på kønnenes samlede point, men fra 2026 uddeles der igen separate holdtitler til herrer og damer. Ændringen løser et gammelt problem — et program med kun et damehold kunne ikke vinde den fælles titel.

### Stipendier og trupstørrelse

Fægtning er en NCAA-sport og en equivalency-sport: stipendierne deles ud i brøkdele, og et fuldt stipendium er sjældent. For de Division I-skoler, der tilsluttede sig House-forliget i 2025, er stipendieloftet afløst af et **truploft på 24 fægtere**, inden for hvilket skolen må støtte frit.

Antallet af programmer er lille og koncentreret, så konkurrencen om en plads er hård — men netop fordi feltet er lille og internationalt, er en europæisk fægter med et fornuftigt niveau et realistisk rekrutteringsmål. Uden for forligets skoler og i Division II gælder de gamle regler; Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents
45 institutioner på tværs af de tre divisioner har fægtning, og de rummer tilsammen omkring 1.400 udøvere. Det er et lille, tæt miljø koncentreret i det nordøstlige USA og omkring et par store universiteter i Midtvesten.

Fægtningens conference-landskab er tyndt og følger ikke skolens øvrige tilhørsforhold: fordi kun få universiteter har programmer, konkurrerer holdene i fægtningens egne sammenslutninger, og sæsonen består mest af invitationsstævner. NCAA afvikler ét samlet mesterskab på tværs af divisionerne, hvor mænd og kvinder fægter om point til den samme holdtitel — så en lille skole kan i princippet vinde over en stor.

### Vejen til prof

Der findes ingen professionel fægteliga. Vejen videre er landsholdet: World Cup-stævner, EM, VM og OL. College-fægtning er attraktiv, fordi den samler daglig træning, en træner og hyppige stævner om et fireårigt forløb med en uddannelse — noget de færreste europæiske fægtere kan få hjemme, hvor sporten overvejende er klubbaseret og selvfinansieret.

### Tidbits

Notre Dame vandt begge holdtitler i 2026 — og skrev sig dermed ind som den første vinder af det selvstændige damemesterskab i tre våben.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). National Collegiate fencing.](https://www.ncaa.org/championship/national-collegiate/fencing/)
- [USA Fencing. (2026, March 11). 2026 NCAA championships preview: A historic new era begins.](https://www.usafencing.org/news/2026/march/11/2026-ncaa-championships-preview)
- [NCAA.com. (2026, March 10). NCAA men''s and women''s fencing committee selects championships participants.](https://www.ncaa.com/news/fencing/article/2026-03-10/ncaa-mens-and-womens-fencing-committee-selects-championships-participants)
- [NCAA.com. (2026, March 3). Notre Dame wins the 2026 NC men''s and women''s fencing championships.](https://www.ncaa.com/news/fencing/article/2026-03-03/notre-dame-wins-2026-nc-mens-and-womens-fencing-championships)

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'faegtning' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Squash i amerikansk college-sport

**Squash er ikke en NCAA-sport.** Den styres af College Squash Association, som er sit eget forbund — men alle CSA''s medlemsinstitutioner er NCAA-medlemmer, og forbundet læner sig tæt op ad NCAA''s regler. Det betyder, at squash på papiret er varsity-sport med træning, holdkampe og nationale mesterskaber, men uden NCAA-mesterskab og uden NCAA''s legatsystem.

### Sæsonens gang

Holdkampene ligger hen over vinteren, og sæsonen samles i de nationale holdmesterskaber i februar. Varsity-holdene fordeles i playoff-divisioner på otte hold — den øverste herredivision, Potter Cup, har dog tolv.

### Formatet
Ni spillere fra hvert hold møder hinanden i hver sin individuelle kamp, og holdets resultat er summen af de ni. Rosterne tæller typisk 12-14 spillere, så der er dækning ved skader, og nummer ti møder tit modstanderens nummer ti i en kamp uden for pointregnskabet. Pladsen på stigen er dermed hele holdets valuta.

### Stipendier og trupstørrelse

**Squash er ikke en NCAA-sport**, og det er den vigtigste oplysning for en dansk spiller: NCAA''s stipendieregler, trupslofter og House-forliget gælder simpelthen ikke. Sporten styres af College Squash Association, og hvad en spiller kan få i støtte, afhænger helt af den enkelte skole — typisk gennem akademiske legater og behovsbestemt studiestøtte frem for idrætsstipendier.

Det lyder som en ulempe, men er det ikke nødvendigvis: squash står stærkest på nogle af USA''s mest velhavende og akademisk krævende universiteter, hvor behovsbestemt støtte kan dække mere end et delvist idrætsstipendium ville. Til gengæld skal karaktererne bære.

### Conferences og independents
37 amerikanske colleges har varsity-squash — 33 herrehold og 32 damehold, med omkring 500 mandlige og 428 kvindelige spillere. Fjorten af skolerne er Division I-institutioner og 23 er Division III, og geografisk er sporten koncentreret i det nordøstlige USA. Kun ganske få CSA-hold kan tilbyde sportslegater: Ivy League-universiteterne og Division III-skolerne må ikke, og de udgør størstedelen af feltet.

Fordi sporten ligger uden for NCAA, findes der ingen almindelige conferences i squash. Holdene rangeres nationalt gennem sæsonen og mødes til et samlet holdmesterskab, hvor skolerne inddeles i niveaudelte puljer efter rangering frem for efter geografi eller conference-tilhørsforhold. Et universitets navn i college-sporten generelt siger derfor intet om dets squashprogram — man skal se på rangeringen.

### Vejen til prof

Professionel squash findes på PSA-touren, men det er en lille sport med beskedne præmiepenge uden for toppen. College-squash fungerer derfor for de fleste som fire år med daglig træning og holdkonkurrence ved siden af en stærk uddannelse — og for en mindre gruppe som springbræt til touren. For en dansk spiller er det kombinationen, der er argumentet.

### Tidbits

Fraværet af NCAA er ikke et tegn på lille niveau. Det amerikanske college-felt er et af verdens tætteste squashmiljøer, og de bedste holdkampe mellem Harvard, Trinity og Princeton har i årevis afgjort, hvem der reelt er bedst i landet.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [College Squash Association. (n.d.). College squash recruiting FAQ.](https://csasquash.com/college-squash-recruiting-faq-2/)
- [College Squash Association. (2026). 2026 CSA national team championships.](https://csasquash.com/2026-national-team-championship/)
- [ScholarshipStats.com. (n.d.). Colleges with varsity squash teams.](https://scholarshipstats.com/squash)', updated_at = datetime('now')
 WHERE slug = 'squash' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Esport i amerikansk college-sport

**Esport ligger uden for NCAA.** Der findes intet NCAA-mesterskab i League of Legends, og ingen NCAA-regler at holde sig inden for. I stedet har miljøet bygget sine egne forbund: National Association of Collegiate Esports og National Esports Collegiate Conference, mens spillenes udgivere kører deres egne kredsløb ved siden af — Riot Games'' College League of Legends er det største af dem.

### Sæsonens gang

Sæsonen følger studieåret. Efteråret bruges på ligaspil i konferencerne, foråret på slutspil, og College League of Legends kulminerer i sit mesterskab i forårssemesteret. Fordi kampene spilles online, ligger de fleste opgør på hverdagsaftener — rejsedage er forbeholdt LAN-finalerne.

### Formatet
Rosterlisten ser anderledes ud end i enhver anden college-sport: spillerne står opført efter titel og rolle, ikke position. I League of Legends er de fem roller top, jungle, mid, bot og support, og et program med flere titler har typisk selvstændige hold i Valorant, Rocket League, Overwatch 2 og Counter-Strike. NECC''s kernetitler tæller også Rainbow Six: Siege, Marvel Rivals og Super Smash Bros.

### Stipendier og trupstørrelse
Mere end 300 nordamerikanske programmer giver økonomisk støtte til deres varsity-spillere, og over 280 skoler tilbyder esportslegater gennem NACE. Beløbene er små sammenlignet med de store boldsportsgrene: gennemsnittet ligger omkring 4.800 dollar om året, mens de bedst finansierede programmer kan komme betydeligt højere op. NECC alene tæller over 500 deltagende colleges og universiteter.

### Conferences og independents

Esport har ingen conferences i NCAA-forstand, fordi sporten ligger uden for NCAA. I stedet konkurrerer skolerne i forbundenes egne ligaer og divisioner — NECC og tilsvarende organisationer — med sæsoner, der er bygget op om de enkelte titler frem for om geografi. Et program kan derfor være stort i én titel og slet ikke eksistere i en anden.

Det gør research afgørende: man skal se på, hvilke titler skolen faktisk har hold i, og i hvilken liga de spiller, før man vurderer et tilbud.

### Vejen til prof

Esport er den sport i dette katalog, hvor college mindst ligner en fødekæde: de bedste spillere bliver typisk professionelle som teenagere og går uden om universitetet. College-esport er derfor snarere et sted at spille på et højt niveau, mens man tager en uddannelse — ofte inden for netop de fag, branchen efterspørger. Karriererne er korte, og det argument vejer tungere her end i nogen anden sport.

### Tidbits

De største puljer følger de største titler — League of Legends, Valorant og Rocket League — fordi det er dem, skolerne kan fylde en tribune og en stream med. Og fordi der ikke er NCAA-regler, er reglerne skolernes egne: adgangskrav, spilletid og præmiepenge afgøres program for program.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [National Esports Collegiate Conference. (2026). NECC announces 2026-2027 competition calendar.](https://necc.gg/blogs/news/necc-announces-2026-2027-competition-calendar)
- [Esports Insider. (2026). Esports scholarships in 2026: How gaming can put you through school.](https://esportsinsider.com/esports-scholarships)
- [Liquipedia. (2026). Collegiate League of Legends 2026 championship.](https://liquipedia.net/leagueoflegends/CLOL/2026/Championship)', updated_at = datetime('now')
 WHERE slug = 'esport' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Lacrosse i NCAA

Lacrosse er en af de største holdsportsgrene i amerikansk college-sport målt på antal programmer, og den spilles på alle tre NCAA-niveauer for både herrer og damer. For en europæer er det den mest ukendte af de store — sporten har rødder hos de nordamerikanske oprindelige folk og er stadig tættest på skolerne i nordøst.

### Sæsonens gang

Lacrosse er en forårssport. Grundspillet løber fra februar, og NCAA-turneringerne afgøres i maj. I 2026 spillede 18 herrehold om Division I-titlen fra 6. til 25. maj, mens 29 damehold spillede fra 8. til 24. maj. Princeton vandt herretitlen, Northwestern damernes.

### Formatet
Herrer spiller **ti mod ti**, damer **tolv mod tolv**, og begge køn spiller fire kvarterer à 15 minutter — damernes to halvlege blev afskaffet i 2022. Den store forskel er kontakten: herrelacrosse tillader kropstacklinger og hårde stavtacklinger med hjelm og skulderbeskyttelse, mens damelacrosse forbyder kropstacklinger og kun tillader kontrollerede stavtacklinger væk fra hoved og krop.

### Stipendier og trupstørrelse
Feltet er stort: 77 herrehold i Division I, 82 i Division II og 247 i Division III — og på damesiden 130, 119 og 290. Dertil kommer NAIA og junior colleges. Division I-programmer råder over op til 48 legater på herresiden og 38 på damesiden, Division II over 10,8 og 9,9, mens Division III ikke giver sportslegater.

### Conferences og independents

Lacrosse er geografisk skæv på samme måde som field hockey: tyngden ligger i nordøst, og fordi mange conferences uden for den region slet ikke udbyder sporten, spiller en del universiteter deres lacrosse i **en anden conference end resten af skolens hold**. Nogle få spiller som independents. Conference-mesteren får en automatisk plads i NCAA-turneringen, resten af det lille felt udvælges — og med kun 18 herrehold i Division I-slutspillet er marginalen til at komme med tynd.

For en europæisk spiller betyder det, at skolens generelle ry siger meget lidt om lacrosseprogrammets niveau. Man skal se på conferencen og resultaterne.

### Vejen til prof

Der findes professionel lacrosse i Nordamerika, men ligaerne er små, og de færreste lever af sporten alene. For en europæisk spiller er den realistiske vej videre landsholdet — lacrosse vender tilbage til det olympiske program i sekser-format, hvilket har givet europæiske forbund et nyt mål at spille efter — og klublacrosse hjemme. College er dermed først og fremmest fire år med den bedste træning, sporten kan tilbyde, og en uddannelse ved siden af.

### Tidbits

Antallet af Division III-programmer er det, der gør sporten særlig: tyngden ligger i de små skoler i nordøst, hvor lacrosse er hovedsporten, og hvor holdene rekrutterer bredt i udlandet — England, Canada og Australien fylder mest.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [ScholarshipStats.com. (n.d.). Lacrosse scholarships and college programs.](https://scholarshipstats.com/lacrosse)
- [NCAA.com. (2026, May 3). NCAA Division I women''s lacrosse championship subcommittee announces 2026 field.](https://www.ncaa.com/news/lacrosse-women/article/2026-05-03/ncaa-division-i-womens-lacrosse-championship-subcommittee-announces-2026-field)
- [USA Lacrosse. (2026). NCAA 2026 preview: Your guide to the college lacrosse season.](https://www.usalacrosse.com/magazine/college/ncaa-2026-preview-your-guide-college-lacrosse-season)', updated_at = datetime('now')
 WHERE slug = 'lacrosse' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Softball i NCAA

Softball er kvindesporten med flest programmer i amerikansk college-sport. Den er ikke damebaseball: banen er mindre, kastet er underhånds, og kampen er kortere — men rekrutteringen, sæsonstrukturen og mesterskabet ligner baseballs til forveksling.

### Sæsonens gang

Sæsonen begynder i begyndelsen af februar og slutter først i juni. I 2026 løb Division I-sæsonen fra 5. februar til 5. juni med 309 hold. Slutspillet begynder med 16 regionalstævner i midten af maj, fortsætter i super-regionaler, og de sidste otte hold mødes ved Women''s College World Series i Oklahoma City — i 2026 fra 28. maj til 5. juni, hvor Texas vandt.

### Formatet
Syv innings, ikke ni. Pitcheren kaster underhånds fra en kortere afstand end i baseball, og kombinationen af kort bane og hurtige kast gør spillet tættere: en enkelt fejl i infielden afgør ofte kampen.

### Stipendier og trupstørrelse
1.673 amerikanske colleges har softball, fordelt på NCAA''s tre divisioner, NAIA, junior colleges og et par mindre forbund — tilsammen næsten 35.000 spillere. Division I tæller 310 skoler, Division II 277 og Division III 401. Efter House-forliget er Division I''s legatloft afløst af et rosterloft på 25 spillere, som alle kan få fuldt legat; Division II har 7,2 legater, og Division III giver ingen.

### Conferences og independents

Softball spilles i weekendserier mod conference-modstandere, og conference-turneringen i maj giver en automatisk plads i NCAA-slutspillet. Resten af feltet udvælges nationalt, og dér vejer geografi tungt: programmer i den varme sydstat spiller udendørs fra februar og opbygger stærkere resultatlister end nordlige skoler, der stadig venter på vejret. Det er også derfor, sportens tyngdepunkt ligger i syd og sydvest.

Enkelte skoler spiller som independents uden conference og skal selv stykke et kampprogram sammen.

### Vejen til prof

Der findes professionel softball i USA, men ligaen er lille sammenlignet med sportens college-niveau, og de fleste spillere stopper efter college eller fortsætter på landsholdet. Softball har været ind og ud af det olympiske program, hvilket gør landsholdsvejen mindre forudsigelig end i andre sportsgrene. For en dansk spiller er college derfor målet i sig selv: fire år med topkonkurrence og en amerikansk uddannelse.

### Tidbits

Women''s College World Series er blandt de bedst besøgte NCAA-mesterskaber overhovedet — Devon Park i Oklahoma City er sportens faste hjem, og finalerne sendes på ESPN i bedste sendetid.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [ScholarshipStats.com. (n.d.). Softball scholarships and college programs.](https://scholarshipstats.com/softball)
- [NCAA.com. (2026, June 4). Texas wins the 2026 NCAA DI softball championship.](https://www.ncaa.com/news/softball/article/2026-06-04/2026-ncaa-softball-tournament-bracket-schedule-womens-college-world-series-scores)', updated_at = datetime('now')
 WHERE slug = 'softball' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Brydning i NCAA

Brydning er en vinterens sport i USA og en af de mest gennemorganiserede: vægtklasser, dueller mellem skoler og et mesterskab, der fylder en NBA-arena. **Det største nye er kvindernes:** NCAA afviklede sit første damemesterskab i brydning 6.-7. marts 2026 i Coralville, Iowa, og brydning blev dermed NCAA''s 91. mesterskabssport. McKendree vandt den første titel 171-166 over Iowa.

### Sæsonens gang

Dueller og stævner fylder vinteren fra november, conference-mesterskaberne ligger i begyndelsen af marts, og NCAA-mesterskabet afvikles midt i måneden — herrernes Division I-mesterskab blev i 2026 afgjort 19.-21. marts i Cleveland.

### Formatet
Der brydes i vægtklasser, og en holddyst er summen af de individuelle kampe. Ved damernes første NCAA-mesterskab blev der kåret mestre i ti klasser fra 103 til 207 pund. En kamp vindes på point, på teknisk overlegenhed eller på fald — og faldet afslutter kampen på stedet, uanset stillingen.

### Stipendier og trupstørrelse
440 amerikanske colleges har brydning: 433 herrehold og 170 damehold på tværs af NCAA, NAIA og junior colleges, med godt 12.400 mandlige og 2.050 kvindelige brydere. Division I-programmer råder over op til 30 legater pr. køn, Division II over 9 og 10, mens Division III ikke giver sportslegater.

### Conferences og independents

Brydning har sine egne conferences, og de følger ikke nødvendigvis skolens øvrige tilhørsforhold — flere universiteter bryder i en anden conference end den, deres holdsport spiller i, fordi ikke alle conferences har brydning. Conference-mesterskaberne i februar og marts fordeler pladserne til NCAA-mesterskabet, men kvalifikationen er i sidste ende **individuel og vægtklassebestemt**: man bryder sig ind på det nationale mesterskab i sin egen vægtklasse, og holdets samlede titel er summen af, hvor langt de enkelte brydere når.

Det betyder, at en enkelt stærk bryder kan nå NCAA-mesterskabet fra et program, der ikke er blandt landets bedste.

### Vejen til prof

Der er ingen stor professionel brydeliga. Vejen videre er landsholdet og de olympiske stilarter — fristil og græsk-romersk — med EM, VM og OL som mål, og amerikansk college-brydning er verdens største udviklingssystem for netop det. En anden rute er blevet påfaldende almindelig: MMA og UFC rekrutterer i stort omfang blandt tidligere college-brydere, fordi brydegrundlaget oversættes direkte til burets greb og takedowns. For en dansk bryder er college først og fremmest adgang til daglig træning og hård modstand på et niveau, der ikke findes hjemme.

### Tidbits

Damebrydning er en af de hurtigst voksende college-sportsgrene overhovedet — og at den nåede mesterskabsstatus i 2026 er den seneste påmindelse om, at NCAA''s sportsliste ikke er en fast størrelse.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (2026, March 4). NCAA''s first women''s wrestling championships: What to know.](https://www.ncaa.org/media-center-ncaas-first-womens-wrestling-championships-what-to-know/)
- [NCAA.com. (2026, March 7). McKendree clinches the 2026 NC women''s wrestling championship.](https://www.ncaa.com/news/wrestling-women/article/2026-03-07/mckendree-clinches-2026-nc-womens-wrestling-championship)
- [ScholarshipStats.com. (n.d.). Wrestling scholarships and college programs.](https://scholarshipstats.com/wrestling)', updated_at = datetime('now')
 WHERE slug = 'brydning' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Bowling i NCAA

Bowling er en NCAA-sport for kvinder, og som fægtning og vandpolo har den ét fælles mesterskab: hold fra Division I, II og III spiller om den samme titel. Herrebowling findes på en del skoler, men uden NCAA-mesterskab.

### Sæsonens gang

Sæsonen løber hen over efteråret og vinteren i stævneform, og mesterskabet afgøres i april. Det 22. NCAA-mesterskab blev spillet 10.-11. april 2026 i Parma Heights, Ohio, med 19 hold — Jacksonville State slog Wichita State i finalen og vandt sin anden titel.

### Formatet
Det er ikke fem individuelle serier lagt sammen. Mesterskabet bruger **Baker-formatet**, hvor de fem spillere deles om den samme serie og slår hver anden frame — holdet er ét spil, ikke fem. Regionalstævnerne afgøres bedst af tre: femmandsserie, samlet Baker-kegletal og til sidst Baker-matchspil, og selve titlen findes i et bedst-af-syv Baker-opgør.

### Stipendier og trupstørrelse
37 Division I-skoler, 43 i Division II og 34 i Division III har damebowling. Division I-programmer råder over op til 10 legater, Division II over 5, og Division III giver ingen sportslegater.

### Conferences og independents

Bowling er en lille sport i NCAA-sammenhæng og har et tilsvarende tyndt conference-landskab: flere hold spiller i bowlingspecifikke sammenslutninger frem for i skolens hovedconference, og sæsonen består i høj grad af invitationsstævner frem for faste conference-kampe. Kvalifikationen til mesterskabet bygger derfor på resultater gennem sæsonen og en national udvælgelse.

Som i vandpolo afvikler NCAA ét samlet mesterskab på tværs af divisionerne i bowling frem for et pr. division — små skoler og store spiller om den samme titel.

### Vejen til prof

Der findes professionel bowling i USA, men det er en sport, hvor de færreste lever af præmiepengene alene. Vejen videre for en dansk spiller går typisk hjem til europæisk turneringsbowling og landsholdet. College giver til gengæld noget, der er svært at finde andre steder: struktureret daglig træning, en træner og et hold — i en sport, der ellers overvejende dyrkes individuelt.

### Tidbits

Baker-formatet er grunden til, at college-bowling ser anderledes ud på tv end alt andet bowling: én dårlig frame er hele holdets, og en finale kan vende på to kast.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (n.d.). National Collegiate bowling.](https://www.ncaa.org/championship/national-collegiate/womens-bowling/)
- [NCAA.com. (2026, April 11). Jax State wins 2026 NC bowling championship.](https://www.ncaa.com/news/bowling/article/2026-04-11/jax-state-wins-2026-nc-bowling-championship)
- [ScholarshipStats.com. (n.d.). Bowling scholarships and college programs.](https://scholarshipstats.com/bowling)', updated_at = datetime('now')
 WHERE slug = 'bowling' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Sejlsport i amerikansk college-sport

**Collegesejlsport ligger uden for NCAA.** Den styres af Inter-Collegiate Sailing Association, sejlsportens eget college-forbund, og det er ICSA — ikke NCAA — der afvikler de nationale mesterskaber. Sporten er varsity på en lang række skoler, med trænere, bådpark og fulde kapsejladsprogrammer.

### Sæsonens gang

Der sejles både efterår og forår. Efteråret bruges på ranglistestævner, mens de nationale mesterskaber ligger i maj. I 2026 blev fleet race-mesterskaberne sejlet i St. Petersburg i Florida: kvindernes fra 15. maj, det åbne fra 19. maj, hvert med 36 hold delt i to grupper, hvor de ni bedste i hver gik videre til de afsluttende dage.

### Formatet
ICSA kårer nationale mestre i syv kategorier: åben og kvinders fleet race, åben og kvinders team race, herrer og kvinders singlehanded samt match race. "Åben" betyder mixed — mænd og kvinder sejler i samme både og mod hinanden, hvilket er sjældent i amerikansk skolesport. Team racing, hvor tre både pr. skole sejler taktisk mod tre andre, er sportens mest særegne disciplin.

### Stipendier og trupstørrelse

Fordi collegesejlsport ligger uden for NCAA, gælder NCAA''s stipendieregler og trupslofter ikke. Hvad en sejler kan få i støtte, er den enkelte skoles egen sag, og i praksis er akademiske legater og behovsbestemt studiestøtte den almindelige vej — ikke idrætsstipendier.

Det har en konsekvens, der er værd at planlægge efter: programmerne ligger i vid udstrækning på gamle, akademisk krævende universiteter med store legatordninger, så karaktererne og ansøgningen betyder mere for økonomien end sejlresultaterne gør.

### Conferences og independents
Programmerne er koncentreret på øst- og vestkysten og omkring de store søer, og de bedste ligger på skoler med lange maritime traditioner. Kvindernes team race-mesterskab er nyt — det blev indstiftet i 2022 — og Stanford vandt det i 2026, mens Brown vandt det åbne fleet race-mesterskab for første gang siden 1948.

ICSA er inddelt i regionale conferences — New England, Mid-Atlantic, Syd, Midtvesten og Vest — og det er dem, sæsonen kredser om: kvalifikationen til de nationale mesterskaber går gennem regionale stævner frem for gennem en landsdækkende grundserie. Conferencen har altså intet med skolens øvrige sportslige tilhørsforhold at gøre; den følger vandet.

### Vejen til prof

Professionel sejlsport findes, men den er smal og projektbaseret — kølbådskredsløb, America''s Cup-satsninger og olympiske kampagner snarere end en liga med kontrakter. Vejen videre fra college går derfor gennem landsholdet og de olympiske klasser eller ind i den professionelle kapsejladsverden via netværk. Til gengæld er college-sejlsport et af de tætteste konkurrencemiljøer, der findes i sporten: mange stævner på en kort sæson og daglig træning i en bådpark, de færreste klubber kan matche.

### Tidbits

Team racing — tre både pr. skole mod tre andre, hvor det gælder om at kontrollere modstanderens placeringer frem for blot at sejle hurtigt — er den disciplin, der overrasker europæiske sejlere mest. Den findes stort set ikke i europæisk kapsejlads på samme niveau, og den er taktisk krævende på en helt anden måde end fleet racing.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [Inter-Collegiate Sailing Association. (n.d.). Championships.](https://www.collegesailing.org/championships/coed)
- [College Sailing National Championships. (2026). National championship regatta.](https://nationals.collegesailing.org/)
- [Inter-Collegiate Sailing Association. (n.d.). Women''s team race championships.](https://www.collegesailing.org/championships/womens-team-race)', updated_at = datetime('now')
 WHERE slug = 'sejlsport' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Skydning i amerikansk college-sport

Skydning dækker to nært beslægtede college-sportsgrene med hver sit forbund. **Riffel er NCAA-sport** med ét mesterskab for alle divisioner — og en sjældenhed i amerikansk skolesport: mænd og kvinder skyder i samme konkurrence om de samme titler. Formelt er riffel registreret som en herresport i NCAA''s regelværk, men den har været mixed siden 1980. **Pistol er ikke NCAA-sport**; de kollegiale pistolmesterskaber afvikles af NRA.

### Sæsonens gang

Riffelsæsonen løber hen over vinteren, og NCAA-mesterskabet afgøres i marts. I 2026 var Ohio State vært 13.-14. marts: smallbore med tre stillinger den første dag, luftgevær den anden. West Virginia vandt for andet år i træk — universitetets 21. riffeltitel. Pistolskytterne mødtes samme forår til det kollegiale mesterskab i Columbia, Missouri, hvor Ohio State vandt.

### Formatet
Riffelmesterskabet er en sammenlagt score over to dage: smallbore skydes i tre stillinger — liggende, stående og knælende — mens luftgevær kun skydes stående. Otte hold kvalificerer sig, og både hold- og individuelle titler afgøres på aggregatet. På pistolsiden skydes der i discipliner som frempistol, standardpistol og luftpistol.

### Stipendier og trupstørrelse

Riffel er en NCAA-sport, og stipendierne følger NCAA''s equivalency-model — de deles ud i brøkdele, og fulde stipendier er sjældne. Antallet af programmer er lille, så der er få pladser i alt, men til gengæld er feltet internationalt og rekrutterer gerne europæiske skytter med resultater fra ISSF-stævner.

**Pistol er derimod ikke en NCAA-sport**, og dér gælder ingen NCAA-stipendieregler; støtten afhænger af den enkelte skole. Forskellen mellem de to våbengrene er altså ikke kun sportslig — den afgør, hvilket regelsæt økonomien følger. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents
Feltet er lille og tæt: NCAA-mesterskabet i 2026 havde otte kvalificerede hold, blandt dem Kentucky, Nebraska, TCU, West Virginia, Ole Miss, Alaska-Fairbanks, Naval Academy og Georgia Southern. Netop fordi konkurrencen er mixed og feltet smalt, er internationale skytter en fast bestanddel af de bedste programmer.

Riffel har sine egne conferences, som ikke følger skolens øvrige tilhørsforhold, og sæsonen består af stævner frem for indbyrdes kampprogrammer. NCAA afvikler ét samlet mesterskab på tværs af divisionerne — og som nævnt skyder mænd og kvinder om de samme titler, hvilket er enestående i amerikansk skolesport.

### Vejen til prof

Der findes ingen professionel skydeliga. Vejen videre er landsholdet og ISSF-kredsløbet med EM, VM, World Cup og OL som mål. College-riffel passer usædvanligt godt til det, fordi disciplinerne — luftriffel og smallbore — er de samme, man skyder internationalt, og fordi fire år med daglig træning og fast træner er svært at finansiere på anden vis.

### Tidbits

NRA vendte i 2026 tilbage til collegepistol efter syv års pause — et forbund, der havde ligget stille, mødtes igen med resten af skydesporten på samme bane samme weekend.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA.com. (2026, March 14). West Virginia wins 2026 NCAA rifle championship.](https://www.ncaa.com/news/rifle/article/2026-03-14/west-virginia-wins-2026-ncaa-rifle-championship)
- [NCAA.com. (2026, February 23). 2026 National Collegiate men''s and women''s rifle selections.](https://www.ncaa.com/news/rifle/article/2026-02-23/2026-national-collegiate-mens-and-womens-rifle-selections)
- [NRA Shooting Sports USA. (2026). Ohio State captures 2026 intercollegiate pistol crown as NRA returns to the range.](https://www.ssusa.org/content/ohio-state-captures-2026-intercollegiate-pistol-crown-as-nra-returns-to-the-range/)', updated_at = datetime('now')
 WHERE slug = 'skydning' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Skisport i NCAA

NCAA-ski er bygget anderledes end enhver anden vintersport i USA: **alpint og langrend er det samme hold**, mænd og kvinder scorer til den samme titel, og der findes kun ét mesterskab på tværs af divisionerne. Et universitet vinder altså ikke på slalom alene — det skal have både fartløbere og langrendsløbere.

### Sæsonens gang

Sæsonen løber gennem vinteren med regionale stævner, og mesterskabet afgøres i marts. I 2026 blev det afviklet 11.-14. marts i Utah: alpint i Utah Olympic Park i Park City, langrend i Soldier Hollow. Utah vandt for andet år i træk — programmets 18. NCAA-titel.

### Formatet
Der køres otte konkurrencer: slalom og storslalom for begge køn, og klassisk og fri stil i langrend for begge køn. 74 mænd og 74 kvinder udtages regionalt — to regioner i alpint, tre i langrend — og hver skole må højst stille med tolv løbere, tre pr. køn pr. disciplin. Pointene lægges sammen på tværs af det hele.

### Stipendier og trupstørrelse

Ski er en NCAA-sport med et samlet mesterskab, og stipendierne følger equivalency-modellen. For de Division I-skoler, der tilsluttede sig House-forliget i 2025, er stipendieloftet afløst af et **truploft på 16 løbere** — et af de mindste i college-sporten, og det skal tilmed dække både alpint og langrend på tværs af køn.

Det lille loft forklarer, hvorfor college-ski er så udpræget international: når et program kun har 16 pladser og skal score point i alle fire discipliner, rekrutteres der efter resultater, og de findes i Norge, Sverige, Schweiz og Østrig. En dansk løber konkurrerer altså mod et nordisk felt om pladserne. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents
Feltet er koncentreret i Rocky Mountains, New England og Alaska, hvor sneen er, og det er blandt de mest internationale i college-sporten: norske, svenske og finske løbere fylder meget på de bedste hold, netop fordi den nordiske træningskultur passer direkte ind i formatet.

Ski har sine egne regionale conferences — øst og vest — fordi geografien afgør alt i en sport, der kræver sne og højde. Kvalifikationen til NCAA-mesterskabet går gennem regionale stævner, og NCAA afvikler ét samlet mesterskab, hvor alpint og langrend, mænd og kvinder, scorer point til den samme holdtitel. Et program uden begge discipliner kan derfor ikke vinde.

### Vejen til prof

Vejen videre er landsholdet og World Cup-kredsløbet — der findes ingen anden professionel struktur i skisport. College fungerer for mange europæiske løbere som et alternativ til at satse alt på en landsholdsplads som nittenårig: fire år med træning, konkurrencer og en uddannelse, uden at karrieren lukkes.

### Tidbits

Kombinationen af alpint og langrend i én holdscore er unik for USA. Ingen andre steder i verden afgøres et universitetsmesterskab på, at den samme skole både kan køre storslalom og gå klassisk.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA.com. (2026, March 4). 2026 NCAA skiing championships: Schedule, selections, results, how to watch.](https://www.ncaa.com/news/skiing/article/2026-03-04/2026-ncaa-skiing-championships-schedule-selections-results-how-to-watch)
- [NCAA.com. (2026, March 14). Utah wins 2026 NCAA skiing championship.](https://www.ncaa.com/news/skiing/article/2026-03-14/utah-wins-2026-ncaa-skiing-championship)
- [NCAA.com. (2026, March 4). NC men''s and women''s skiing committee selects 2026 championship field.](https://www.ncaa.com/news/skiing/article/2026-03-04/nc-mens-and-womens-skiing-committee-selects-2026-championship-field)

- [NCAA. (2025, 23. juni). DI Board of Directors formally adopts changes to roster limits.](https://www.ncaa.org/media-center-di-board-of-directors-formally-adopts-changes-to-roster-limits/)', updated_at = datetime('now')
 WHERE slug = 'skisport' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Triatlon i amerikansk college-sport

Triatlon er en af NCAA''s fire nuværende emerging sports for kvinder — en anerkendt sport på vej mod fuldt mesterskab, men ikke fremme endnu. Den blev optaget i 2014, og i 2025-26 har 42 institutioner varsity-triatlon, heraf 14 i Division II. Der findes ingen tilsvarende NCAA-vej for mænd.

### Sæsonens gang

Triatlon er en efterårssport i USA, hvilket vender kalenderen på hovedet for en europæisk triatlet. Sæsonen kulminerer i november, og USA Triathlon afvikler mesterskabsløbet for alle tre NCAA-divisioner — i 2026 i Tempe, Arizona.

### Formatet
College-triatlon køres på **sprintdistancen med drafting tilladt**: 750 meter svøm i åbent vand, 20 kilometer på cykel og 5 kilometer løb. At drafting er tilladt, ændrer sporten fundamentalt — cykelfeltet kører taktisk i grupper som i landevejscykling i stedet for hver for sig, og løbet afgøres derfor oftest på de sidste fem kilometer.

### Stipendier og trupstørrelse

Triatlon er en af NCAA''s emerging sports for kvinder — en anerkendt vej mod fuldt mesterskab — og stipendierne følger NCAA''s equivalency-model, altså delvise andele frem for fulde stipendier. **For mænd findes sporten ikke i NCAA**, og en mandlig triatlet må søge andre veje, typisk gennem et universitets klubprogram uden idrætsstøtte.

Antallet af programmer er stadig lille, men det er selve pointen med emerging sport-status: listen vokser, og flere skoler kommer til. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents
Antallet af programmer vokser støt, og Conference Carolinas blev i efteråret 2026 den første NCAA-konference til at sponsorere sporten samlet. Vejen videre går gennem NCAA''s emerging sports-proces, hvor en sport skal have et bestemt antal værtsskoler for at få sit eget mesterskab.

### Vejen til prof

Vejen videre er landsholdet og World Triathlon-kredsløbet med OL som det store mål, eller den professionelle langdistancescene. College-triatlon er attraktiv, fordi den samler svømmebassin, cykeltræner og løbeprogram ét sted med adgang til fysioterapi og styrketræning — en infrastruktur, en ung triatlet ellers selv skal stykke sammen og betale for.

### Tidbits

Triatlon deler emerging sport-status med rugby, ridning og flag football. Otte sportsgrene er siden 1994 gået hele vejen fra emerging sport til fuldt NCAA-mesterskab, så statussen er en begyndelse og ikke en blindgyde.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [USA Triathlon. (n.d.). NCAA triathlon.](https://www.usatriathlon.org/multisport/ncaa-triathlon)
- [NCAA. (n.d.). Emerging sports for women.](https://www.ncaa.org/championships/emerging-sports-for-women/)
- [NCAA. (2026, May 4). Conference Carolinas announces the addition of women''s triathlon.](https://www.ncaa.org/news/2026/5/4/media-center-conference-carolinas-announces-the-addition-of-womens-triathlon.aspx)', updated_at = datetime('now')
 WHERE slug = 'triatlon' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Hestepolo i amerikansk college-sport

Hestepolo på college styres af United States Polo Association gennem forbundets Intercollegiate/Interscholastic-program. **Det er ikke en NCAA-sport**, men det er organiseret konkurrence med regionale kredse og et nationalt mesterskab — og det er en af de få college-sportsgrene, hvor holdene bruger skolens egne heste.

### Sæsonens gang

Sæsonen følger studieåret og afgøres i det tidlige forår: de nationale intercollegiate-mesterskaber blev i 2026 spillet 16.-22. marts, efter at de bedste herre- og damehold havde kvalificeret sig gennem deres regioner.

### Formatet
College-polo spilles **i arena, ikke på græsbane**, efter USPA''s arenaregler. Det betyder tre spillere pr. hold i stedet for fire, en mindre bane med bander og en større, blødere bold. Holdene deler hestene efter et "split string"-princip, hvor begge hold rider på den samme pulje — netop for at kampen afgøres af spillerne og ikke af, hvem der har de dyreste heste.

### Stipendier og trupstørrelse

**Polo er ikke en NCAA-sport.** Den kollegiale polo styres af United States Polo Association, og NCAA''s stipendieregler og trupslofter gælder dermed ikke. Støtte er den enkelte skoles egen sag, og i praksis findes der kun ganske få idrætsstipendier i sporten — akademiske legater og studiestøtte er den normale vej.

Til gengæld løser college-polo et problem, der ellers er uoverstigeligt for en europæisk spiller: skolerne stiller hestene til rådighed. At kunne spille uden at eje eller transportere ponyer er den egentlige økonomiske gevinst ved ruten.

### Conferences og independents
Over 35 etablerede intercollegiate-programmer fordeler sig på 15 herrehold og 26 damehold i fire regioner. Feltet er lille, men stabilt, og USPA driver desuden et internationalt intercollegiate-opgør, hvor amerikanske collegespillere møder udenlandske.

Der findes ingen conferences i NCAA-forstand i polo, fordi sporten ligger uden for NCAA. United States Polo Association inddeler i stedet de kollegiale hold i regioner, og sæsonen bygger op til et regionalt kvalifikationsforløb og derfra et nationalt mesterskab. Strukturen følger altså sportens egen geografi og har intet at gøre med, hvilken conference skolens øvrige hold spiller i.

### Vejen til prof

Professionel polo er en lille, netværksbåret verden bygget op om klubber og private hold frem for om ligaer med kontrakter. College-polo er ikke en formel fødekæde til den, men den er et af de få steder, hvor man kan spille meget, ofte og på et højt niveau uden selv at holde heste — og netop derfor et sted, hvor spillere bliver set.

### Tidbits

College-polo spilles som **arenapolo**: tre spillere pr. hold i en indhegnet arena med en større, blødere bold, i stedet for fire mod fire på en udendørs græsbane. Det er en hurtigere og mere kompakt version af sporten, og den er væsentligt billigere at drive — hvilket er hele grunden til, at den kunne blive en universitetssport.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [United States Polo Association. (n.d.). Intercollegiate.](https://www.uspolo.org/association/programs/intercollegiate-interscholastic/intercollegiate)
- [United States Polo Association. (n.d.). Division I men''s national intercollegiate championship.](https://www.uspolo.org/calendar/tournaments/division-i-mens-national-intercollegiate-championship)
- [United States Polo Association. (2026). USA roster announced for 2026 international intercollegiate challenge cup.](https://www.uspolo.org/news-social/news/usa-roster-announced-for-2026-international-intercollegiate-challenge-cup)', updated_at = datetime('now')
 WHERE slug = 'hestepolo' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Flag football i amerikansk college-sport

Flag football er den sportsgren, der lige nu bevæger sig hurtigst i amerikansk college-sport. NCAA optog den i januar 2026 i sit emerging sports-program for kvinder, og mere end 120 skoler stiller hold i indeværende studieår. NAIA gik skridtet videre og gjorde flag football til forbundets 30. mesterskabssport fra 2026-27, med det første nationale NAIA-mesterskab i foråret 2027 og omkring 60 deltagende institutioner.

**Og så er den OL-sport.** Flag football får debut ved legene i Los Angeles i 2028 med seks hold i hver af de to turneringer, herrer og kvinder, og ti spillere pr. trup.

### Sæsonens gang

College-sæsonen ligger i foråret. Vejen mod et NCAA-mesterskab går gennem emerging sports-programmet, hvor en sport skal have mindst 40 skoler med varsity-hold og opfylde krav til antal kampe og deltagelse — en tærskel flag football allerede havde passeret, da NCAA optog den.

### Formatet
Fem spillere på banen fra hver side, ingen tacklinger: forsvaret stopper spillet ved at rive et flag af angriberens bælte. Banen er 70 gange 25 yards med to endzoner på ti yards, og kampen varer 40 minutter fordelt på to halvlege. Angrebet har fire forsøg til at nå midten af banen og derefter fire til at nå endzonen.

### Stipendier og trupstørrelse

Flag football er en af NCAA''s emerging sports for kvinder, og stipendierne følger NCAA''s equivalency-model — delvise andele frem for fulde stipendier. For de Division I-skoler, der tilsluttede sig House-forliget i 2025, er der et **truploft på 25 spillere**.

Sporten vokser hurtigere end noget andet på listen, fordi den er billig at starte: der kræves hverken udstyr, hjelme eller et stadion, kun en bane. For en dansk spiller betyder det, at antallet af programmer er lille i dag og sandsynligvis større i morgen. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Fordi sporten er så ny, er conference-landskabet stadig under opbygning: flere skoler spiller i midlertidige eller sportsspecifikke sammenslutninger, og sæsonen er i høj grad bygget om stævner frem for et fast conference-program. Det er præcis, hvad man skal forvente af en emerging sport — strukturen kommer efter holdene.

Det gør det også lettere at komme til: et nyt program har ikke tyve års rekrutteringsnetværk at konkurrere mod.

### Vejen til prof

Den store nyhed for sporten er ikke professionel: **flag football er på det olympiske program ved legene i Los Angeles i 2028**, og det har på få år ændret sportens status fra skolegårdsvariant til landsholdsdisciplin. Vejen videre for en europæisk spiller går derfor gennem landsholdet og de internationale mesterskaber — og et amerikansk college-program er i dag et af de bedste steder at træne mod det mål.

### Tidbits

Kombinationen er usædvanlig: en sport, der først for nylig fik en plads i college-systemet, står allerede med OL-debut foran sig. Det gør rekrutteringsvinduet kort og synligheden stor for de spillere, der er med nu.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (2026, January 16). NCAA adds flag football to Emerging Sports for Women program.](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-adds-flag-football-to-emerging-sports-for-women-program.aspx)
- [NAIA. (n.d.). Women''s flag football.](https://www.naia.org/sports/wflag/index)
- [Olympics.com. (n.d.). Flag football at the Olympic Games Los Angeles 2028: Everything you need to know.](https://www.olympics.com/en/news/flag-football-at-the-olympic-games-los-angeles-2028-everything-you-need-to-know-about-the-new-sport-at-la-28)', updated_at = datetime('now')
 WHERE slug = 'flag-football' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Cykling i amerikansk college-sport

Collegecykling ligger uden for NCAA og styres af USA Cycling, som afvikler de nationale collegemesterskaber. Til gengæld er der flere af dem end i nogen anden college-sportsgren: landevej, bane, mountainbike og cyclocross har hvert sit mesterskab, og i 2026 kom gravel til som det femte.

### Sæsonens gang

Kalenderen følger disciplinerne hen over hele året i stedet for at samle sig om én sæson. I 2026 blev banemesterskabet kørt 10.-13. september på Major Taylor Velodrome i Indianapolis, mountainbike 7. oktober i Grand Junction i Colorado og cyclocross 9. december i Fayetteville i Arkansas, mens landevejsmesterskabet blev afviklet i Wisconsin.

### Formatet

Kollegial cykling dækker fire discipliner med hver sin sæson og sin egen logik: landevej om foråret, med både enkeltstart, linjeløb og kriterium; bane, hvor der findes velodromer; mountainbike om efteråret; og cyclocross om vinteren. Point fra de enkelte løb lægges sammen til en holdscore, så et bredt hold, der scorer i flere discipliner, slår et hold med en enkelt stjerne.

### Stipendier og trupstørrelse

**Cykling er ikke en NCAA-sport.** Den kollegiale cykling styres af USA Cycling, og NCAA''s stipendieregler og trupslofter gælder ikke. De fleste programmer drives som klubhold med begrænset eller ingen idrætsstøtte, og en enkelt skole med et seriøst program er undtagelsen, ikke reglen.

For en dansk rytter betyder det, at man skal regne med at finansiere studiet ad akademisk vej. Til gengæld er kravene til at deltage lave, og adgangen til at køre løb hver weekend i et organiseret miljø er reel.

### Conferences og independents
Skolerne kører i to rækker: en varsity-division og en klubdivision. Ved mountainbike-mesterskabet er varsity-feltet omkring 15-20 skoler, mens klubdivisionen tæller over 30 — en struktur, der betyder, at en dansk rytter kan køre for sit universitet, uanset om skolen har et fuldt program eller en klub.

USA Cycling inddeler de kollegiale hold i regionale conferences, og det er dem, sæsonen kredser om: man kører løb mod skolerne i sin egen region og kvalificerer sig derfra til de nationale mesterskaber. Conferencen har intet at gøre med skolens øvrige sportslige tilhørsforhold — den følger geografien og disciplinen.

### Vejen til prof

Vejen til professionel cykling går ikke gennem amerikansk college — den går gennem europæiske kontinentalhold og udviklingshold, som den altid har gjort. College-cykling er derfor for de fleste et sted at køre løb og holde formen ved siden af en uddannelse, ikke et springbræt. Det er værd at være ærlig om, inden man vælger ruten på sportslige grunde alene.

### Tidbits

Fra 2026 kører USA Cycling også high school-klasser ved tre af collegemesterskaberne — bane, mountainbike og cyclocross — så juniorfeltet og collegefeltet mødes på den samme bane den samme weekend.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [USA Cycling. (n.d.). National championships.](https://usacycling.org/national-championships)
- [USA Cycling. (2026). USA Cycling announces 2026 national championship schedule.](https://usacycling.org/article/usa-cycling-announces-2026-national-championship-schedule)
- [USA Cycling. (n.d.). Collegiate mountain bike national championships.](https://mtbnats.usacycling.org/coll-mtb)', updated_at = datetime('now')
 WHERE slug = 'cykling' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Bueskydning i amerikansk college-sport

Bueskydning på college ligger uden for NCAA og drives af USA Archery gennem forbundets Collegiate Archery Program. Programmet dækker hele spændet: varsity-hold med legater, klubhold og studenterforeninger skyder i det samme system og til de samme mesterskaber.

### Sæsonens gang

Sæsonens omdrejningspunkt er Collegiate Target Nationals, som i 2026 blev skudt i Lansing i Michigan fra 14. til 17. maj. Indendørssæsonen ligger i vintermånederne op til det.

### Formatet
Der skydes i fire klasser — recurve, compound, barebow og bowhunter — for både mænd og kvinder, og alle fire tæller med i det samlede nationale holdmesterskab. Buetypen er altså både disciplin og holdopstilling: en skole kan vinde samlet uden at have den bedste enkeltskytte i nogen af klasserne.

### Stipendier og trupstørrelse

**Bueskydning har ikke et NCAA-mesterskab**, og sporten styres kollegialt af bueskydningens egne forbund. NCAA''s stipendieregler og trupslofter gælder derfor ikke. Nogle få universiteter driver seriøse programmer med egen træner og anlæg og kan tilbyde støtte efter skolens egne regler; de fleste steder er bueskydning et klubtilbud.

For en dansk bueskytte betyder det, at man skal undersøge det enkelte program konkret frem for at regne med en fælles standard — forskellen mellem det bedste og det typiske program er større i bueskydning end i næsten nogen anden sport her.

### Conferences og independents
Feltet spænder fra store universiteter med fuldt finansierede varsity-programmer til rene klubhold, og netop derfor er adgangen bredere end i de fleste andre college-sportsgrene. USA Archery kårer desuden et akademisk All-American-hold, hvor karaktergennemsnittet tæller på linje med resultaterne.

Bueskydning har ingen conferences i NCAA-forstand, da sporten ikke er en NCAA-sport. Holdene konkurrerer i bueskydningens egne kollegiale rækker med indendørs- og udendørssæson og et nationalt mesterskab i hver. Et universitets conference-tilhørsforhold i de store sportsgrene siger derfor intet om, hvor og mod hvem dets bueskytter skyder.

### Vejen til prof

Der findes ingen professionel bueskydningsliga. Vejen videre er landsholdet og World Archery-kredsløbet med EM, VM og OL som mål. De stærkeste amerikanske collegeprogrammer træner direkte mod de discipliner, der skydes internationalt, og kan dermed fungere som et fireårigt eliteforløb med uddannelse — men det forudsætter, at man vælger et af de få programmer, hvor det er tilfældet.

### Tidbits

Bueskydning er en af de sportsgrene, hvor amerikansk college fungerer mest forskelligt fra sted til sted: på nogle skoler er det en fuldt udbygget konkurrencesport med daglig træning, andre steder en fritidsklub. Spørg ind til trænerens baggrund og til, hvilke stævner holdet faktisk rejser til.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [USA Archery. (n.d.). Collegiate archery.](https://www.usarchery.org/participate/collegiate)
- [USA Archery. (2026). USA Archery Collegiate Target Nationals.](https://www.usarchery.org/events/national-tournaments/USA-Archery-Collegiate-Target-Nationals)
- [USA Archery. (2026). USA Archery announces the 2026 All-American Academic Team.](https://www.usarchery.org/news/top-athletes-and-top-students-usa-archery-announces-the-2026-all-american-academic-team)', updated_at = datetime('now')
 WHERE slug = 'bueskydning' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Akrobatik og tumbling i NCAA

Acrobatics & tumbling er den nyeste sportsgren på NCAA''s liste. Ved konventet i januar 2026 stemte medlemmerne fra alle tre divisioner for at gøre den til mesterskabssport, og det første NCAA-mesterskab ventes afviklet i foråret 2027. Indtil da afvikles mesterskabet af National Collegiate Acrobatics & Tumbling Association, som har drevet sporten siden længe før NCAA kom med.

**Det er en kvindesport**, og den er vokset ad den samme vej som kvinderugby og triatlon: ind i NCAA''s emerging sports-program i august 2020, forbi tærsklen på 40 varsity-skoler, og videre til eget mesterskab. I dag har 52 NCAA-institutioner sporten på varsity-niveau med over 1.300 udøvere.

### Sæsonens gang

Akrobatik og tumbling er en forårssport. Sæsonen løber fra januar til april og afgøres ved et nationalt mesterskab sidst på foråret. En dyst er bygget op i seks faser — compulsory, acro, pyramid, toss, tumbling og til sidst team-rutinen — hvor hvert element gives point af dommere, og holdscoren lægges sammen undervejs.

### Formatet
Et møde består af **seks discipliner** og varer typisk halvanden til to timer. Holdene udfører synkrone serier i akrobatik, pyramide, kast, tumbling og en afsluttende holdrutine, og hver færdighed bedømmes på både sværhedsgrad og udførelse. Formatet er bygget som en direkte duel mellem to hold — pointene lægges sammen undervejs, så stillingen følger med hele vejen.

### Formatet
Rosterne er delt efter, hvad kroppen laver: baserne løfter, toppen bliver løftet og kastet, backspotten sikrer, og tumblerne løber deres baner uden at løfte nogen. Det er en holdsport bygget af individuelle specialister, og rekrutteringen følger rollen.

### Stipendier og trupstørrelse

Sporten fik NCAA-status ved konventet i januar 2026, hvor alle tre divisioner stemte for at gøre akrobatik og tumbling til en mesterskabssport; det første NCAA-mesterskab ventes i foråret 2027. 47 universiteter har programmer med over 1.300 udøvere. Vejen dertil gik gennem emerging sport-status, som sporten fik i 2020.

Stipendierne følger equivalency-modellen, og for de Division I-skoler, der tilsluttede sig House-forliget i 2025, gælder et **truploft på 55 udøvere** — et af de største i college-sporten, fordi en dyst kræver mange kroppe i pyramiderne. Se [divisionerne](/viden/ncaa-divisioner).

### Conferences og independents

Conference-strukturen er ung og under opbygning, som man kan forvente af en sport, der først nu er blevet NCAA-mesterskabssport: flere hold konkurrerer i sportsspecifikke sammenslutninger frem for i skolens hovedconference, og sæsonen er bygget om stævner. Med mesterskabsstatus vil strukturen sandsynligvis ligne de øvrige sportsgrenes mere de kommende år.

### Vejen til prof

Der findes ingen professionel liga i akrobatik og tumbling — sporten er født i college-systemet og har ikke et professionelt niveau over sig. Det gør college til toppen af sporten, ikke et trin på vejen, og det er en usædvanlig og på sin vis attraktiv position: man konkurrerer på det højeste niveau, der findes, mens man læser. Mange udøvere kommer fra cheerleading eller gymnastik og finder her en konkurrenceform, der belønner netop deres baggrund.

### Tidbits

Sporten forveksles ofte med cheerleading og med STUNT, men de tre er hverken det samme eller under samme forbund. Acrobatics & tumbling har hverken tilråb, pomponer eller sidelinje — det er en konkurrence fra første til sidste disciplin.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [NCAA. (2026, January 16). NCAA elevates acrobatics and tumbling to championship status.](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-elevates-acrobatics-and-tumbling-to-championship-status.aspx)
- [National Collegiate Acrobatics & Tumbling Association. (2026). NCAA elevates acrobatics & tumbling to championship status.](https://thencata.org/news/2026/1/16/ncaa-elevates-acrobatics-tumbling-to-championship-status.aspx)
- [USA Gymnastics. (2026). Acrobatics & tumbling becomes an NCAA championship.](https://usagym.org/acrobatics-tumbling-becomes-an-ncaa-championship/)

- [NCAA. (2026, 16. januar). NCAA elevates acrobatics and tumbling to championship status.](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-elevates-acrobatics-and-tumbling-to-championship-status.aspx)', updated_at = datetime('now')
 WHERE slug = 'akrobatik' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Ultimate i amerikansk college-sport

Ultimate ligger uden for NCAA og styres af USA Ultimate, som afvikler de nationale collegemesterskaber i to divisioner: D-I for de store programmer og D-III for de mindre skoler. Begge divisioner har separate herre- og damemesterskaber, og vejen dertil går gennem sectionals og regionals i løbet af foråret.

### Sæsonens gang

Sæsonen kulminerer i maj. I 2026 blev begge mesterskaber spillet i Illinois: D-III i Waukegan 16.-18. maj med 32 hold, D-I i Rockford 22.-25. maj med 40 hold — 20 i hver række. Middlebury vandt både herre- og damerækken i D-III og lavede dermed det første samlede dobbelt i mesterskabets historie.

### Formatet
Syv spillere pr. hold, og der scores ved at gribe disken i modstanderens endzone. Man må ikke løbe med disken, så spillet bygges op af kast og løb i frirum — handlerne styrer opbygningen, cutterne løber sig fri. Kampene spilles til 15 point med tidsgrænse.

### Formatet
Ultimate er **selvdømt**. Spillerne dømmer selv deres kampe efter princippet Spirit of the Game, og ved de største stævner assisterer observatører i stedet for dommere. Det er sportens mest karakteristiske træk og en af grundene til, at den har holdt fast i sit eget forbund frem for at søge ind i NCAA.

### Stipendier og trupstørrelse

**Ultimate er ikke en NCAA-sport.** College-ultimate styres af USA Ultimate, og NCAA''s stipendieregler og trupslofter gælder ikke. Så godt som alle programmer er studenterdrevne klubhold, og der findes i praksis ingen idrætsstipendier i sporten.

For en dansk spiller er ultimate derfor ikke en vej til at finansiere et amerikansk studie. Det er til gengæld en meget reel måde at spille på højt niveau, hvis man alligevel læser i USA — og college-ultimate er et af verdens stærkeste konkurrencemiljøer i sporten.

### Conferences og independents

USA Ultimate inddeler holdene i regioner og sektioner, og sæsonen kulminerer i et kvalifikationsforløb derfra til de nationale mesterskaber i foråret. Strukturen følger sportens egen geografi og har intet med skolens conference at gøre — et universitet kan være en stormagt i ultimate og en ubetydelighed i alt andet.

### Vejen til prof

Der findes professionelle ligaer i ultimate i Nordamerika, men de er små, og de færreste lever af sporten. Vejen videre går i praksis gennem klubhold og landsholdet til internationale mesterskaber. College er for mange spillere sportens højeste niveau i deres karriere.

### Tidbits

Ultimate spilles **uden dommere**, også på højeste college-niveau: spillerne dømmer selv, og princippet kaldes Spirit of the Game. Uenigheder løses på banen mellem de involverede spillere. Det er sportens mest karakteristiske træk og det, der overrasker nye spillere mest — også ved amerikanske mesterskaber.

Skifter man skole undervejs, sker det gennem [transfer-portalen](/viden/transfer-portal); se også [redshirt og eligibility-år](/viden/redshirt-og-eligibility).

### Kilder

- [USA Ultimate. (2026). 2026 D-I college championships.](https://usaultimate.org/2026-d-i-college-championships/)
- [USA Ultimate. (2026). D-III college championships wrap with historic sweep.](https://usaultimate.org/news/2026/06/d-iii-college-championships-wrap-with-historic-sweep/)
- [USA Ultimate. (2025). Illinois set to host 2026 college championships.](https://usaultimate.org/news/2025/08/illinois-set-to-host-2026-college-championships/)', updated_at = datetime('now')
 WHERE slug = 'ultimate' AND country = 'DK' AND kind = 'sport';

UPDATE pages SET content = '## Andre sportsgrene i NCAA

NCAA afvikler mesterskaber i omkring 24 sportsgrene, og danske atleter kan findes i mange af dem. Fra lacrosse til fægtning, fra vandpolo og sejlsport til skisport og wrestling — mulighederne er bredere, end de fleste tror. Udbuddet vokser stadig: kvindebrydning fik sit første NCAA-mesterskab i 2026, og acrobatics & tumbling samt stunt følger fra 2027.

### Sæsonens gang

Sportsgrenene i denne kategori har ikke en fælles sæson — de spænder fra efterårs- til forårssportsgrene og fra mesterskabssportsgrene til klubtilbud. Står din sport her, er det, fordi vi følger atleter i den, men den ikke har sin egen side endnu.

### Formatet
Sportsgrenene i denne kategori afgøres på vidt forskellige måder. Nogle, som lacrosse og vandpolo, er rene holdkampe mellem to skoler. Andre, som fægtning, wrestling og skisport, fungerer som "meets", hvor de enkelte dueller eller løb hver giver point, og skolernes samlede pointsum afgør holdsejren — på samme måde som i svømning og atletik. Det betyder, at en skole kan vinde et stævne på bredde og pålidelighed frem for på enkelte stjerner.

### Stipendier og trupstørrelse

Når du skal vurdere en sport, der ikke har sin egen side, er der ét spørgsmål, der afgør alt det økonomiske: **er sporten en NCAA-sport, eller ligger den udenfor?**

Er den NCAA-sport, gælder de regler, der er beskrevet på de øvrige sportssider: sportsspecifikke stipendielofter er for de Division I-skoler, der tilsluttede sig House-forliget i 2025, afløst af et truploft pr. sport, Division II uddeler delstipendier efter equivalency-modellen, og Division III giver ingen idrætsstipendier. Se [divisionerne](/viden/ncaa-divisioner).

Ligger sporten uden for NCAA — som squash, sejlsport, cykling, ultimate og polo gør — gælder ingen af delene. Så er støtten den enkelte skoles egen sag, og akademiske legater og behovsbestemt studiestøtte er normalt den eneste reelle vej. Det er det første, man skal have afklaret.

### Tidbits

Flere af NCAAʼs mindre sportsgrene har færre ansøgere til stipendierne, hvilket kan være en reel fordel for danske atleter med talent inden for en nichesport. Wrestling (amerikansk brydning) er fx en stor og traditionsrig college-sport, og lacrosse vokser hastigt. Efterhånden som kendskabet til NCAA-systemet breder sig i Danmark, ser vi atleter fra stadig flere sportsgrene tage springet over Atlanten.

### Kilder

- [NCAA. (2026, 16. januar). NCAA to add four new championships.](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-to-add-four-new-championships.aspx)
- [NCAA. (2026, 4. marts). NCAA''s first women''s wrestling championships: What to know.](https://www.ncaa.org/news/2026/3/4/media-center-ncaas-first-womens-wrestling-championships-what-to-know.aspx)', updated_at = datetime('now')
 WHERE slug = 'andet' AND country = 'DK' AND kind = 'sport';
