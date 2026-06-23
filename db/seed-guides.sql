INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('hvad-er-ncaa', 'Hvad er NCAA?', 'NCAA (National Collegiate Athletic Association) er den største organisation for universitetssport i USA. Her får du overblikket over systemet og dets betydning for danske student athletes.

## Hvad står NCAA for?

NCAA er en non-profit-organisation, der fastsætter regler og afvikler mesterskaber for college sport i USA. Sammenslutningen tæller over 1.000 universiteter, omkring en halv million atleter og knap 24 sportsgrene for både kvinder og mænd.

Universiteterne er inddelt i tre divisioner og samlet i [conferences](/viden/conferences), der konkurrerer mod hinanden gennem sæsonen.

## Hvorfor er det relevant for danske atleter?

Det amerikanske system er næsten unikt ved at kombinere studie og elitesport på samme institution. Det gør det muligt at tage en universitetsuddannelse, mens man træner og konkurrerer på højt niveau — ofte med adgang til faciliteter, trænere og akademisk støtte i topklasse.

Hundredvis af danskere går denne vej hvert år. Vi følger dem løbende — se [alle danske atleter](/atleter) vi dækker.

## De tre divisioner

Division I, II og III adskiller sig på niveau, økonomi og balancen mellem sport og studie. Forskellene har stor betydning for, hvor du passer ind.

- Læs mere: [Divisioner i NCAA forklaret](/viden/ncaa-divisioner)

## Findes der alternativer til NCAA?

Ja. NAIA og NJCAA (junior colleges) er selvstændige forbund med egne regler og kan være oplagte veje for mange danskere. Se forskellene i [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa).

## Ofte stillede spørgsmål

### Hvad betyder NCAA?

National Collegiate Athletic Association — den organisation, der styrer størstedelen af college sport i USA.

### Hvor mange danskere er i NCAA?

Der er løbende hundredvis af danske student athletes på amerikanske universiteter. Vi samler dem på StudentAthlete.dk under [Alle atleter](/atleter).

## Læs også

- [Divisioner i NCAA](/viden/ncaa-divisioner)
- [Conferences forklaret](/viden/conferences)
- [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa)
- [Sæsonkalenderen](/viden/saeson-kalender)', 'NCAA organiserer college sport i USA — over 1.000 universiteter og en halv million atleter. Forstå systemet, og hvad det betyder for danske atleter.', 1, 'guide', 'system', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('ncaa-divisioner', 'Divisioner i NCAA: Division I, II og III', 'NCAA er inddelt i tre divisioner. De adskiller sig på sportsligt niveau, økonomi og hvor meget sporten fylder i hverdagen. Her er forskellene — og hvad de betyder for dig.

## Division I (D-I)

Den største og mest synlige division med de højeste budgetter, tv-aftaler og fuldtidstrænerstabe. Mange D-I-programmer kan tilbyde idrætslegater (athletic scholarships), og kravene til både niveau og tidsforbrug er størst her.

## Division II (D-II)

En balance mellem sport og studie. D-II-skoler kan tilbyde delvise idrætslegater og ligger ofte i mindre byer. Niveauet er højt, men hverdagen er typisk mindre presset end i D-I.

## Division III (D-III)

D-III giver ikke idrætslegater — kun akademisk eller behovsbaseret støtte. Til gengæld er der stærkt fokus på studiet, og i flere sportsgrene er niveauet stadig højt. Mange danskere ender i D-III for kombinationen af god uddannelse og seriøs sport.

## Hvilken division passer til dig?

Det afhænger af dit sportslige niveau, dine karakterer og din økonomi. Ingen division er objektivt ''bedst'' — det handler om det rette match. Se hvilke divisioner de danske atleter vi dækker går på under [Universiteter](/skoler).

## Ofte stillede spørgsmål

### Giver Division III idrætslegater?

Nej. D-III tilbyder ikke idrætslegater, men kan give akademisk og behovsbaseret støtte. Idrætslegater findes i D-I og D-II (samt i NAIA).

## Læs også

- [Hvad er NCAA?](/viden/hvad-er-ncaa)
- [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa)
- [Universiteter med danske atleter](/skoler)', 'Forskellen på NCAA Division I, II og III — niveau, idrætslegater og balancen mellem sport og studie. Hvad betyder det for danske atleter?', 1, 'guide', 'system', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('conferences', 'Conferences forklaret: Big Ten, SEC, ACC og resten', 'En conference er en sammenslutning af universiteter, der konkurrerer i samme liga. Her er, hvordan de fungerer — og hvorfor de fylder så meget i amerikansk college sport.

## Hvad er en conference?

En conference samler typisk universiteter ud fra geografi og historie. Holdene møder primært hinanden i conference-kampe gennem sæsonen, og de fleste conferences kårer en mester, ofte gennem et afsluttende stævne (conference tournament).

## De store navne

Blandt de mest kendte D-I-conferences er Big Ten, SEC, ACC og Big 12 — ofte omtalt som ''power''-conferences med de største tv-aftaler og budgetter. Derudover findes mange ''mid-major''-conferences, hvor en stor del af de danske atleter spiller.

## Conference-realignment

Conferences er ikke statiske. Universiteter skifter jævnligt conference (realignment), drevet af tv-penge og geografi. Det ændrer løbende landskabet, så et holds conference kan være anderledes fra år til år — tjek altid den aktuelle status.

## Hvorfor betyder det noget?

Conference afgør modstandere, rejseafstande, eksponering og ofte niveau. På profilerne under [Universiteter](/skoler) viser vi hver skoles conference og [division](/viden/ncaa-divisioner).

## Læs også

- [Divisioner i NCAA](/viden/ncaa-divisioner)
- [Hvad er NCAA?](/viden/hvad-er-ncaa)
- [Universiteter med danske atleter](/skoler)', 'Hvad er en conference i college sport? Big Ten, SEC, ACC og de mange andre — hvordan de fungerer, og hvorfor de betyder noget.', 1, 'guide', 'system', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('ncaa-naia-njcaa', 'NCAA vs NAIA vs NJCAA: Hvad er forskellen?', 'Mange tror, at college sport i USA er lig med NCAA. Men NAIA og NJCAA er selvstændige forbund, der for mange danskere er oplagte — og nogle gange bedre — veje.

## NCAA

Det største forbund med tre [divisioner](/viden/ncaa-divisioner) og de fleste topprogrammer. Strammest regelsæt og en central [Eligibility Center](/viden/akademiske-krav), der certificerer atleter.

## NAIA

Et mindre forbund med et par hundrede universiteter. NAIA tillader idrætslegater, har et mindre stramt regelsæt og kortere optagelsesproces. Niveauet kan være højt, og for mange internationale atleter er NAIA en god indgang.

## NJCAA (junior colleges / JUCO)

Toårige community colleges. JUCO bruges ofte som springbræt: man udvikler sig sportsligt og akademisk i 1-2 år og kan derefter skifte (transfer) til et fireårigt NCAA- eller NAIA-universitet. Det er typisk billigere og har lavere optagelseskrav.

## Hvad er rigtigt for dig?

Det afhænger af niveau, karakterer, økonomi og mål. JUCO kan åbne døre, hvis karaktererne ikke rækker til NCAA endnu; NAIA kan give spilletid og legat; NCAA byder på de største rammer. Se [hvor danske atleter går](/skoler) for inspiration.

## Læs også

- [Divisioner i NCAA](/viden/ncaa-divisioner)
- [Akademiske krav & eligibility](/viden/akademiske-krav)
- [Universiteter med danske atleter](/skoler)', 'NCAA er ikke det eneste forbund for college sport i USA. Forstå NAIA og NJCAA (junior colleges) — og hvornår de er den rigtige vej for danske atleter.', 1, 'guide', 'system', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('amerikansk-universitetssystem', 'Det amerikanske universitetssystem for student athletes', 'At være student athlete betyder fuldtidsstudie og elitesport på samme tid. Her er, hvordan det amerikanske universitetssystem er skruet sammen.

## Major, credits og GPA

En bachelor (undergraduate) tager typisk fire år. Man vælger en ''major'' (hovedfag) og samler ''credits'' for beståede fag. Karaktererne udtrykkes som et GPA på en 4,0-skala, og et vist GPA kræves for at forblive spilleberettiget.

## Semester eller quarter

De fleste universiteter kører på to semestre (efterår/forår), mens nogle bruger ''quarters''. Sportssæsonen lægger sig oven på studieåret — se [sæsonkalenderen](/viden/saeson-kalender).

## Hverdagen som student athlete

En typisk dag rummer træning, holdmøder, studie og ofte obligatorisk ''study hall''. Til gengæld har atleter adgang til akademisk støtte, tutorer og vejledning, der hjælper med at få studie og sport til at hænge sammen.

## Akademiske krav

Inden man overhovedet kan konkurrere, skal man opfylde optagelses- og spilleberettigelseskrav. Det dækker vi i [akademiske krav & eligibility](/viden/akademiske-krav).

## Læs også

- [Akademiske krav & eligibility](/viden/akademiske-krav)
- [Sæsonkalenderen](/viden/saeson-kalender)
- [Alle danske atleter](/atleter)', 'Major, credits, GPA og campus-liv: sådan fungerer amerikanske universiteter — og hvordan hverdagen ser ud som student athlete.', 1, 'guide', 'system', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('saeson-kalender', 'Sæsonkalenderen i NCAA: hvornår spilles hvad?', 'College sport følger studieåret og deles groft i tre sæsoner. Her er, hvornår de enkelte sportsgrene spiller — med link til vores dækning af hver gren.

## Efterårssæson (ca. august–december)

- [Football](/football)
- [Fodbold (soccer)](/fodbold)
- [Volleyball](/volleyball)
- Cross country (langdistanceløb)

## Vintersæson (ca. november–marts)

- [Basketball](/basketball)
- [Svømning](/svoemning)
- [Ishockey](/ishockey)
- [Gymnastik](/gymnastik)
- Indendørs [atletik](/atletik)

## Forårssæson (ca. februar–juni)

- [Baseball](/baseball)
- [Tennis](/tennis)
- [Golf](/golf)
- [Roning](/roning)
- Udendørs [atletik](/atletik)

## Ikke kun kampsæsonen

Uden for selve kampsæsonen (''non-traditional season'') trænes der videre, og flere sportsgrene har stævner i begge halvår. Mesterskaberne — som [March Madness](/viden/march-madness-forklaret) i basketball — kulminerer typisk i slutningen af sæsonen.

## Læs også

- [March Madness forklaret](/viden/march-madness-forklaret)
- [College Football Playoff forklaret](/viden/college-football-playoff-forklaret)
- [Alle sportsgrene](/viden)', 'Efterår, vinter eller forår? Overblik over hvornår de enkelte NCAA-sportsgrene har sæson — fra football til roning.', 1, 'guide', 'system', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('akademiske-krav', 'Akademiske krav & eligibility i NCAA', 'Før man kan konkurrere i NCAA, skal man godkendes både akademisk og som amatør. Her er hovedreglerne — husk at tjekke den aktuelle status, da kravene ændrer sig.

## NCAA Eligibility Center

For Division I og II godkendes atleter af NCAA Eligibility Center, der gennemgår både dit akademiske grundlag og din amatørstatus. Man registrerer sig og indsender karakterer og dokumentation. Division III har egne optagelseskrav og bruger ikke Eligibility Center.

## Karakterer og fag

Der stilles krav til bestemte fag (''core courses'') og et minimums-GPA. Danske gymnasiekarakterer omregnes til den amerikanske skala. Et stærkt karaktergennemsnit udvider dine muligheder markant.

## SAT/ACT og sprogtest

Standardiserede prøver (SAT/ACT) har historisk indgået i spilleberettigelsen, men kravene er under forandring, og mange skoler er blevet test-optional ved optagelse. Som ikke-engelsktalende skal du ofte dokumentere engelskniveau (fx TOEFL/Duolingo). Tjek altid de nyeste krav hos den enkelte skole og hos NCAA.

## Amatørstatus

NCAA har regler om tidligere professionel aktivitet og betaling. For europæiske atleter med klub- eller ungdomssport kan det være et særligt opmærksomhedspunkt, da fx kontrakter eller pengepræmier kan påvirke status. Få det afklaret tidligt.

## Ofte stillede spørgsmål

### Skal jeg tage SAT for at komme i NCAA?

Kravene har ændret sig, og mange skoler er test-optional. Det varierer mellem skoler og kan ændre sig fra år til år — tjek den aktuelle status hos den enkelte skole og NCAA.

## Læs også

- [Det amerikanske universitetssystem](/viden/amerikansk-universitetssystem)
- [Redshirt & eligibility-år](/viden/redshirt-og-eligibility)
- [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa)', 'NCAA Eligibility Center, core courses, GPA og amatørstatus: hvad skal danske atleter opfylde for at blive spilleberettiget?', 1, 'guide', 'begreber', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('transfer-portal', 'Transfer Portal forklaret', 'Transfer-portalen har ændret college sport markant. Her er, hvad den er, og hvorfor den er relevant for danske atleter, der søger bedre muligheder.

## Hvad er portalen?

Transfer-portalen er en officiel database, hvor en atlet kan melde sig som villig til at skifte universitet. Når man er i portalen, må andre skolers trænere tage kontakt. Det er kort sagt et formaliseret ''transfervindue'' for college-atleter.

## Reglerne om at skifte

Reglerne er løbende blevet lempet, og atleter kan i dag typisk skifte uden at skulle sidde en sæson over, som man tidligere skulle. Detaljerne — og antal tilladte skift — ændrer sig dog, så tjek den aktuelle status.

## Hvorfor det betyder noget for danskere

Spillertrupper ændrer sig hurtigt, og portalen giver atleter mulighed for at finde bedre spilletid, et stærkere akademisk match eller en højere [division](/viden/ncaa-divisioner). Vi dækker danske spilleres skift løbende under [Alle atleter](/atleter).

## Læs også

- [Redshirt & eligibility-år](/viden/redshirt-og-eligibility)
- [Divisioner i NCAA](/viden/ncaa-divisioner)
- [Alle danske atleter](/atleter)', 'Hvad er NCAA''s transfer portal, og hvordan virker den? Sådan skifter college-atleter universitet — og hvad det betyder for danske spillere.', 1, 'guide', 'begreber', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('redshirt-og-eligibility', 'Redshirt og eligibility-år forklaret', 'Hvor mange år må man egentlig spille i NCAA? Begreberne ''eligibility'' og ''redshirt'' forvirrer mange — her er forklaringen.

## Fire sæsoner inden for fem år

Som udgangspunkt har en NCAA-atlet fire sæsoners konkurrence at bruge, typisk inden for et vindue på fem år (''the five-year clock''). Uret begynder at tikke, når man indskrives på fuld tid.

## Hvad er en redshirt?

At ''redshirte'' betyder at sidde en sæson over — fx på grund af skade eller for at udvikle sig — uden at bruge et af sine fire konkurrenceår. En ''redshirt freshman'' er altså i sit andet år på campus, men sit første som spillende.

## Ændringer og undtagelser

Reglerne har været under forandring (bl.a. ekstra år givet under COVID, og løbende justeringer for JUCO- og transfer-atleter). Der findes også medicinske dispensationer (''medical redshirt''). Tjek den aktuelle status for din situation.

## Class year vs. eligibility

Bemærk, at en atlets studieår (freshman/sophomore/junior/senior) ikke altid følger antallet af brugte konkurrenceår. På vores profiler viser vi ofte forventet dimissionsår. Se også [akademiske krav](/viden/akademiske-krav).

## Læs også

- [Transfer Portal forklaret](/viden/transfer-portal)
- [Akademiske krav & eligibility](/viden/akademiske-krav)
- [Ordbog: college sport-begreber](/viden/college-sport-ordbog)', 'Hvad er en redshirt, og hvordan fungerer de fire eligibility-år inden for fem? Forstå reglerne for, hvor længe man må konkurrere i NCAA.', 1, 'guide', 'begreber', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('college-sport-ordbog', 'Ordbog: college sport-begreber fra A til Z', 'Amerikansk college sport har sit eget sprog. Her er de vigtigste begreber forklaret kort — med links til dybere guider.

## Amatørstatus (amateurism)

NCAA-regler om, at atleter ikke må have tjent penge som professionelle. Vigtigt for mange europæere — se [akademiske krav](/viden/akademiske-krav).

## Conference

Sammenslutning af universiteter, der konkurrerer i samme liga. Se [conferences forklaret](/viden/conferences).

## Commit

Når en atlet (mundtligt) forpligter sig til en skole, før papirerne er underskrevet på [Signing Day](/viden/signing-day-og-nli).

## Division I / II / III

NCAA''s tre niveauer. Se [divisioner forklaret](/viden/ncaa-divisioner).

## Eligibility

Spilleberettigelse — om du må konkurrere akademisk og som amatør. Se [redshirt & eligibility](/viden/redshirt-og-eligibility).

## FBS / FCS

De to øverste niveauer i D-I [football](/football): Football Bowl Subdivision og Football Championship Subdivision.

## Freshman / sophomore / junior / senior

Studieårene 1.–4. år på et amerikansk universitet.

## GPA

Grade Point Average — karaktergennemsnit på en 4,0-skala. Se [universitetssystemet](/viden/amerikansk-universitetssystem).

## JUCO

Junior college (NJCAA) — toårig skole, ofte springbræt. Se [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa).

## March Madness

D-I-basketballturneringen i marts. Se [March Madness forklaret](/viden/march-madness-forklaret).

## Mid-major

Conference uden for de største ''power''-conferences. Se [conferences](/viden/conferences).

## Redshirt

At sidde en sæson over uden at bruge et konkurrenceår. Se [redshirt & eligibility](/viden/redshirt-og-eligibility).

## Roster

Truppen — listen over atleter på et hold.

## Signing Day

Dagen hvor rekrutter underskriver. Se [Signing Day & NLI](/viden/signing-day-og-nli).

## Transfer portal

Database for atleter, der vil skifte skole. Se [transfer portal forklaret](/viden/transfer-portal).

## Walk-on

En atlet på holdet uden idrætslegat — i modsætning til en ''scholarship''-atlet.

## Læs også

- [Hvad er NCAA?](/viden/hvad-er-ncaa)
- [Divisioner i NCAA](/viden/ncaa-divisioner)
- [Akademiske krav & eligibility](/viden/akademiske-krav)', 'Amatørstatus, FBS, mid-major, redshirt, walk-on … de vigtigste begreber i amerikansk college sport forklaret kort på dansk.', 1, 'guide', 'begreber', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('march-madness-forklaret', 'March Madness forklaret', 'March Madness er et af USA''s største sportsbegivenheder. Her er, hvordan turneringen fungerer — og hvorfor den er værd at følge for danske basketballfans.

## Hvad er March Madness?

March Madness er NCAA Division I''s afsluttende basketballturnering for både kvinder og mænd, der spilles hen over marts og april. 68 hold spiller single-elimination — taber du én kamp, er du ude. Det skaber de berømte overraskelser (''upsets'').

## Bracket og de berømte runder

Holdene seedes i et ''bracket''. Efter de indledende kampe (''First Four'') følger runderne ned mod Sweet 16, Elite Eight og Final Four, inden mesteren findes. Millioner udfylder deres egen bracket og forsøger at forudsige vinderne.

## Den danske vinkel

Danske [basketball](/basketball)-atleter kan være med, når deres hold når turneringen. Vi følger danskerne gennem sæsonen — se [alle atleter](/atleter).

## Læs også

- [Basketball i NCAA](/basketball)
- [Sæsonkalenderen](/viden/saeson-kalender)
- [College Football Playoff forklaret](/viden/college-football-playoff-forklaret)', '68 hold, single-elimination og en hel nation i basketball-feber. Sådan fungerer March Madness — NCAA''s store basketballturnering.', 1, 'guide', 'saeson', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('college-football-playoff-forklaret', 'College Football Playoff forklaret', 'College football afgøres i et slutspil kaldet College Football Playoff (CFP). Her er, hvordan det fungerer — kort og for danskere.

## Hvad er CFP?

College Football Playoff er slutspillet, der kårer den nationale mester i Division I [football](/football). Et udvalg rangerer de bedste hold, der derefter spiller om titlen. Fra 2024-sæsonen blev feltet udvidet til 12 hold — formatet har ændret sig over tid, så tjek den aktuelle struktur.

## Bowl games

Ud over selve slutspillet spilles en række ''bowl games'' i december og januar — enkeltstående prestigekampe mellem hold fra forskellige [conferences](/viden/conferences). Flere bowls indgår i selve playoff-strukturen.

## Den danske vinkel

Danskere i college football er ofte specialister (kickere, puntere) og linemen. Følg dem under [football](/football) og [alle atleter](/atleter).

## Læs også

- [Football i NCAA](/football)
- [Conferences forklaret](/viden/conferences)
- [Sæsonkalenderen](/viden/saeson-kalender)', 'Hvordan kåres mesteren i college football? Guide til College Football Playoff, det udvidede slutspil og bowl-systemet.', 1, 'guide', 'saeson', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');

INSERT INTO pages (slug, title, content, meta_description, published, kind, category, updated_at)
VALUES ('signing-day-og-nli', 'Signing Day og National Letter of Intent', 'Når en rekrut og et universitet bliver enige, formaliseres det på en ''signing day''. Her er, hvad det betyder — og hvorfor reglerne er værd at holde øje med.

## Signing Day

Signing Day er dagen, hvor rekrutter officielt underskriver med deres kommende skole. I football findes typisk en tidlig underskrivningsperiode (december) og en traditionel (februar); andre sportsgrene har deres egne datoer.

## National Letter of Intent (NLI)

NLI har historisk været den bindende aftale, der knytter atlet og skole sammen mod tilbud om idrætsstøtte. Systemet er imidlertid under forandring, og dele af det er ved at blive erstattet af andre aftaleformer. Tjek den aktuelle status, før du regner med specifikke regler.

## Hvad betyder det for danske atleter?

For danskere er det vigtigt at forstå, hvornår en aftale bliver bindende, og hvad den dækker. Sørg for, at det akademiske er på plads først — se [akademiske krav](/viden/akademiske-krav).

## Læs også

- [Akademiske krav & eligibility](/viden/akademiske-krav)
- [Ordbog: college sport-begreber](/viden/college-sport-ordbog)
- [Alle danske atleter](/atleter)', 'Hvad sker der på Signing Day, og hvad er en National Letter of Intent? Sådan formaliseres aftalen mellem atlet og universitet.', 1, 'guide', 'saeson', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  meta_description = excluded.meta_description,
  kind = 'guide',
  category = excluded.category,
  updated_at = datetime('now');
