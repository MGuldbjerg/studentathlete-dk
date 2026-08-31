# StudentAthlete.dk — Status

**Sidst opdateret**: 2026-08-31 (britisk Bluesky-kanal + e-mail på .co.uk)


> 📘 **Nyt land på vej?** `PLAYBOOK-nyt-land.md` = bindende rækkefølge, fælder
> med symptomer, verifikationskommandoer. `SETUP-uk-launch.md` = UK's egne
> resterende trin. `ARKITEKTUR-motor.md` = de tre lag (kerne/sprog/land).

## 🇬🇧 Britisk distribution: e-mail + Bluesky-kanal (2026-08-31)

UK har været ude af dark launch siden 21. august og har **25 publicerede
artikler** — men ingen konto at poste dem fra. To ting er nu på plads:

**E-mail**: `info@student-athlete.co.uk` → m.guldbjerg@gmail.com via Cloudflare
Email Routing. Zonen bar stadig registratorens mail-opsætning (MX `mx.simply.com`,
SPF `include:spf.simply.com`), som blokerede wizarden; erstattet med
`route1/2/3.mx.cloudflare.net` + Cloudflares SPF, `_dmarc` beholdt — samme form
som .dk. **Det kommer igen på næste land**: registratoren leverer MX by default.

**Bluesky-kanal** (`bluesky_uk`): adapteren bygges nu ud fra et kontoregister,
så DK og UK deler kode men intet andet — eget kø-navn (pacing slås op på
kanalnavnet), egne secrets, og `langs` fra landeprofilen. Det sidste er ikke
kosmetik: et engelsk opslag mærket `da` skjules af Blueskys sprogfilter for
netop de britiske læsere det er skrevet til.

Kontoen er oprettet, handlen verificeres via `_atproto`-TXT.

**Footer-familielinje** (deploy 50cc669): «En del af StudentAthlete-familien —
DK · UK» / «Part of the StudentAthlete family», på hvert sites eget sprog.
Listen er `liveSites()`, så et dark launch-site aldrig kan blive linket ind —
samme prædikat som social-køens distributionsspærre.

Formålet er **opdagelses-problemet fra 26/8** (se afsnittet længere nede):
.co.uk-forsiden er «Submitted and indexed», men de indre sider er «unknown to
Google» — ruten ind i sitet bærer ikke. Begge properties er verificeret og har
sitemaps; det manglende var indgående links, og .dk er et indekseret site der
crawles regelmæssigt. Familielinjen er ét sådant link, ikke en løsning i sig
selv — den indre linkstruktur på .co.uk er stadig den store post.

## 🐛 «significant» gjorde kampreferater til rekrutteringsnyheder (2026-08-31)

`selectArticleType` brugte DELSTRENGS-match: `text.includes("sign")` matcher
inde i **«significant»** — et helt almindeligt ord i sportsreferater. Tre
kampreferater blev derfor sendt ned ad rekrutterings-prompten:

| Kladde | Kilden handlede om | Kladden påstod |
|---|---|---|
| #191 Kardel | «Kardel Makes Six Saves in Loss to UAH» | «joins Illinois Springfield» |
| #193 Moffat | «Moffat's Brace Give Mocs a Resounding Victory» | «joins Florida Southern» |
| #188 Banasik | «Banasik's Two Goals Give Miners 2-1 Win» | «skifter til Missouri S&T» |

Nu ordgrænser, **plus en spærre der er stærkere end ordvalg**: har faktaarket
en modstander OG et resultat, er det et kampreferat. En kamp kan ikke være en
rekrutteringsnyhed.

De tre kladder er kasseret, men historierne sat tilbage til `new` — kilden er
god og atleten ER historien, så næste kørsel skriver dem om korrekt.

## 🔁 Forbedringen nåede kun de NYE faktaark (2026-08-31)

Kun 4 af 12 kladder bar kampdata. Forklaringen stod i kørselsloggen:
`build-factsheet` rører kun historier med `fact_status IS NULL`, så kørslen
30-08 byggede **5** nye faktaark — og kun de fik kampforløb. Resten blev
skrevet ud fra faktaark fra før 30-08.

`backfill-match-facts.ts` beriger bagud: deterministisk, ingen LLM, ingen ny
udtrækning, og KUN feltet `match` tilføjes, så en menneskelig rettelse i
faktaarket ikke kan forsvinde. **50 faktaark beriget.**

⚠️ **Generel lærdom**: en forbedring i `build-factsheet` rammer kun fremtiden.
Enhver ændring dér skal følges af en backfill, ellers skriver generatoren
videre på det gamle grundlag i ugevis.

### Resultatet af dagens gennemgang

Udgivet 3 (Orzechowski, Trinder, McErlain) — alle verificeret mod kilden.
De fejl der blev rettet var alle samme slags: **en påstand kilden ikke gør**
(«at Charger Park» om en UDEkamp, «second win of the season», «stoppage time»
om et mål i det 87.).

⚠️ Og ugedagsfejlen dukkede op igen i #194 («Tuesday» om 2. september, som er
en onsdag) — men denne gang fangede `verify-article` den, fordi faktaarket nu
bærer datoen. Sætningen er væk.

Tilbage til Mikkel mandag: #181 Williams, #187 Mujica, #189 Pole, #194
Shabazz-Edwards, #195 Kibrya, #197 Madsen.

## ⚡ Core Web Vitals (2026-08-30)

Serversiden var allerede god (TTFB 130-180 ms på artikler, OG-kort med
cache-HIT). Alt af værdi lå på klienten.

| Mål | Før | Efter |
|---|---|---|
| billeder uden mål (forsiden) | **8 af 8** | 0 af 8 |
| preloadede kort | 3 (~750 KB) | 1 (det ægte LCP) |
| kort-blobs i alt | 12.882 KB PNG | **1.864 KB WebP** |
| forsidens billedvægt | ~1,5 MB | **184 KB** |
| TTFB `/athletes/a` | 330-380 ms | ~228 ms |

**CLS**: ingen af otte billeder havde mål — hvert kort reserverede nul plads
til det landede. Alle har dem nu.

**LCP**: kortene kodes som WebP i pipelinen (`sharp`, kvalitet 82). Konver-
teringen sker i Actions, ikke i Workeren — `sharp` er native og hører ikke
hjemme på kanten. Kolonnen hedder stadig `png_base64` og bærer nu begge
formater, så Workeren **læser** formatet af de første bytes.

⚠️ **To fælder undervejs, begge kostede en runde:**
1. **Preloadene stod ingen steder i koden.** React 19 hejser selv billeder
   UDEN `loading="lazy"` op som preloads. Lead-kortet var mærket
   `fetchPriority="high"` og trak derfor 250 KB foran karrusellen, som er den
   ægte LCP. To billeder mærket «high» kappes bare om forbindelsen.
2. **Formatskiftet krævede et `CARD_VERSION`-bump.** Blobs var WebP, men
   `/api/og` serverede PNG i op til en uge: nøglen og adressen deler
   versionstallet, og uden bumpet holder Cloudflares kant den gamle fil.
   v8 → v9, alle 45 kort genrenderet, de gamle PNG-blobs slettet (D1 fra
   66 MB til 56 MB).

**TTFB på bogstavsiderne var min egen fejl** fra 26-08: de hentede hele
tabellen (2.343 rækker) og kastede ~90% væk i JS. Nu to målrettede
forespørgsler; begge kasser af bogstavet bindes som parametre, fordi SQLite's
`upper()` er ASCII-only og ikke kan se at «ø» og «Ø» er samme bogstav.

**AdSense rørt jeg ikke.** Min anbefaling byggede på en antagelse om at
annoncerne var slukket — de er tændt, og der ER slots på forsiden og
artikelsiderne. Scriptet er allerede `async` og admin-styret.

## 🎂 Fem UDGIVNE artikler bar en opdigtet alder — rettet (2026-08-30)

Auditten fandt en alder i 18% af de afviste og 16% af de udgivne artikler.
Ingen kontrol fangede den, og gennemgangen heller ikke: «den 21-årige danske
golfspiller» læser fuldstændig naturligt.

Fem artikler, seks påstande:

| # | Atlet | Bevis |
|---|---|---|
| 58 | Valdemar Dubin | kildeteksten (11.793 tegn) nævner **ingen** alder |
| 69 | Linus Bangert | kildeteksten (13.122 tegn) nævner **ingen** alder |
| 56 / 70 / 72 | Bang, Madsen ×2 | Google News-kilder kan ikke opløses — og **#70 og #72 gav SAMME atlet to forskellige aldre (22 og 21)** |

Alle seks fjernet, sætningerne bevaret på læseligt dansk, og hver artikel har
fået en synlig `correction_note`. **Rettelses-mekanismen havde aldrig været
brugt** — det her er præcis dens formål, og den står nu live på de fem sider.

To spærrer:
- **Regel 27 i BEGGE promptsæt**: skriv aldrig en alder. Vi har ingen
  fødselsdato, skolerne skriver årgang, så «den 21-årige» kan kun være gættet.
- **Kontrol i fejebladet** — den fandt straks en ny: kladde #182 fra samme dag
  skriver «The 23-year-old arrives». Promptreglen virker først fra næste
  kørsel; kontrollen er bagstopperen.

⚠️ Mellemrummet i mønstret « aged 1» er ikke pynt — uden det matcher
«managed just one shot on target».

## 🔬 AUDIT af discovery→kladde-pipelinen (2026-08-30)

### Tragten, 30 dage

| Trin | Antal |
|---|---|
| feeds overvåget | 1.066 |
| skoler m. feed OG aktive atleter | 564 |
| — heraf gav en historie | **100** |
| historier fundet | 179 |
| over genererings-tærskel (60) | 142 |
| faktaark bygget | 142 (27 uden substans) |
| kladder | 32 |
| udgivet | 25 |

### ⚠️ Hovedfundet er NEGATIVT: sproget skiller ikke

57 afviste kladder målt mod 43 udgivne artikler:

| signal | afvist | udgivet |
|---|---|---|
| overdrivelse i titel | 12% | 5% |
| fremtids-fyld | 54% | 40% |
| spekulativ vurdering | 44% | 26% |
| **opfundet alder** | **18%** | **16%** |

Ingen af dem skiller. Og `fabrication_risk` skiller heller ikke:
**27 af 68 afvisninger var stemplet «low»** — den hyppigste karakter blandt de
afviste. Verificeringen måler «påstande uden dækning i faktaarket», men de
fejl der får en kladde afvist er påstande der ER dækket og alligevel forkerte.

**Konsekvens: hold op med at lede efter dårligt sprog. Led efter forkerte tal.**

`fact-cross-check.ts` sammenligner artiklen med kildens egen scoringsoversigt.
Målt på auditens sager: **4 af 4 afviste fanges, 0 af 3 udgivne flages.** En
modsigelse hæver til «high» uanset hvad modellen mente.

⚠️ **Opfundne aldre står i 7 UDGIVNE artikler.** Vi gemmer ikke alder nogen
steder. Det er ikke fanget af nogen kontrol og bør ses efter.

### Discovery: 168 skoler er tavse

Alle feeds tjekkes til tiden (0 mere end 3 dage bagud), så det er ikke
planlægningen. To forklaringer:

1. Feedet er **10 indslag bredt for hele atletikafdelingen**. Toledos seneste
   ti handler om volleyball og kampprogram — ingen af vores fem atleter. Ærlig
   tavshed.
2. Men ~1 af 30 RSS-feeds svarer **HTTP 200 med nul indslag** (gobison.com),
   og Missouri State returnerer 0 bytes. Et dødt feed kan ikke skelnes fra
   «ingen nyheder».

Ny kontrol: skoler med 5+ aktive atleter uden én historie i 90 dage.
**168 skoler** — den største uudnyttede indgang i pipelinen.

## ⚽ Faktaarket dækker nu KAMPEN (2026-08-30) — `match-facts.ts`

Ti kampreferater i træk blev afvist, og fejlene var de samme hver gang.
Årsagen var ikke generatoren: faktaarket fangede pålideligt ATLETENS linje
(mål, minutter, skud), men ikke kampen omkring den. Bedt om at skrive et
referat ud fra det, fylder modellen hullerne.

Oplysningerne stod i kilden hele tiden, struktureret. Nu hentes de
**regelbaseret** — ingen LLM, ingen browser-render, og kun én HTTP-hentning
når den gemte kildetekst ikke allerede bærer oversigten (52 af 157 gør).

Prompten ser nu:

```
Kampens mål (kildens egen oversigt — brug rækkefølgen som den står):
- 33:00 Tatum Fain (ECKERD) — oplæg: Tristan Bassette
- 45:41 Javier Gongora Andres (MGA)
- 53:54 Sebastian Schmalbach (ECKERD) — oplæg: Nico Fischer
- 71:43 Zaki Goes (MGA) — oplæg: Sean McCrudden
- 86:05 Pharrell Williams (ECKERD) — oplæg: Tatum Fain

Holdstatistik (MGA / ECKERD):
- Shots on Goal: 6 - 4 · Saves: 1 - 4 · Corners: 5 - 2 …
```

Den afviste #177 påstod at Fain UDLIGNEDE før Williams' vinder. Faktaarket
viser nu at Fain scorede ÅBNINGSMÅLET og LAGDE OP til vinderen — den fejl kan
ikke længere skrives uden at modsige sit eget faktaark, og dét fanger
`verify-article`.

### ⚠️ To markup-varianter der vender tiden hver sin vej

    A «Scoring Summary»  →  Score at 07:16  Jack Steel (1) … GOAL by SBU
    B «Scoring Plays»    →  Oliver Corris (1) … GOAL by UST …  30:25

Min første regex var bygget på A og parrede B's tider med den FORKERTE
scorer — Corris' mål blev tilskrevet Radeke. Teksten skæres nu i bidder pr.
variant. To andre former kostede også en runde: straffespark skrives uden
«GOAL by», så en grådig navneregex slugte holdkoden («Iesha Rollins NSU
Iesha»); et navneord er nu «stort forbogstav + småt», aldrig en versalkode.
Et beskrivende mål uden holdangivelse giver `null`, ikke et gæt.

19 tests på ordret tekst fra de sider der producerede de afviste kladder.

**Næste skridt**: kør `generate-manual` og se om referaterne nu holder. Det er
først dér vi ved om hullet var det eneste.

## 📅 Ugedagen blev gættet — 4 fejl ud af 5 (2026-08-29)

Alle ti britiske kladder fra 27.-28. august afvist. Fem navngav en ugedag,
fire var forkerte: «Wednesday evening» om en torsdag, «Thursday» om en fredag.

Faktaarket gav DATOEN, ikke dagen, så modellen regnede selv. Ingen nedstrøms
kontrol kan fange det — faktaarket sagde ikke noget forkert, det sagde bare
ingenting, og så er artiklen «dækket» af sit faktaark.

`weekdayOf()` udregner dagen ind i faktaarket («Aug. 27, 2026 (Thursday)»).
Kan datoen ikke forstås («July 2026»), skrives der ingen dag.

⚠️ Min første udgave var selv forkert: `"2026-08-27"` tolkes som UTC-midnat,
`"Aug. 27, 2026"` som LOKAL midnat — samme dag, to forskellige svar. Nu
normaliseres begge til UTC-middag; testene kører grønt i tre tidszoner.

### De ti afvisninger — hvad de fejlede

| Kladde | Fejl |
|---|---|
| #170 McLean | vendte kampens forløb om: McLean bragte holdet FORAN 2-1, kladden skrev at han udlignede — og Geggs åbningsmål mangler helt |
| #171 Fletcher | forkert ugedag; «defender» om en spiller kilden kalder noget andet |
| #172 Njekwe | kilden er en FIBA U20-turnering; kladden påstår han «joins Post University» |
| #173 Cotton | kaldte et 5-1-nederlag «the narrow scoreline» |
| #174 Hollis | kilden nævner ham for ét skud på mål — «makes his mark» bærer ikke en artikel |
| #175 Cash | «midfielder» om en forward; opdigtet målbeskrivelse og oplæg |
| #176 Garden | forkert ugedag; 15 redninger (var 5); modstanderens redninger 6 (var 4) |
| #177 Williams | Fain scorede FØRSTE mål i 33., ikke udligningen før Williams' vinder |
| #178 Kelly | assisten lå i 12. minut (var 58:46); forkert ugedag |
| #179 Wright | målmand med to redninger; kilden handler om Orzechowskis to mål |

**Alle ti fejlede.** Det er ikke tilfældigt: ni af dem er kampreferater, og
det er præcis dér faktaarket er tyndest — se «Faktaarket dækker ikke selve
kampen» længere nede.

## 📸 Alle fotoforslag godkendt (2026-08-29)

Mikkel gennemgik køen og afviste dem uden atleten på. Resten er godkendt:
**1.878 britiske og 182 danske atleter har nu et foto**, køen er tom.

⚠️ Til protokollen: Mikkel afgjorde 141 forslag i admin den dag, og de
resterende 1.454 blev godkendt samlet på hans ord. Fotoet hentes fra atletens
EGEN bio-side (`bio_url`), så identiteten følger af kilden — men det er en
bulk-godkendelse, ikke 1.454 enkeltvurderinger.

## 🔎 Kontrol: faktaark der tilskriver atleten en anden persons kendsgerning (2026-08-29)

`pipeline/checks/factsheet-attribution.ts`, i det ugentlige fejeblad.

Baggrunden er #162: Moercks faktaark bar «Fifth-year student» — Bartells
egenskab. **Det er en anden fejlklasse end den vi hidtil har vogtet:**
citatvagten og `verify-article` måler artiklen mod faktaarket, men her ER
artiklen dækket af sit faktaark. Fejlen sad i grundsandheden, og så er der
ingen nedstrøms kontrol der kan fange den. Kontrollen sammenligner derfor med
det VI selv ved — rosterens årgang.

**20 fund på 60 dage, og de er værre end forventet:**

| Story | Fund |
|---|---|
| #2774 Freddie Tucker (golf, Jr.) | faktaarket siger «Senior», «Position: Defense», «the back line» — en **helt anden persons profil** |
| #2919 Bex Guy (So.) | faktaarket indeholder «Senior punter **Dante Atton** is one of 21 FBS punters…» — en navngiven fremmed |

Første udgave larmede: to af de tre første fund var «Big South Freshman of the
Year» (prisnavn) og «must be a sophomore, junior or senior» (berettigelsesregel).
Prisnavne, «Senior Night» og opremsede årgange filtreres nu fra.

Én kendt uskarphed står tilbage: en historisk oplysning («the only freshman
that year») ligner en påstand om nu. Det står i fix-teksten.

## ❌ DK-kladdekøen tømt — intet udgivet (2026-08-29)

Fem danske kladder, **ingen af dem et publicerbart kampreferat.**

Tre kom slet ikke fra en kamp: #137 og #146 var ugentlige hædersbevisninger,
#158 påstod et skifte til SMU som kilden (en Hermann Trophy-watchlist) ikke
nævner med ét ord.

De to der KOM fra en kamp var for forkerte:

**#151 Daniel Helle** — opdigtet alder («den 22-årige», vi gemmer ikke alder),
forkert ugedag (onsdag; kampen var torsdag), og holdets skudtal vendt om:
«med blot tre skud og to chancer i hele kampen» — tre skud var HOLTS tal,
holdet havde 11 skud og 7 på mål. Helles faktiske bidrag (en aflevering
tilbage til Macfarlane i opløbet til 2-0) beskrives som defensivt.

**#162 Victor Moerck** — forkert minut for modstandermålet (26. i stedet for
32.), kampen kaldt hjemmebane (den var ude i Moon Township), et opdigtet mål i
40. minut, og sejrsmålet placeret i 80. minut (Salvino scorede i 87.).

### ⚠️ Faktaarket bar selv en forkert kendsgerning

Moercks faktaark siger «Fifth-year student». Det er **Raphael Bartells**
egenskab i kilden («Fifth-year student Raphael Bartell recorded a save and an
assist»); vores egen roster siger `Sr.` om Moerck. Fase 1 flyttede altså en
oplysning fra én navngiven person til en anden, og fase 2 skrev videre på den.

Det er en anden fejlklasse end dem vi har set før: hidtil har generatoren
opfundet ting faktaarket ikke indeholdt. Her var faktaarket selv forkert — og
så hjælper hverken citatvagten eller `verify-article`, for artiklen ER
dækket af sit faktaark. **Derfor blev #162 ikke omskrevet: et faktaark der
mis-tilskriver én kendsgerning, kan ikke bruges som grundlag for de øvrige.**

## ✅ UK-kladdekøen tømt (2026-08-29)

Mikkel: «publish the high confidence game recaps. Reject everything else.»

Af 17 britiske kladder kom **kun tre fra en faktisk kamp**. Resten var
forsæsons-lister, hold-polls og previews — kilder uden et udfald at referere.

**Udgivet (1):** #160 Iesha Rollins, Northwestern State 1-4 UL Lafayette.
Omskrevet fra faktaarket, verificeret «low». Den oprindelige kladde havde
straffesparket i det 29. minut (faktaarket giver intet minut), vendte
målrækkefølgen om, kaldte kampen en sæsonpremiere (NSU stod 0-4) og vendte
kampens skudtal fra «sæsonens højeste» til bevis på klasseforskel.

**Afvist (16).** De to andre kamp-kladder var ikke til at redde:
- #147 Worsfold-Gregg — atleten står slet ikke i kilden
- #152 Ryan Holt — opdigtet målmand og anfører, og samme kamp som det
  allerede udgivne Steel-referat

Afvisningen gik gennem samme vej som /admin's knap (`deleteArticle`):
teksten gemt i `review_log`, børnene slettet før forælderen. 53 afvisninger
er nu logget i alt.

⚠️ **Sluggen bar en påstand titlen ikke længere gjorde**:
`…-fires-nsu-s-first-goal-in-tough-opener`. Den er rettet, mens artiklen var
et minut gammel og endnu ikke crawlet. Værd at huske: en slug fryses ved
udgivelse, så en forkert framing i den er dyrere at rette end i teksten.

## 🔤 Danske navne uden æ/ø/å — fast kontrol (2026-08-29)

Mikkel: «make it a thing you check regularly — the actual spelling of Danish
names.» Amerikanske rosters skriver ASCII, og `athletes.name` er sidens
overskrift, delekortet og JSON-LD'en.

**Bevis-tier (rettet):** den rigtige stavemåde stod allerede i vores egen
godkendte profiltekst — et menneske havde skrevet den ind dér, men den lå i
den forkerte kolonne og forsvandt hver gang teksten blev genberegnet. Fem
rettet og låst (`name_locked = 1`, som scraperen respekterer):

| Var | Er |
|---|---|
| Noah Norgaard | **Noah Nørgaard** |
| Marcus Jorgensen | **Marcus Jørgensen** |
| Simon Blaesdahl | **Simon Blæsdahl** |
| Malthe Bogebjerg | **Malthe Bøgebjerg** |
| Veronica Kjaer Sorensen | **Veronica Kjær Sørensen** |

**Mønster-tier (flages, rettes ikke):** led hvor dansk aldrig skriver bart
«o». Fire tilbage — Oliver Moller-Jensen, Oscar Bjornskov, Oliver Jorgensen
m.fl. Et menneske skal bekræfte mod skolens bioside.

⚠️ **«aa» og «ae» er bevidst UDE af mønstret.** Aagaard, Kjaergaard og Baagøe
er lovlige danske stavemåder som mange bærer i deres dåbsattest. At «rette»
dem ville være at omdøbe et menneske.

⚠️ **Sluggen røres ikke** ved en navnerettelse. Adressen er allerede
indekseret, og crawl-budget er lige nu det knappeste vi har.

Kontrollen kører ugentligt i kvalitets-fejebladet (`danish-names.ts`).

## 🏅 Profilteksten siger HOLDET (2026-08-29)

Mikkel: «since this is about athletes, say the sports name. Miami Hurricanes,
Ohio State Buckeyes, Oregon Ducks.»

> «Freddie Tucker plays golf for **the Iona Gaels** in New Rochelle, New York.»
> «Amy Cornfield has played field hockey for **the UMass Minutewomen** in
> Amherst, Massachusetts as a defender/midfielder since 2025.»

`schools.nickname` var udfyldt for 1.712 skoler og blev aldrig læst. 548 af de
580 skoler vi dækker har et holdnavn; resten falder tilbage på skolenavnet.

⚠️ **Kønnet er fælden**, som Mikkel selv pegede på. Tre formater i data:
- ni skoler bærer begge navne i ét felt («Stags and Athenas», «Statesmen &
  Lady Statesmen») — **herrerne står altid først**, verificeret på alle ni
- to har kun herrenavnet selvom damerne hedder noget andet: **UMass**
  (Minutewomen) og **Washington College** (Shorewomen)
- Lebanon Valley («Flying Dutchmen») og SNHU («Penmen») bruger ÉT navn til
  begge — verificeret, ikke antaget, og derfor IKKE i tabellen

**Er navnet kønnet og kønnet ukendt, dropper vi holdnavnet helt.** 270 af 2.588
aktive atleter mangler køn, og «Minutemen» om en kvinde er en påstand om et
navngivent menneske.

Man SPILLER FOR et hold og STARTER PÅ et universitet — «started at Ohio State
in the autumn of 2026» beholder skolenavnet. Engelsk tager bestemt artikel
foran holdnavnet, dansk gør ikke.

Sted-reglerne strammet samtidig (begge fundet ved at rendere mod 300 rigtige
atleter): byen springes over når skolenavnet bærer den («Cal Poly Pomona in
Pomona»), og delstaten når navnet uden fyldord ER den («University of Illinois
i Illinois») — men «Ohio State» er ikke «Ohio», så dér beholdes delstaten.

⚠️ **Regenerering taber menneskelige navnerettelser.** Marcus Jørgensen står som
«Marcus Jorgensen» i `athletes.name`; det korrekte ø levede kun i den godkendte
profiltekst. Forslaget i køen har derfor ASCII-stavemåden. Rettelsen hører
hjemme i `athletes.name` + `name_locked`, ikke i teksten.

## 🔁 Dedupen var allerede bygget

`group-stories.ts` (commit e72406d, 27-08, anden session) grupperer på
`(source_url, country)` og lukker søskende kun ved succes. Verificeret: 7
kladder oprettet siden, 7 unikke grupper. Fejebladets dublet-kontrol talte
oprindeligt pr. `source_url` alene og rapporterede derfor .dk- og
.co.uk-udgaven af samme kamp som en dublet — rettet til samme nøgle.

## 🧹 Ugentligt kvalitets-fejeblad (2026-08-29)

Mikkel: «for the next 5 months I can use you more actively — cron jobs could be
a way to regularly fix poor drafts or similar.»

`pipeline/checks/quality-sweep.ts` + `.github/workflows/quality-sweep.yml`
(mandag 06:00 UTC). Deterministisk, ingen LLM, **skriver intet**. Discord KUN
ved fund. Hver kontrol svarer til en fejl der ER sluppet igennem — en kontrol
uden et virkeligt fund bag sig larmer bare.

Første kørsel:

| Fund | Antal |
|---|---|
| roster-felter med forkert indhold (højde i `position`, vægt i `class_year`) | **269** |
| atletnavne med dobbelt mellemrum | 22 |
| flere kladder fra SAMME kildeartikel | 6 |
| «high»-risiko-kladder ældre end tre dage | 2 |
| godkendte profiltekster skabelonen nu ville skrive anderledes | 138 |

⚠️ Tallene tælles særskilt fra eksemplerne. Første udgave rapporterede
`results.length` og sagde derfor «40» om et fund på 269, fordi eksempel-
forespørgslen har LIMIT. Et overvågningsværktøj der underdriver er værre end
ingen.

`queue-stale-profiles.ts` lægger forældede tekster i `profile_draft` —
**aldrig oven i `profile_summary`**. 138 ligger i køen nu.

**269 roster-felter er det største åbne spor**: højde i `position` rammer især
svømning og roning, hvor rosteren har en højde-kolonne og ingen position.

## 📍 Skolen ligger i en BY i en delstat (2026-08-29)

Mikkel: «why would you end up with North Carolina in North Carolina? The school
will always be in a city or town in a state.»

Han havde ret, og min første løsning var forkert: jeg UDELOD delstaten når
skolenavnet var den, i stedet for at skrive hvor skolen faktisk ligger.
`schools.city` var udfyldt for 1.712 af 1.761 skoler hele tiden.

Nu «for North Carolina in Chapel Hill, North Carolina». To spærrer: er byen
skolens navn (St. Bonaventure ligger i Saint Bonaventure, NY) bruges delstaten;
er delstaten navnet og der ingen by er, siges der ingenting.

1.371 af dagens 2.196 tekster genberegnet. Profiler godkendt FØR i dag er
urørt — `--published-since` er spærren mod at en skabelonændring overskriver
en håndredigeret tekst.

## 👤 Profilteksterne er udgivet (2026-08-29) — 2.196 stk.

**Politik-ændring, Mikkel:** «I think you were right to suggest that I only
approve the template, not all texts.» Baseline-profilteksten er deterministisk
(ingen LLM), så når skabelonen er gennemgået, udgives køen samlet. Gælder KUN
`baselineProfile`/`baselineProfileEn` — artikler og LLM-udvidede profiler
(`--expand`) kræver stadig godkendelse pr. stk.

UK-atleter med profiltekst: **9 → 2.092**.

### Skolenavne: `common_name` fandtes, men INTET læste den

`schools.common_name` var udfyldt for alle 1.761 skoler. Profilteksten skrev
`athletes.university` — registernavnet. Derfor «University of North Carolina at
Chapel Hill» og «The University of Vermont and State Agricultural College».

⚠️ **Reglen kan ikke være mekanisk.** «Klip alt efter *at*» ville lave
University of Alabama at Birmingham om til «University of Alabama» — to
forskellige læresteder. Samme fælde: UNC Asheville, ULM, UNC Pembroke.
`src/lib/school-display-name.ts` har derfor en **kurateret tabel** (18 navne
verificeret mod NCAA.com, skolernes egne atletiksites og Wikipedia), dernæst
`common_name` hvis den ser hel ud, dernæst det officielle navn. Vi gætter aldrig.

Seed-scriptets `replace(/ University| College/g, "")` havde ødelagt flere navne
— «State of New York at Canton» er ikke et sted. `looksMangled()` afviser dem.

Prisen for korte sportsnavne er delstats-dubletten («North Carolina in North
Carolina»); `nameContainsState()` udelader delstaten når navnet ER den.

### Fem andre skabelonfejl, fundet ved at rendere mod 250 rigtige atleter

| Fejl | Eksempel |
|---|---|
| sportsnøglen læst højt | «has competed **in other** for Lake Forest» |
| årgang brugt som ROLLE | «as a **Sr.-3L**», «as a **Third Year**» |
| highschool i hjembyen | «is from Hampshire, England  **/ Wellington College**» |
| land i parentes | «Milnrow, Lancashire **(UK)**» |
| disciplin som personbetegnelse | «as a **breaststroke/individual medley**» |

Plus dobbelt mellemrum i roster-navne («Leo  Jaukovic»), som teksten nu
normaliserer. **Datafejlen består i `athletes.name`** og ses stadig i sidens
overskrift — ikke rettet, det er en bulk-skrivning.

`refresh-pending-drafts.ts` genberegner ventende udkast efter en
skabelonændring; baseline-kørslen rører dem aldrig selv.

## 🔍 Hvorfor .co.uk stadig ikke er indekseret (2026-08-29)

Google **henter** sitemappet (senest 28-08 21:31, 3.007 URL'er) og har
indekseret forsiden og `/athletes`. Men:

| URL | Status |
|---|---|
| `/athletes` (knudepunkt) | **Submitted and indexed**, crawlet 27-08 |
| `/athletes/a` | Discovered – currently **not indexed**, aldrig crawlet |
| en artikel | Discovered – currently **not indexed**, aldrig crawlet |
| `/athletes/jack-steel` | **Unknown to Google** — selvom den STÅR i sitemappet |

Tragten er altså: sitemap → discovered → *(står stille)* → crawlet → indekseret.
Det er **crawl-budget**, ikke en spærre: et tre uger gammelt domæne uden ét
eneste indgående link får meget lidt. Knudepunkt-opdelingen virkede (den blev
crawlet og indekseret dagen efter), men bogstavsiderne under den er ikke hentet
endnu.

To ting vi selv kunne rette:

1. **Tyndt indhold** — 9 af 2.343 profiler havde tekst. Rettet i dag (2.092).
   Google ser det først ved næste crawl.
2. **Sitemappets `lastModified` var «lige nu»** på hver hentning for ~70
   statiske sider — et tidsstempel for HENTNINGEN, ikke for indholdet. Et
   sitemap der altid råber «alt er nyt» lærer Google at ignorere feltet, og
   crawl-budget er præcis det vi mangler. Rettet: statiske sider har ingen
   lastmod, bogstavsider får nyeste atlet-`updated_at`.

**Det der reelt mangler er et indgående link.** Ingen backlinks = ingen
autoritet = minimalt crawl-budget. Bluesky er live og er den billigste kilde.
Indexing API kan IKKE bruges til almindelige sider.

## 📰 Første kampreferater på .co.uk (2026-08-28) — og hvad dobbelttjekket fandt

Tre referater udgivet: Corris (St. Thomas 1-1 Green Bay), Steel (Bonnies 2-0
Niagara), Frost (Western Illinois 3-2 Quincy). Alle tre omskrevet mod kilden og
kørt gennem `verify-article.ts` (alle «low») før udgivelse.

**Tre kladder blev AFVIST**, alle med samme rod: modellen skal skrive om en
atlet som kilden knap nævner, og fylder hullet.

| Kladde | Hvorfor |
|---|---|
| 147 Worsfold-Gregg | Han står slet ikke i kilden. Assist på et straffespark, opdigtet stadion, og teksten indeholdt stadig pladsholderen `[head coach's name not provided in source]` |
| 152 Ryan Holt | Opdigtet målmand («Alex Bono») og anfører («Luke Haakenson»), forkert dag, forkert hjemme/ude, forkert næste kamp — og samme kamp som Steel-referatet |
| 160 Iesha Rollins | Rammet som sæsonpremiere og hendes «første optræden»; NSU stod 0-4 og det var hendes første MÅL. Straffesparket faldt i det 70. minut EFTER ULL's to, ikke i det 29. før dem |

### Dobbelttjekket fandt tre fejl mere — to i motoren

**Dansk under hver eneste britiske artikel, siden .co.uk gik live 5. august.**
«Kilde» (SourceBox), «Sæson {season}» (SeasonUpdateTemplate) og «Sådan bruger
vi Ai» (AiDisclaimer) stod hardkodet — uden `lang` overhovedet. Samme skanning
fandt tre til: fejlsiden, atletprofilens «Karriere-højdepunkter» og hele
cookie-banneret.

Ny spærre: `src/lib/_no-danish-in-jsx-test.ts` skanner læservendte komponenter
for dansk tekst i selve opmærkningen. ⚠️ **Den leder efter æ/ø/å og er en NEDRE
grænse** — «Noget gik galt» stod lige ved siden af «Prøv igen» og slap igennem.

**Sæson-badgen var et år bagud i hele efterårssæsonen.** `getSeason` gav
`${year-1}–${year}` uanset måned, så et referat fra 20. august 2026 fik
«Sæson 2025-26» — sæsonen FØR kampen. Grænsen ligger nu i august, hvor den
amerikanske idrætssæson begynder. 11 tests.

**Kildekonflikt i teksten**: Corris-referatet krediterede assisten til
Agogliati og Salamanca Lopez efter skolens artikel — men skolens EGEN box score
siger Agogliati og **Owen Marshall**. Den anden mand er ude af artiklen;
Agogliati står i begge. Mikkel afgør om box scoren skal veje tungest ved navne
(reglen i dag siger kun at den er grundsandhed for TAL).

### Faktaarket dækker ikke selve kampen

Min første omskrivning af Corris-referatet brugte hele kildesiden — sted,
Green Bays udligning, målmandens debut, holdstatistikken. `verify-article`
flagede den **high**, fordi den måler mod FAKTAARKET, og faktaarket indeholdt
intet af det: det fangede hans mål og hans minutter, men **ikke at Green Bay
scorede overhovedet**. Artiklen blev derfor skåret ned til det faktaarket bærer
— invarianten «en artikel må kun indeholde det fase 1 udtrak» holdes, og
review-loggen forbliver ærlig evidens.

Men det er selve grunden til at kampreferater driver ud i opdigtet kulør: der
er ikke nok i faktaarket til at fylde en artikel.

## 🔍 Search Console svarer nu — og svaret var et andet end vi troede (2026-08-26)

Propertyerne er verificeret og service-kontoen har adgang til begge.
`./scripts/search-console.sh` virker. Første kørsel rettede to antagelser:

**1. «0 indekseret» i sitemap-rapporten betyder ingenting.** .dk står med
«518 indsendt, **0 indekseret**» — og .dk er åbenlyst indekseret: 112 klik og
2.467 visninger på 28 dage. Feltet `indexed` i Googles sitemaps-API har været
dødt i årevis. **Læs det aldrig som et indekseringstal.** Brug `--inspect`.

**2. .co.uk-profilerne er ikke «vurderet for tynde» — Google har aldrig set dem.**

| URL | Googles svar |
|---|---|
| `student-athlete.co.uk/` | **Submitted and indexed**, crawlet 22-08 |
| `/athletes/freddie-tucker` | **URL is unknown to Google** · aldrig crawlet |
| `/athletes/a` | URL is unknown to Google (udrullet samme dag) |

«Unknown to Google» er noget helt andet end «Crawled – currently not indexed».
Det første er et **opdagelses-problem**, det andet en kvalitetsdom. Vi har det
første. Forsiden er inde; ruten videre ind i sitet har bare ikke båret.

Hvorfor: indtil i dag gik den ENESTE interne vej til en profil gennem én side
med 2.343 links, som Google sjældent gennemgår helt. Sitemappet stod dermed
alene om opdagelsen — 2.703 URL'er på et tre uger gammelt domæne uden
autoritet, hvor crawl-budgettet er minimalt.

**Knudepunkt-opdelingen nedenfor er altså det rigtige greb, men af en anden
grund end antaget**: den hjælper OPDAGELSEN (to hop gennem små sider), ikke
den oplevede kvalitet. Tyndt indhold er stadig et tema for hvad der sker EFTER
crawlet — men det er ikke det der spærrer nu.

**Modbeviset for at det skulle være strukturelt**: .dk's egne top-søgninger er
udelukkende ATLETNAVNE — «sebastian gubi», «magnus møller», «valdemar pape
tennis» — på position 3,8-7,7. Profil-som-pillar virker, når siderne bliver
opdaget. .dk har 518 URL'er og er gammelt; .co.uk har 2.703 og er tre uger.

⚠️ Indexing API kan IKKE bruges til almindelige sider (kun job-opslag og
livestreams). Sitemap + intern linkning er vejen — se `SETUP-search-console.md`.

## 🧭 /athletes er nu et knudepunkt (2026-08-26)

Mikkel: sektionsforsiden skal ligge et niveau OVER de målrettede sider.

| Adresse | Rolle |
|---|---|
| `/athletes` · `/atleter` | Knudepunkt: alfabetet med antal, vej til hele listen, badge-forklaring. **26 links, ikke 2.343.** |
| `/athletes/all` · `/atleter/alle` | Hele listen med sorteringsfanerne (sport/navn/skole) + alumni |
| `/athletes/a` · `/atleter/a` | Ét forbogstav |

Sluggen «all»/«alle» ligger i sprogpakken som `subroutes` (`SubRouteKey`), ikke
som en konstant — samme grund som `routes`: den er læservendt. Den slås op FØR
både bogstav og profil, så rækkefølgen i ruten ikke afgør hvem der vinder, og
en test fastholder at «all»/«alle» aldrig kan læses som et bogstav.

Fundet undervejs: `groupBy` sorterede grupperne med `localeCompare(..., "da")`
— dansk kollation af britiske skolenavne. Retter sig nu efter sitets locale.

## 🐛 Sidearm-parseren læste kolonner på hardkodede indekser (2026-08-26)

`parsers/sidearm.ts` antog `#, Name, Pos, Yr, Hometown` — mønstret på en
holdsport-roster med trøjenummer forrest. **Iona University's golf-roster har
ingen nummerkolonne** (`Name, Yr., Ht., Wt., Hometown / High School, Major`),
så alt rykkede én plads:

| Felt | Blev læst som | Var i virkeligheden |
|---|---|---|
| `name` | "Jr." | Freddie Tucker |
| `position` | "6-0" | hans højde |
| `class_year` | "175" | hans vægt |

Han lå på sitet som en profil ved navn **«Jr.»** i to uger, med i sitemappet.

Kolonnerne findes nu via tabellens EGEN overskriftsrække; hardkodningen er
bevaret som fallback når der ikke er noget `thead`, for dér er den stadig det
rigtige gæt. Overskrifterne matches præcist nok til at «Ht.» ikke kan forveksles
med «Hometown». 27 tests i `parsers/_sidearm-test.ts`, herunder Ionas faktiske
tabel og en klassisk nummereret roster.

Rækken er rettet i D1 (id 815 → Freddie Tucker, `Jr.`, 2028, ingen position) og
`athlete_aliases` har `jr` → 815, så den gamle adresse sender videre.

⚠️ **Kun ét sted var ramt** — verificeret: ingen andre aktive atleter har en
højde i `position` eller en vægt i `class_year`. Men fejlen ramte kun rosters
UDEN nummerkolonne, altså individuelle sportsgrene (golf, tennis, svømning,
atletik, cross country) på Sidearm-tabeller. Der kan være hold hvor
konsekvensen var at spilleren slet ikke blev fundet frem for at blive
fejllæst — næste roster-scrape viser det.

## 🚦 Tre flaskehalse løsnet (2026-08-26) — ingen af dem var kvoter

Mikkel: fotos tager kun en brøkdel pr. kørsel og kommer aldrig forbi A;
"udtaget til preseason all-conference second team"-artiklerne er ikke gode nok;
der er langt færre kampreferater end der burde være, og kladdernes kilder er
fem dage gamle.

**Alle tre var vores egne indstillinger.** Målt forbrug på gratis-kæden var
2-32 LLM-kald/dag ud af ~2.650 tilgængelige, D1 fylder 62 MB af 5 GB, og
repoet er offentligt, så GitHub Actions-minutter er gratis og ubegrænsede.

**1. Foto-køen kom aldrig forbi A.** `suggest-photos` kørte med `--limit 50`
og sorterer `photo_checked_at ASC NULLS FIRST, name`. 2.057 af 2.121 atleter i
køen havde ALDRIG været tjekket, delte derfor `NULL`, og sorteringen faldt
tilbage på navnet — A-navne nat efter nat, og 42 nætter pr. runde. Trinnet er
en almindelig `fetch()` af bio-siden: ingen browser-render, ingen LLM, ingen
kvote. Grænsen er 400, og køen har fået sin egen workflow
(`photos-daily.yml`, 09:40 + 16:40 UTC). 2.339 af 2.343 britiske atleter har
`bio_url`, så den gamle flaskehals er væk.

**2. Vi bad selv om forsæsons-notitserne.** `HONORS_BOOST = 15` løftede enhver
hædersbevisning til 100, mens et referat topper på 90 (fuldt navn). Begge køer
sorterer `relevance_score DESC`, så det var ikke en tie-break — hver eneste
hædersbevisning slog hvert eneste referat, hver kørsel. Med fem artikler pr.
kørsel nåede referaterne aldrig frem, selvom de LÅ der: "Women's Soccer Defeats
Rhode Island, 3-0" stod som `new` med score 90 og blev aldrig skrevet.

Boostet er fjernet. `pipeline/discover/story-kind.ts` rangerer nu efter type:
**referat +15, forsæson/watch list/poll −25, hædersbevisning i sæsonen neutral.**
Vi filtrerer ikke — en forsæsons-notits kan stadig blive skrevet når køen er
tom. Straffen er valgt så et fuldt navn (90 → 65) stadig er over
`MIN_RELEVANCE_GENERATE`, mens et efternavns-match (35 → 10) falder under
`MIN_RELEVANCE` og slet ikke gemmes. 37 tests på ægte overskrifter fra
`stories`.

> De tre kladder box-score-fejlen forurenede 22. august (#109 preseason,
> #120 watch list, #126 anførermeddelelse) var alle af samme slags: historier
> uden kamp. Den kategori er nu også bagerst i køen.

**3. De fem dage gamle kilder var kø, ikke forsinket discovery.** Discovery er
fin (564 skoler med feeds, ~800 tjek/dag i kapacitet). Men 20 færdige faktaark
ventede på 5 pladser om dagen. Nu `MAX_ARTICLES_PER_RUN` 5 → 12, tre kørsler
dagligt (07:30/13:30/19:30 UTC, oven på discover 00/06/12/18), faktaark-grænsen
20 → 60. **Det rigtige loft er `MAX_PENDING_DRAFTS` (20)** — gennemgangskøen,
ikke tokens: løber kladderne op, pauser genereringen af sig selv.

⚠️ Rangeringen gælder **nye fund**. Historier der allerede ligger i D1 beholder
den score de blev gemt med.

## 🔤 Bogstavsider til atleterne (2026-08-26) — og hvorfor .co.uk ikke er indekseret

`/athletes` var 2.343 links på én upagineret side, og den eneste vej ind til
profilerne. Nu har hvert forbogstav sin egen side (`/athletes/a` · `/atleter/a`)
med egen overskrift, indledning, metadata og alfabet-navigation; oversigten har
fået alfabetet og en kort indledning.

- Alfabetet er **sprogpakkens** (`alphabet` i `LanguagePack`) — dansk slutter på
  Æ Ø Å, og Ø bliver til `/atleter/oe` gennem samme translitteration som
  atleternes egne slugs. Engelsk stopper ved Z.
- Bogstavet slås op **FØR** profilen i `[...segments]`. Ufarligt: en atlet-slug
  er altid `fornavn-efternavn`, og `letterFromSlug` accepterer kun bogstaver der
  står i sprogets alfabet.
- Opdelingen sker i JS, ikke SQL: SQLite's `upper()` er ASCII-only og ville
  lægge "Østergaard" uden for alfabetet.
- **Bogstaver uden atleter er tekst, ikke links, udelades af sitemappet og
  404'er hvis adressen gættes.** En tom side med 200 er en soft-404.

**Hvorfor sitemappet har ~3.000 sider og næsten ingen er indekseret:** det er
ikke teknisk. robots.txt tillader (dark launch er slået fra), canonicals er
selvrefererende og rigtige, sitemappet er meldt korrekt, og der er NUL
slug-overlap med .dk — altså intet dublet-problem. Problemet er hvad siderne
indeholder: af 2.343 britiske atleter har **355 et foto (15%), 16 en artikel
(0,7%) og 9 en profiltekst (0,4%)**. Resten er navn + skole + sportsgren på en
skabelon, på et domæne der er tre uger gammelt. Det er lærebogs-"Crawled –
currently not indexed". Bogstavsiderne og foto-køen er de to greb der flytter
det; profilteksterne er begrænset af godkendelseskøen, ikke af generering.

⚠️ **`GOOGLE_SEARCH_CONSOLE_KEY` er stadig ikke sat**, så ovenstående er udledt
af sidernes indhold, ikke læst hos Google. `./scripts/search-console.sh` ville
give status pr. URL direkte.

🧹 **Datafund undervejs**: `athletes` har en aktiv række ved navn "Jr."
(id 815, slug `jr`, home_country UK) — et parser-artefakt. Den optræder i
sitemappet som en rigtig profil. Kræver en D1-skrivning, så den ligger urørt.

## 🔄 Transfers er data nu (2026-08-22) — migration 045

Mikkel, da jeg havde afvist en «debut»-formulering med at atleten er junior:
«Mind you that there are transfers. It's not uncommon for a junior to have a
debut on that particular team.»

Han har ret, og fejlen var min logik. Årgang fortæller hvor langt atleten er i
sit STUDIE — ikke hvor længe hun har været på HOLDET. En debut kan hverken
bekræftes eller afvises med årgangen.

**Oplysningen lå i det svar vi allerede henter.** Sidearms roster-API har feltet
`previousSchool` — verificeret mod acusports.com 2026-08-22, hvor 8 af 12
stikprøver havde det udfyldt («Texas Tech / Houston», «UNT», «Central Arkansas»).
Parserens eget filhoved har hele tiden nævnt «forrige skole (transfers)» som en
af grundene til at bruge API'et. Vi kastede feltet væk.

Nu: `RosterEntry.previousSchool` → `athletes.previous_school` (migration 045,
kørt) → ATLET-blokken i begge promptsæt → gennemgangspakkens atlettabel.
Værdien gemmes RÅT som skolen skriver den, flere skoler adskilt med "/" inklusive.

**Regel 26** (begge sprog): debut og «første sæson» kræver KILDEN. Årgangen kan
ikke bruges som argument i nogen af retningerne. Er FORRIGE SKOLE udfyldt, er
skiftet et faktum der må bruges — men debuten skal stadig stå i kilden.

**Feltet er tomt for alle 2.335 aktive atleter indtil næste roster-scrape**, og
det bliver kun udfyldt for skoler på JSON-API'et (42% af D1). **Tomt betyder
«ved ikke» — ikke «ingen transfer».** Det står i gennemgangspakken med de ord.

**Sagen der beviste pointen**: Katie Ormerod (#124) står som junior, og jeg
skar en «debut»-formulering væk med den begrundelse. Loyolas egen bioside siger
«Prev School: Florida Tech» og «Played two seasons at Florida Tech» — 2026 ER
hendes første sæson på Loyola, og kampen 12. august var Loyolas sæsonpremiere.
Kladden havde altså ret i sagen; jeg havde uret i logikken. Rækken er rettet
(`previous_school = 'Florida Tech'`), og oplysningen er nu tilbage i artiklen —
denne gang med belæg.

**Bemærk hullet**: Loyola kører HTML-roster, hvor «Prev School» kun står på den
enkelte atlets bioside. Scraperen henter kun holdlisten, så feltet udfyldes ikke
automatisk for HTML-skoler. Skal de med, kræver det et opslag pr. atlet — ikke
gjort, og prisen (2.335 hentninger) skal vejes mod værdien.

## 🧪 Faktaarket forurenede sig selv — spærren sidder nu i koden (2026-08-22)

Fem nye kladder gennemgået og omskrevet (#124-#128, tre britiske og to danske).
Fejlene var de sædvanlige — men tre af dem havde SAMME tekniske årsag, og den er
nu lukket i stedet for at blive rettet i hånden en gang til.

**Årsagen**: `enrichFactSheetWithBoxScore` fulgte ethvert «Box Score»-link på
kildesiden. På Sidearm-sider ligger sådan et link i kampprogram-widgetten — også
på sider uden kamp. Berigelsen hentede derfor en FREMMED kamps tal ind i
faktaarket, og generatoren skrev videre på dem:

| Kladde | Historien handlede om | Hvad faktaarket fik |
|---|---|---|
| #109 | preseason-udtagelse | «Maine 0 Final 1 Vermont» + 3 skud |
| #120 | watch list | «Drexel 0 - Hofstra 2» + 90 minutter |
| #126 | anførermeddelelse | «Rutgers 1, Michigan 2» + 0 redninger |

`looksLikeMatchStory()` spærrer nu: er der hverken modstander eller resultat i
det faktaark der blev udtrukket af TEKSTEN, er der ingen kamp at berige — og så
hentes siden slet ikke (det sparer også en browser-render). Otte tests, og
fixturet er ændret til at være en kamp, fordi det er dét berigelsen gælder.

**To falske fund i navnetjekket, begge danske sproglige former:**
- «Seton Hall-spiller», «Hermann Trophy-liste» — sammensætning med bindestreg.
  Tjekket prøver nu også leddet før bindestregen.
- «Holdkammeraten Til Kauschke» — dansk sætter titlen foran navnet uden komma.
  Står navnet selv i kilden som sammenhængende ordfølge (mindst to ord), er
  sammensætningen ikke et ukendt navn. «Cheftræner Mark Carr» fanges stadig,
  fordi Mark Carr ikke står i kilden — den test er der stadig.

**Kladderne**: #124 gjorde uafgjort til sejr og gav Ormerod målmandens tre
redninger. #125 var 6.500 tegn på ét watch list-notat, med opdigtet alder,
«Lancashire» og to forkerte MAC Hermann-vindere; den er nu 390 tegn. #126 gav
Beattie holdkammeratens målstatistik og digtede en Michigan-kamp. #127 og #128
handler om samme atlet, men er to RIGTIGE historier en dag fra hinanden
(preseason-holdet 11/8 og watch list-listen 10/8) — begge kladder blandede dem
sammen, og #128 gjorde tyskeren Til Kauschke til dansker.

Alle fem står nu med nul mekaniske fund og er stadig upublicerede.

## 🔎 Search Console for begge sites (2026-08-21) — venter på en nøgle

`pipeline/report/search-console.ts` + `./scripts/search-console.sh` henter
søgetal for **.dk og .co.uk i samme kørsel**, så de kan sammenlignes — det kan
dashboardet ikke. Søgninger, sider, klik/visninger/CTR/position, sitemap-status
(indsendt vs. indekseret), URL-inspektion og indsendelse af sitemap.

**Adgang: service-konto, ikke browser-login.** JWT signeres med `jose` (allerede
en afhængighed) og veksles til et access token — ingen `googleapis`-pakke for ét
kald. Opsætningen står i `SETUP-search-console.md`; verifikationen af domænet
skal Mikkel selv lave, for en service-konto kan læse en property, men aldrig
oprette eller verificere den.

**Fælder der er kodet ind, fordi de koster en fejlsøgning hver:**
- Property-navnet: `sc-domain:vært` ≠ `https://vært/`. Rapporten spørger
  `/sites` om hvad kontoen FAKTISK har adgang til frem for at gætte, og siger
  det højt hvis den mangler adgang (403 ligner en nøglefejl, men er det ikke).
- Vinduet slutter **i går**: data halter 2-3 døgn, og ellers ligner hver kørsel
  et fald i trafikken.
- `type: "web"` — Discover/News blandes ikke i søgetallene.

`_search-console-test.ts` (29, i CI) dækker property-matchning (.dk og .co.uk må
aldrig forveksles), datovinduet hen over månedsskifte og argumentparsingen.

## 🇬🇧 Sitene er adskilte hele vejen ud (2026-08-21, sidste runde)

Sektionsstierne og query-parametrene var det sidste danske på .co.uk. De er nu
sprogbestemte, og **motoren deler kun det der ER fælles**.

- Sprogpakken har `routes` (athletes/schools/guides/archive) og `params`
  (page/source). Typen tvinger begge sprog til at udfylde dem — et nyt sprog
  kan ikke glemme dem.
- **Middlewaren** skriver sitets sti om til app-routerens (danske) mappenavn og
  sender det andet sprogs sti videre med **308**. Mapperne i `src/app/` behøver
  altså ikke at blive omdøbt.
- Alle links, canonicals, breadcrumbs, sitemap og feeds bygger stien af
  sprogpakken. Det ENGELSKE guide-indhold linkede stadig til `/atleter` —
  også rettet.
- **Læsningen tager imod begge parameternavne** (`?side=` og `?page=`,
  `?kilde=` og `?source=`), så et delt link ikke mister sin side eller kilde,
  hvis det åbnes på det andet site.
- Analytics klassificerer `/athletes` og `/atleter` som samme sidetype.

Verificeret live: `/athletes`, `/schools`, `/guides`, `/articles` svarer 200 på
.co.uk; `/atleter/aaron-bickerton` → 308 → `/athletes/aaron-bickerton`;
`/athletes` → 308 → `/atleter` på .dk; nul danske stier i UK-sitemappet og nul
engelske i det danske.

## 🔒 Dansk er ikke længere et fallback (2026-08-21)

Mikkel, efter tredje gang: «The audience is separate, so the sites should be
separate — only the motor is shared. Is anything outside of this plan? Will
there be any future issues like this?»

Planen var rigtig og skrevet ned; det var HÅNDHÆVELSEN der manglede. Alle tre
fejl havde samme form: et **valgfrit `lang` med dansk som stiltiende standard**.
Koden kompilerede, .dk så rigtig ud, og fejlen viste sig kun på det andet site.

**Gennemgangen fandt ni mere — alle live på .co.uk indtil i dag:**

| Hvor | Hvad der stod |
|------|---------------|
| JSON-LD (det Google læser) | `inLanguage: "da"`, `nationality: Denmark` på britiske atleter, udgiver «StudentAthlete.dk», og alle absolutte URL'er på .dk-domænet |
| Delekortet (OG-billedet) | «FODBOLD» og «19. august 2026» — verificeret ved at rendre kortet |
| Datoer overalt | `"da-DK"` hardkodet i `formatDate` |
| Relativ tid | «Lige nu», «3t siden» som danske strenge i koden |
| Relaterede artikler | artikeltypen fra den danske `ARTICLE_TYPE_LABELS` |
| Rettelsesboksen | ordet «Rettet» |
| RSS | kanaltitel «StudentAthlete.dk», dansk beskrivelse, `<language>da</language>` |
| OG-tags | nøgleordet «dansk» på britiske artikler |
| Analytics | sport-sluggen slået op i standardsitets tabel → britisk fodbold talt som amerikansk fodbold |
| Annoncemærkning (Fanatics) | dansk tekst, dansk brand, dansk moms |

**Så det ikke kan gentage sig** — fire spærrer, ikke fire rettelser:

1. `lang` er **påkrævet** i alle læservendte opslag. En glemt parameter er en
   TYPEFEJL. Compileren pegede selv på 18 steder, da spærren blev sat.
2. `ADMIN_LANG` gør admins dansk til et valg, ikke et fallback.
3. `nationalityName` + `demonym` på landeprofilen: schema.orgs nationalitet og
   prosaens tillægsord kan ikke længere være danske for en brite.
4. `_no-danish-default-test.ts` i CI: intet `lang?` i de læservendte moduler, og
   ingen hardkodet `da-DK` / `inLanguage: "da"` / `Denmark` / «dansk» / brand
   uden for sprogpakker og landeprofiler. Kommentarer tæller ikke med, så testen
   ikke fejler på sine egne forklaringer.

**Tilbage — og det kræver en beslutning fra Mikkel**: sektionsstierne
`/atleter`, `/skoler`, `/viden`, `/artikler` og query-parametrene `?side=` og
`?kilde=` er danske på ALLE sites. De er fysiske mapper i app-routeren + 138
hardkodede steder, så det er en rute-tabel pr. sprog + middleware-rewrite +
308'ere fra de gamle stier. `src/lib/routes.ts` har hele tiden sagt at de hørte
hjemme i sprogpakken «når site nummer to lander».

## 🔗 Engelske adresser på det engelske site (2026-08-21)

Mikkel: «UK articles should not be Danish slugs, that goes without saying.»
Britiske artikler lå på `/fodbold/…` og `/atletik/…`, fordi `getArticleUrl()`
blev kaldt uden sprog og derfor fik standardsitets slug. Sproget følger nu med
hele vejen — kort, karrusel, relaterede artikler, profilsider, feed, sitemap,
canonical og social-pipelinen — og ruten kender sitets eget sprog.

**Tre fejl mere kom med op, da tråden blev trukket:**

1. **Sitemappet pegede på 404'ere — også på .dk.** Artikel-adressen blev bygget
   af DB-nøglen (`soccer`), som ingen af sitene serverer. Verificeret på tre
   danske adresser før rettelsen: alle 404. Det bruger nu `getArticleUrl` som
   alt andet.
2. **`/football` på .co.uk viste den engelske sportsside (soccer) fyldt med
   AMERIKANSK fodbold-atleter**, fordi `urlSlugToDbSport()` slog sluggen op i
   standardsitets tabel.
3. **307 hvor der stod 301.** Både de nye sprog-omdirigeringer og de tre
   legacy-omdirigeringer (hvis kommentarer allerede sagde «301 permanent»)
   brugte `redirect()`, som sender 307. En midlertidig kode flytter ikke en
   indeksering. Nu `permanentRedirect()` → 308.

**Fælden ved at «bare acceptere begge sprog»**: `football` er en gyldig slug på
begge sprog og betyder hver sin sportsgren — amerikansk fodbold på dansk, soccer
på engelsk. Omdirigeringen sker derfor KUN når sluggen betyder præcis samme
sportsgren som artiklen, og sitets eget sprog spørges først.
`_article-url-test.ts` (13 tests, i CI) holder fast i begge retninger.

Verificeret live: `/football/<slug>` 200 på .co.uk, `/fodbold/<slug>` → 308 →
`/football/<slug>`, `/fodbold` → 308 → `/football`, `/athletics` → 308 →
`/atletik` på .dk, og sitemap-adresser der svarer 200 på begge sites.

**Stadig dansk på det engelske site**: sektionsstierne `/atleter`, `/skoler`,
`/viden`, `/artikler`. De er mappenavne i app-routeren, ikke opslag i en tabel,
så de kræver engelske ruter + omdirigeringer — ikke gjort.

## 🇬🇧 UK ud af dark launch + fem nye kladder rettet (2026-08-21)

**Sitet må indekseres nu.** Begge grunde til noindex var væk: forespørgslerne
filtrerer på land (`a.country` / `home_country` i `src/lib/db.ts`), og sitet har
sit eget indhold. Verificeret FØR flaget blev slået fra: dansk atlet → 404 på
.co.uk, britisk artikel → 404 på .dk, sitemappet på .co.uk er britisk (2.092
atleter, 537 skoler mod .dk's 271/168), canonical peger på .co.uk selv,
`lang="en"`, og .dk har stadig ingen X-Robots-Tag. Efter deploy: ingen
X-Robots-Tag på .co.uk, `<meta name="robots" content="index, follow">`, og
robots.txt med `Allow: /` + `Allow: /api/og`.

**Én ting blev IKKE anglificeret: URL'erne.** Britiske artikler ligger på
`/fodbold/…` og `/atletik/…`, fordi `getArticleUrl()` kalder `dbSportToUrlSlug()`
uden sprog og derfor får standardsitets slug. `/football/<slug>` svarer 404 —
også ruteopslaget er dansk. Det er ikke en dublet (canonical er korrekt), men det
er danske ord i adressen på et engelsk site, og fra i dag bliver de indekseret.
Rettes det senere, koster det 301'ere og genindeksering.

**Fem nye kladder (#119–#123), alle britiske, alle rettet.** Mønstret er det
samme som i går, og to fejl er værd at huske:

- **#119 (Sonny Wright, UAH)**: kladden gav Wright en hæder der tilhører
  holdkammeraten. Kilden skriver «A member of last season's Second Team All-GSC,
  senior Orzechowski was named…» — sætningen hører til Orzechowski. Gennemgangen
  fangede det; jeg havde selv skrevet den forkert ind i min rettelse.
- **#123 (Amy Meadows, Hofstra)** havde forkert konference (Conference USA —
  Hofstra spiller i CAA), forkert ugedag, en opdigtet «collegiate career in the
  UK», en opdigtet spilbeskrivelse, hjemmeholdet gjort til udehold og et 1-3
  kaldt «a three-goal defeat».
- **#121 (Libby Bermingham)** læste boxscorens «58 minutes» (spilletid) som et
  indskiftningstidspunkt og byggede en indskiftningshistorie oven på det — hendes
  mål faldt 54:19 og 63:43. Begge mål var i øvrigt hovedstød; kladden beskrev
  afslutninger på jorden.
- **#120 (Worsfold-Gregg)** hentede igen et fremmed boxscore fra faktaarket og
  digtede en «preseason opener» mod Hofstra ud af det.
- **#122 (Jessica Whitaker)** fremskrev en Sr. med «expected to graduate in
  2027» (regel 25) og skrev sæsonstarten i fremtid, selv om den lå ti dage tilbage.

**Årgangs-konflikt afklaret ved kilden**: UAH's pressemeddelelse kalder Wright
«senior», basen siger Jr. Skolens EGEN roster giver basen ret — 2023 Freshman,
2024 Redshirt Freshman, 2025 Redshirt Sophomore, **2026 Junior**. Modsat sagen om
Paul Claes Nielsen, hvor artiklen havde ret og rosteren tog fejl. Reglen er
altså ikke «artiklen vinder», men «slå det op på rosteren». Kladden nævner ingen
årgang.

**Tilbagevendende**: faktaarkets boxscore-linjer er stadig upålidelige (fremmede
kampe, holdtal under atletens navn, spilletid der ligner et minuttal), og
gennemgangens pakke siger stadig «faktaarket er det ENESTE kladden må hvile på»
mens tjekpunkt 2 siger «faktaarket ELLER kilden». Begge dele koster fund i hver
eneste runde.

## 🇬🇧 Otte britiske kladder rettet — og to fejl fundet undervejs (2026-08-20)

Mikkel bad om en gennemgang af de britiske kladder. Alle otte (#109, #110,
#112–#117) er nu bragt i overensstemmelse med deres kilder, og kvalitetstjekket
melder **nul mekaniske fund** på dem alle. Ny hjælper:
`pipeline/generate/save-draft.ts` — læser den rettede tekst i generatorens eget
format (`# titel` / `> ingress` / brødtekst), skriver den tilbage gennem de samme
felter som `/admin`, **publicerer aldrig**, nægter at røre en publiceret artikel
og flytter kun sluggen hvis titlen ændres.

**Tre kladder var reelt fri fantasi oven på ét faktum:**

- **#113 (Lauren Pickup, Rice)** var værst. Kilden er en ugens-hæder: Pickup fik
  honorable mention, Kirsten Ruf blev ugens målmand. Kladden lavede det om til en
  kampreportage — «to mål i et 3-2-nederlag til Texas A&M», mål i første halvleg,
  en opdigtet træner ved navn **Brian Lee**, og målmanden hed **Sarah** Ruf.
  Sandheden er det modsatte og bedre: hun scorede ét mål i hver af de to kampe,
  og det er netop pointen — første gang i karrieren i to kampe i træk.
- **#114–#116 (Jack Whaley, FSU, golf)** var tre næsten ens svulstige tekster på
  4.800–6.000 tegn. Ude er bl.a. «den første englænder i årevis», en alder
  (23 år), en påstand om at han ville være den første brite til at vinde siden
  **Matt Wallace i 2017**, **Tom McKibbin** og **Barclay Brown** som
  sammenligning, ACC-tilhør, og en forkert dag for finalen (fredag → søndag).
  Kvartfinalen sluttede på 14. hul (5&4), ikke på 13., og birdien på 22. hul mod
  Ormond faldt i MATCHEN, ikke i kvalifikationens omspil — kladden havde blandet
  de to sammen. Teksterne er nu 1.300–1.800 tegn.

**Fem mindre, men reelle fejl:** #109's ingress gjorde sidste sæsons 22 point til
noget hun lavede «in the preseason campaign». #110 skrev konferencens fulde navn
uden belæg i kilden og lagde «Now a senior» foran 2025-tallene. #112 kaldte
Blythe Clark målmand (kilden siger det aldrig — det er en slutning fra
«outstretched hand») og havde et «two of them» der kunne læses som om atleten
spillede for UNCG. #117 kaldte 2025 hans ANDEN sæson hos Wolfpack, hvor kilden
siger at han nu GÅR IND I sin anden — og fremskrev en Sr. med «set to graduate in
2027», som regel 25 forbyder. Og «soccer» stod tre steder; husreglen er britisk:
football.

**Relative ugedage er en fælde i sig selv.** «on Saturday», «Thursday night»,
«was set for Friday» — skrevet ud fra en kilde fra 13.–17. august og udgivet den
20. peger de på den KOMMENDE weekend. Alle otte har nu datoer.

**To ting rettelserne ikke kan løse:**

1. **Den vigtigste Whaley-historie er aldrig skrevet.** Story #2834, «Whaley
   Takes Home U.S. Amateur Championship» (16. august), står stadig som `new`,
   mens de tre optaktshistorier blev til kladder. Det samme gælder #2932: Whaley
   er udtaget til **Walker Cup-holdet for GB&I** (18. august). Vi har altså tre
   tekster om vejen til en finale, og ingen om at han vandt den.
2. **Faktaarket forurener sig selv med fremmede box scores.** #109's ark
   indeholder «Maine 0 Final 1 Vermont» og en statline (3 shots, 0 goals) fra en
   kamp der ikke er spillet — kilden er en preseason-udtagelse. #112's ark lægger
   ECU's HOLDtal (2 mål, 1 assist) ind under atletens statistik. Begge kladder
   gik uden om tallene af sig selv, men næste kladde på samme ark kan lige så godt
   give hende to mål.

**Bemærk om gennemgangens egen målestok**: pakken siger «faktaarket er det ENESTE
kladden må hvile på», mens tjekpunkt 2 siger «faktaarket ELLER kilden». Derfor
returnerer gennemgangen `fix` med medium-fund på oplysninger den selv har
verificeret i kilden. De to formuleringer bør enes om én regel.

## 🐛 Afvis-knappen og Facebook-billedet (2026-08-20)

Begge fejl kom fra Mikkel midt i kladdegennemgangen.

**«Serverfejl» ved afvisning.** `deleteArticle` kørte en ren
`DELETE FROM articles`, men to tabeller peger på rækken med en fremmednøgle:
`social_posts` (migration 018) og — siden i går — `draft_reviews` (migration
043). Fra det øjeblik hver kladde fik en gennemgang, fejlede hver eneste
afvisning med FOREIGN KEY constraint failed. Verificeret i D1 med en
skraldespands-række: børn først, så forælder, i én batch. `review_log` har ingen
fremmednøgle og gemmer selve teksten, så afvisningen kan stadig efterprøves.
Samme fælde er lukket i `cleanup-false-positives.ts`, og `/api/admin/action`
logger nu fejlen i stedet for kun at svare «Serverfejl».

**Facebook-opslag uden billede — rækkefølgen, ikke robots.txt denne gang.**
`Allow: /api/og` er live og virker. Men siden lover `og:image:width=1200`, og
mangler kortet i `card_blobs`, serverer /api/og sit **600×315-fallback**.
Facebook viser så opslaget uden billede — og husker det i ~30 dage. Sporet i
tidsstemplerne: 18/8 postede Amtrup-artiklen 07:07 og fik sit kort 07:46; 20/8
postede #108 07:58 og fik kortet 08:50. #111 havde sit kort i forvejen og fik
billede. Cron'ens `:05` (kort) før `:15` (social) er altså ikke en rækkefølge man
HAR — GitHub Actions' skemalægning skrider. Nu er den en betingelse:
`cardReadyClause()` i `post-social.ts` lader kun artikler med færdigt kort komme
igennem køen, køen siger højt hvad den venter på, og social-workflowet renderer
manglende kort FØR det dræner. Testen i `_social-test.ts` binder SQL'ens nøgle til
`cardBlobKey()`.

**#108's opslag er stadig uden billede.** Facebook husker sit eget kort; det får
kun et billede, hvis opslaget slettes (`delete-post.ts`) og postes igen.

## 🔌 Claude Desktop kan arbejde på sitet (2026-08-20)

Kontekstpakken gav Desktop viden; connectoren giver den hænder.
`/api/mcp/<token>` på den eksisterende worker taler MCP (Streamable HTTP) og
udstiller ni værktøjer: kladdekøen og hele grundlaget bag en kladde, `save_draft`
(publicerer ALDRIG), `publish_draft` (kræver `confirm: true` og nægter kladder
gennemgangen har afvist), sider pr. land, atletopslag og nøgletal. Skrivningerne
går gennem de samme funktioner som `/admin`, så en rettelse fra Desktop opfører
sig som en rettelse i UI'et.

**Autentifikation: token i STIEN.** Desktops connector-felt tager kun en URL —
OAuth-felterne kræver en OAuth-server vi ikke har, og header-feltet er ikke ude
alle steder endnu. Konsekvensen skal siges højt: **URL'en ER adgangskoden**.
Rotation = `wrangler secret put MCP_TOKEN` igen + ny URL i Desktop; lukning =
`wrangler secret delete MCP_TOKEN` (endepunktet svarer så 503 for alle). Uden
secret er endepunktet lukket som standard — en glemt opsætning åbner ikke døren.

`/api/mcp` ligger bevidst uden for Cloudflare Access (som dækker `/admin` og
`/api/admin`): Desktop kan ikke gennemføre et Access-login. Adgangen er i stedet
begrænset af, at der KUN findes de ni værktøjer — ingen vilkårlig SQL, ingen
sletning, ingen andre tabeller.

Opsætning i `SETUP-mcp-desktop.md`. `_mcp-server-test.ts` (i CI) holder fast i
protokolformen og i de to spærrer.

## 🔌 Claude Desktop kan arbejde på sitet (2026-08-20)

Kontekstpakken gav Desktop viden; connectoren giver den hænder. Den eksisterende
worker taler nu MCP (Streamable HTTP) og udstiller ni værktøjer: kladdekøen og
hele grundlaget bag en kladde (kilde, faktaark, atletdata, gennemgangens fund),
`save_draft` (publicerer ALDRIG), `publish_draft` (kræver `confirm: true` og
nægter kladder gennemgangen har afvist), sider pr. land, atletopslag og nøgletal.
Skrivningerne går gennem `publishArticle`/`updateArticle`/`upsertPage` — de samme
funktioner som `/admin`.

**To indgange, fordi Desktops connector-dialog ikke ser ens ud i alle versioner:**
`/api/mcp` med `Authorization: Bearer <token>` (foretrukket — tokenet holder sig
ude af URL'er og logs) og `/api/mcp/<token>` for builds med kun et URL-felt.
Serveren accepterer også `X-MCP-Token`. Uden `MCP_TOKEN` på workeren svarer
endepunktet 503 — en glemt secret lukker døren i stedet for at åbne den.

**Hvorfor ikke bare give Desktop Cloudflare-tokenet?** Fordi Cloudflares egen
D1-MCP-server giver vilkårlig SQL mod hele kontoen — også `DROP TABLE` — uden om
`publishArticle`, uden om spærren mod automatisk publicering og uden om `/admin`s
kodeveje. Ni afgrænsede værktøjer er den mindre adgang, ikke den større.

`/api/mcp` ligger bevidst uden for Cloudflare Access (som dækker `/admin` og
`/api/admin`): Desktop kan ikke gennemføre et Access-login.

Opsætning i `SETUP-mcp-desktop.md`. `_mcp-server-test.ts` (i CI) holder fast i
protokolformen og i begge spærrer.

## 📰 To danske kladder omskrevet — og gennemgangen så kun halvdelen af kilden (2026-08-20)

Mikkel bad om, at de to danske kladder blev bragt i overensstemmelse med
kilderne. Begge står nu som **ok med nul fund** hos kvalitetstjekket, og begge er
stadig **upublicerede**.

- **#111 (Alfred Mikkelsen, FAU)** var værst: opdigtet citat, en opfundet
  sæson 2025, en falsk kildeattribution og en formodning om kåringens kriterier —
  oven på ét faktum. Den nye tekst er tre afsnit: kåringen, de to holdkammerater
  der kom med på preseason-holdet, og at kåringen ER en preseason-udnævnelse.
  Kampprogrammet er ude: det stammer fra sidens «Upcoming Event»-widget, og
  «åbner sæsonen» var vores egen tilføjelse.
- **#108 (Paul Claes Nielsen, Belmont)** havde rigtige tal, men i nutid, som om
  sæsonen var i gang. Tallene er fra freshman-sæsonen, og udtagelsen er til
  preseason-holdet for 2026. Rettet undervejs: «shots on target» blev til «ramte
  målrammen» (det modsatte af på mål), efternavnet er **Claes Nielsen**, ikke
  Nielsen, og kåringen som ugens offensive spiller kom EFTER Lipscomb-kampen —
  kilden gør det til en følge, ikke to løsrevne hændelser.

**Rodfejlen, som kostede en falsk afvisning:** `cleanSource` i
`pipeline/generate/draft-pack.ts` brugte `content_raw ?? summary`. På
Sidearm-sider er `content_raw` tit sidens kampprogram-widget, mens artiklens egen
manchet ligger i `summary` fra feedet. Gennemgangen så derfor kun widgetten og
dømte FAU's David Roberts og Felipe Santos som opdigtede — de stod ordret i
manchetten. Nu kommer BEGGE felter med (og html-rester strippes).
`_draft-pack-test.ts` holder fast i det, og testen er med i CI.

**Bemærk ved næste gennemgang**: tjekket vaklede om årstal på en dato — først
«skriv 2025», så «2025 står ikke i kilden». Formuleringen «den 23. september
sidste sæson» blev foreslået af begge gennemgange og bestod. Vaklen på
udledte årstal er værd at holde øje med, hvis det gentager sig.

**Datarettelse**: Paul Claes Nielsen stod som `Fr.` i registret fra 2025-rosteren;
Belmonts egen artikel kalder ham «Sophomore Midfielder». Rækken er rettet til
`So.` + `gender = 'm'`.

## 🥏 Akrobatik og ultimate lukker ventelisten (2026-08-19, fjerde runde)

- **acrobatics-tumbling** (dansk: Akrobatik og tumbling, URL /akrobatik): NCAA's
  NYESTE mesterskabssport — vedtaget på konventet i januar 2026, første
  NCAA-mesterskab ventes forår 2027, indtil da NCATA's. 52 varsity-programmer,
  1.300+ udøvere, seks discipliner pr. stævne. 36 `roster_checks`-rækker flyttet.
- **ultimate**: USA Ultimate, ikke NCAA. To divisioner (D-I og D-III) med hver
  sit herre- og damemesterskab, selvdømt spil (Spirit of the Game). 5 rækker.

**STUNT er ikke det samme som acrobatics & tumbling** — to sportsgrene, to
forbund — og STUNT er ikke valgt til. Testen fastholder `stunt` → "other".

Ventelisten er hermed tom på nær cheerleading, dans, stunt, ridning og rodeo, som
alle er fravalgt af Mikkel. Hestepolo bliver stående efter aftale.

**30 → 32 sportsgrene i alt** (33 nøgler med `other` — her stod «25», og det var en tællefejl). SPORT_KEYS, sprogpakkerne, positionsbegreberne,
farverne, emoji'erne, nav-ikonerne og pillarteksterne på begge sprog er komplette
for dem alle — typesystemet håndhæver det: en manglende nøgle i én af tabellerne
er en typefejl, ikke en tavs fallback.

## 🚩 Flag football, cykling og bueskydning (2026-08-19, tredje runde)

Mikkel gennemgik ventelisten og traf afgørelsen: **flag football skal med — den er
OL-sport** — og cykling og bueskydning ligeså. **Dans og hestesport er fravalgt.**

- **flag-football** (dansk: Flag football): NCAA-emerging sport for kvinder siden
  januar 2026 med 120+ skoler, NAIA's 30. mesterskabssport fra 2026-27, og
  OL-debut i Los Angeles 2028. Fem mod fem, 70×25 yards, to halvlege à 20 min.
  104 `roster_checks`-rækker flyttet — det største enkelthold i "other".
- **cycling** (Cykling): USA Cycling, ikke NCAA. Fem collegemesterskaber —
  landevej, bane, mountainbike, cyclocross og gravel (nyt i 2026) — og skolerne
  kører i varsity- og klubdivision.
- **archery** (Bueskydning): USA Archery's Collegiate Archery Program. Fire
  buetyper (recurve, compound, barebow, bowhunter) tæller alle med i det samlede
  holdmesterskab.

**Fravalgt af Mikkel og skal blive i "other"**: dans/dance-team, cheerleading,
stunt og al hestesport (ridning, rodeo). Testen i `_team-discovery-test.ts` holder
fast i det — `dance-team` og `equestrian` SKAL svare "other", så et velment alias
ikke sniger dem ind igen. Hestepolo blev tilføjet i anden runde og bliver stående,
fordi to atleter ligger på nøglen; skal den væk, skal de to have et andet sted at
være først.

Acrobatics & tumbling (36 hold) og ultimate (3) er hverken valgt til eller fra.

## 🎯 Ni sportsgrene mere, og "andet" er tomt (2026-08-19, anden runde)

Mikkels regel, som nu er den der gælder: **er det organiseret skolekonkurrence,
skal det have en kategori — og er de ikke atleter, skal de ikke stå i registret.**

Ni nye nøgler: lacrosse, softball, brydning, bowling, sejlsport, skydning,
skisport, triatlon og hestepolo. Fire af dem styres ikke af NCAA (sejlsport under
ICSA, hestepolo under USPA, pistolskydning under NRA, og herrelacrosse/-rugby er
klubsport) — det er ikke et argument imod en kategori, det er et faktum der står i
pillarteksten.

**Riffel og pistol er ÉN kategori: `shooting` (dansk: Skydning).** NCAA har kun
riffel, og pistolskytterne skyder til NRA's mesterskaber, men det er den samme
skydebane og den samme atlet. `rifle`, `pistol`, `shotgun`, `trap` og `skeet`
peger alle på nøglen.

**Resultatet i prod**: 0 atleter i "andet" (fra 197 i morges). Sidste mand ud var
August Holmgren, der lå uden `bio_url` fra en manuel indtastning i marts — USD's
egen roster bekræfter tennis, og rækken har nu både sport, køn og bio_url.
2.082 `roster_checks`-rækker flyttet med i samme greb; softball alene stod for 776
og lacrosse 707, så det negative register (`unsponsoredSports`) kan nu udtale sig
om alle 23 sportsgrene i stedet for at tie om de 11 største huller.

**Tre rækker slettet, fordi de ikke var atleter.** To fra
`student-athlete-advisory-committee` og én fra `saac`. De havde ingen artikler,
begivenheder eller fotos knyttet til sig (tjekket tabel for tabel før sletning).
Roden er lukket: `NOT_A_TEAM` i `team-discovery.ts` afviser nu saac, hall-of-fame,
band, pep-band, facilities, ticketing, compliance, sports-information m.fl. — 49
`roster_checks`-rækker for de "hold" er også væk.

**Venter på en afgørelse fra Mikkel**: cheerleading (246 hold i inventaret), dance
(107), stunt (45), acrobatics & tumbling (36), flag football (102), ridning (47),
rodeo (16), cykling (7), bueskydning (5) og ultimate (3). Nogle af dem ER
konkurrencesport — acrobatics & tumbling har eget NCAA-mesterskab, flag football og
ridning er emerging sports — men grænsen mellem konkurrencehold og sidelinjehold
skal trækkes af et menneske, ikke af aliastabellen.

## 🏉 Fem nye sportsgrene, og hullerne i aliastabellen (2026-08-19)

Mikkel fandt roere, rugbyspillere, fægtere, squashspillere, en cross country-løber,
vandpolospillere og en League of Legends-spiller parkeret i "andet". De var der af
to forskellige grunde, og forskellen er hele pointen:

1. **Sporten fandtes ikke** — rugby, vandpolo, fægtning, squash og esport havde
   ingen kanonisk nøgle. De er nu fem nøgler med farve, emoji, eget ikon,
   positionsbegreber på begge sprog og en faktatjekket pillartekst pr. sprog.
2. **Sporten fandtes, men holdnavnet var ukendt** — `mens-heavyweight-rowing`,
   `mcrewhvy`, `wcross`, `mgolf`, `wten`, `fhockey`, `jv-mens-soccer`. 30 roere lå
   i "andet", selv om roning har haft en nøgle hele tiden.

**Aliastabellen bliver kun konsulteret ved scrape.** Rækker der ER hentet mens et
alias manglede, bliver stående i "other" for altid. Derfor findes nu
`pipeline/fix/recategorize-other-sports.ts`: den kører den nuværende aliastabel hen
over det der allerede står i D1. Atletens kilde-sport står ikke i en kolonne — den
læses ud af `bio_url` (`…/sports/womens-rugby/roster/…`), som er det eneste sted
skolens eget holdnavn overlever.

**I prod**: 197 → 30 atleter i "andet" (rugby 77, roning +19, atletik +14,
landhockey +13, squash 10, fægtning 9, vandpolo 7, esport 3, resten til
eksisterende nøgler) og 653 `roster_checks`-rækker flyttet. Begge tabeller i samme
greb — `findExistingAthleteByIdentity` slår op med `WHERE sport = ?`.

**Beslutninger værd at kende:**
- **Cross country → atletik**, ikke sin egen nøgle. Skolerne slår i praksis bane og
  terræn sammen i ét holdnavn (`mens-track-and-field-xc`, `mxct`, `xctrack`), og
  aliaset `cross-country → track-and-field` var der i forvejen. Vil Mikkel have en
  selvstændig /cross-country-side, skal rosterne splittes først.
- **`mens-polo` er hestepolo** og bliver bevidst i "andet". Polo uden vand er en
  anden sport.
- **De 30 der bliver**: lacrosse 11, bowling 4, sejlsport 2, skydning 2, hestepolo 2,
  ski 2, brydning, triatlon, softball — plus 3 rækker fra
  `student-athlete-advisory-committee`/`saac`, som slet ikke er atleter. De sidste
  bør nok slettes; det er en oprydning i data, ikke i taksonomi.
- **Squash og esport er ikke NCAA-sportsgrene** (CSA henholdsvis NACE/NECC), og
  herrerugby er det heller ikke. Det står i pillarteksterne, fordi det er det mest
  beslutningsrelevante faktum for en læser.

**Kilder i pillarteksterne er webtjekket 2026-08-19** — bl.a. at NCAA-fægtning fra
2026 uddeler separate holdtitler til herrer og damer, at vandpoloens D1-legatloft
efter House-forliget er 24 (mod 4,5/8 før), og at kvinderugby er én af fire
nuværende emerging sports.

## 📏 Kvalitetstjekket er målt mod Mikkels egne beslutninger (2026-08-19) — migration 044

Spørgsmålet der afgør om badgen er værd at stole på: **forudsiger fundene hvad et
menneske faktisk gjorde med kladden?** `pipeline/report/review-accuracy.ts` svarer
på det, og målingen ændrede designet tre gange undervejs.

**Grundlaget i dag**: 21 kladder hvor `original_content` er bevaret (18 blev rettet
eller afvist, 3 godkendt uændret). De 11 hidtidige afvisninger kan IKKE måles — de
blev slettet med teksten. Det er lukket fremadrettet: migration 044 gemmer nu den
afviste kladdes tekst, titel, story_id og athlete_id i `review_log`, så
`deleteArticle` ikke længere smider bevismaterialet ud. **Det er de vigtigste sager**
et tjek skal måles på.

**Resultatet, og hvorfor grænsen er 2:**

| Regel | Fanget af 18 der skulle rettes | Falske alarmer af 3 rene |
|---|---|---|
| Gammelt badge (modellens skøn) | 3 (17%) | 0 |
| Ethvert mekanisk fund = rød | 12 (67%) | **2 (67%)** ← ubrugelig som triage |
| **Præcis kategori ELLER klynge ≥ 2** | **10 (56%)** | **0** ← valgt |
| Præcis kategori ELLER klynge ≥ 3 | 8 (44%) | 0 |

Badgen er altså **3,3× så følsom som den gamle uden en enkelt falsk alarm**. Reglen
er målt, ikke gættet: de præcise kategorier (identitet, tid, stedord, citater,
årgang) sætter badgen alene; tal og navne er læsehjælp og løfter den kun i klynge.
Kategoriernes præcision målt claim-for-claim: `class_year` 2/2, `quotes` 1/2,
`numbers` 5/20, `names` 4/24.

**Fire falske positiver rettet ved roden, alle fundet af målingen:**
1. **Manchetten er ikke et citat.** Husets format lægger manchetten i en indledende
   «>»-linje. Alle 14 citat-fund var netop den. Nu tælles et blockquote kun som
   citat hvis det er tilskrevet — citat-fund faldt 14 → 2.
2. **Funktionsord hang på navne.** «Danske Marie Eline», «Med Uagboe», «Udover
   Bangerts» blev læst som ukendte personer. Kandidater trimmes nu for funktionsord
   i begge ender, og et match må ikke krydse en sætnings- eller linjegrænse
   («…Uagboe\nIfølge…» var ét «navn»). Navne-fund faldt 41 → 24.
3. **Kaldenavnet er en del af identiteten.** Kilden skriver «Ogbe Uagboe», basen
   «Ogbemudia» — en korrekt kladde blev flaget for forkert person. `preferred_name`
   tæller nu med, og står KUN efternavnet i kilden, er det medium, ikke high.
4. **Institution ≠ person.** «Coast Conference» og «Horizon League» er medium; en
   ukendt PERSON er fortsat high — det var den fejl der gav to kladder om forkerte
   mennesker.

Dertil en fejl i min egen rapport: en kladde der stadig ligger i køen er **ulæst**,
ikke godkendt uændret. Uden det filter tælles hver ventende kladde som falsk alarm.

**En hypotese der IKKE holdt**: jeg gættede på at støjen kom fra manglende
kildetekst (`content_raw` NULL → alt ser ukildebelagt ud). Kun 5 af 21 mangler
kildetekst, og kilderne er i snit 5.154 tegn. Forklaringen var altså ikke der, og
tjekkene skulle rettes hver for sig.

**Kør rapporten igen efter en måneds sæson** (`npx tsx pipeline/report/review-accuracy.ts
--verbose`). n=21 er for lidt til at kalde grænsen andet end det bedste valg på det
vi ved nu — men fra i dag vokser grundlaget med hver beslutning, også afvisningerne.

## 🔍 Hver kladde bliver kvalitetstjekket (2026-08-19) — migration 043

Mikkel: «for each draft, you quality check it … that should speed up the learning».
Sat op i **to lag**, fordi de to slags fejl kræver to slags læsning:

**Lag 1 — mekanisk, gratis, altid** (`pipeline/generate/quality-check.ts`, 23 tests).
Syv tjek uden et eneste modelkald, alle møntet på fejlklasser der HAR kostet noget:

| Tjek | Fanger | Den virkelige sag |
|---|---|---|
| tal | tal/alder/dato uden belæg i kilde+faktaark | «23-årige», «18 kampe» (#105) |
| navne | egennavn (to store ord) der ikke står i kilden | den opdigtede træner «Mark Carr» (#107) |
| citater | citat i kladden + tomt `quotes` i faktaarket | #99 |
| identitet | atletens fornavn mangler i kilden | #101, #102 handlede om ET ANDET menneske |
| stedord | strider mod `athletes.gender` | «he» om Almi Nerurkar |
| tid | begivenheden er ikke overstået (genbruger vagten) | #107, kamp omtalt i datid 16 t før kickoff |
| årgang | fremskrevet sæson for Sr./Gr. | regel 25 |

Resultatet skrives til `draft_reviews` **og** til `articles.fabrication_risk`/`fact_flags`
— altså dét felt admin-badgen allerede læser. **Badgen er dermed mekanisk nu**, uden
at admin skulle bygges om. `verify-article.ts` skriver kun når feltet er NULL, så
den overskriver ikke mekanikken; rækkefølgen i workflowet er skriv → tjek → verificér.

**Lag 2 — Claude læser kladden** (`scripts/review-drafts.sh` + `draft-pack.ts` +
`save-review.ts`). Pakken samler kilde, faktaark, atletens data fra basen, de
mekaniske fund og kladden — **kilden først, kladden sidst**, fordi man ellers læser
kilden efter hvad kladden påstår. Svaret er JSON og gemmes som `reviewer='claude'`.
Ugyldigt svar gemmes IKKE: en manglende gennemgang er bedre end en falsk.

**Kørt på den rigtige kladde #108** (Paul Claes Nielsen, Belmont): mekanikken fandt
ét ægte fund (højden «188 cm» står intet sted i kilden). Claude fandt **ti**, heraf
to alvorlige tidsfejl — kladden præsenterede freshman-sæsonen 2025 som indeværende,
selvom 2026-sæsonen først åbner torsdag — plus tre opdigtede karakteristikker
(lederskab, fysisk styrke, kreativitet), en hæder opgraderet til en rangering,
«tidligere klubber som» om én klub, og uoversat engelsk («team-leading fem assists»).
Det er præcis den forskel de to lag skal dække.

**Automatik:**
- **Workflow «Kvalitetstjek af kladder»** hver 3. time: mekanisk tjek + Discord-ping
  (også om Claudes fund, som ligger i D1 — pinget behøver ikke komme fra din maskine).
- **Cron på WSL** kl. 7, 10, 13, 16 og 19: `scripts/review-drafts.sh` kører begge lag.
  Fjernes med `crontab -e`.
- **Generate-workflowet** kører nu det mekaniske tjek lige efter skrivningen.

**To cron-fælder, håndteret i scriptet** (begge fundet ved at køre i et tomt miljø):
`~/.bashrc` returnerer med vilje straks i en ikke-interaktiv shell, så nøglerne
plukkes direkte ud af filen i stedet for at source den; og cron har en minimal PATH
uden nvm, så node-bin lægges foran hvis `npx` ikke kan ses.

**Idempotent**: en kladde gennemgås igen når INDHOLDET ændres (`content_hash`), ikke
pr. kørsel. Tom kø = ingen kald, ingen omkostning.

**Det næste, når der er data**: hold `draft_reviews` op mod `review_log`. Forudsiger
fundene dine faktiske afvisninger? Det er svaret på om badgen er værd at stole på —
og det var hele problemet med den gamle.

## 🖼 Facebook-opslag uden billede (2026-08-18) — vores egen robots.txt

Mikkel: «When the Amtrup article was shared to Facebook, there was no image on the
post». Billedet var i orden: `/api/og?type=card&article=105&v=8` svarede 200 med et
**1200×630 PNG (206 KB)**, og **Blueskys** kort af samme artikel HAVDE en thumbnail
samme dag. Forskellen er robots.txt:

```
User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/          ← OG-billedet ligger på /api/og
```

Facebooks scraper (`facebookexternalhit`) respekterer robots.txt. Den hentede
artiklen, læste `og:image` — og lod billedet ligge. Blueskys kort-tjeneste gjorde
ikke. Det ramte **hvert delt link**, ikke kun dette: alle OG-billeder (artikler,
atleter, skoler) serveres fra `/api/og`.

**Rettet** (`src/lib/robots-txt.ts`, ny ren funktion + `src/app/robots.ts`):
`Allow: /api/og` står nu som en MERE specifik regel end `Disallow: /api/`. Både
Google og Meta følger længste-match, så OG-stien er åben, mens sporing, leads og
admin-API stadig holdes ude. Reglerne er flyttet ud i en funktion netop for at
kunne testes.

**Testen der ville have fanget det**: `pipeline/lib/_robots-txt-site-test.ts` (24)
renderer sitets egne regler og spørger vores EGEN robots-parser — den samme der
efterlever andres robots.txt, og som implementerer længste-match — om
`facebookexternalhit` og `Googlebot` må hente OG-kortet. Verificeret at den fejler
på de gamle regler (`allows("/api/og") === false`).

**Cachen er den anden halvdel**: Facebook renderer kortet ud fra sin egen scrape og
husker den ~30 dage. Derfor:
- `channels/facebook.ts` beder nu Facebook om et **frisk scrape lige før hvert
  opslag** (`POST /?id=<url>&scrape=true`). Fejl sluges og logges — en manglende
  forhåndsvisning må ikke koste opslaget. Svarer scrapen uden billede, står det som
  en advarsel i loggen.
- `pipeline/social/rescrape-facebook.ts` + workflowet **«Genscrape Facebook-kort»**
  (kun manuelt, `--dry-run`, `--url`, `--recent N`) fornyer cachen for links der
  allerede er delt.
- **Vigtigt forbehold**: et allerede offentliggjort opslag beholder det kort det
  blev født med. Amtrup-opslaget får altså først et billede, hvis det slettes
  (`delete-post.ts`) og postes igen. Genscrapen retter alle FREMTIDIGE delinger.

## 🔎 Atletiksite fundet for 152 skoler (2026-08-18) — migration 042

Sport-inventaret efterlod 435 blinde skoler. Årsagen var adressen, ikke platformen:
`schools.website` peger for dem på universitetets hovedside — eller på atletiksitet,
hvis rod serverer en splash-side uden holdmenu (Alabama A&M: `/splash.aspx`).

`find-athletics-site.ts` + `athletics-site.ts` (25 tests) henter universitetets
forside, rangerer kandidater (links til `/sports/<hold>/roster` først, så
værtsnavne der ligner atletiksites, så tre mønster-gæt: `athletics.<dom>`,
`sports.<dom>`, `<dom>/athletics`) og **bekræfter hver kandidat ved at hente den**:
den skal selv levere mindst ét hold eller svare på roster-API'et. Et gæt gemmes
aldrig — en forkert adresse ville få scraperen til at skrive en FREMMED skoles
atleter som vores. `athletics_checked_at` sættes uanset udfald.

**Resultat efter kørsel på alle tre divisioner (327 skoler søgt):**

| Division | Skoler | Atletik-URL fundet | Hold i inventar | Negative | Blinde tilbage |
|---|---|---|---|---|---|
| NCAA D1 | 372 | 13 | 6.506 | 1.441 | **7** |
| NCAA D2 | 291 | 42 | 4.385 | 1.413 | 39 |
| NCAA D3 | 422 | 97 | 5.370 | 1.134 | 161 |
| **I alt** | 1.085 | **152** | **16.261** | 3.988 | 207 |

Hitraten falder med divisionen (D1 68%, D3 38%), og det er sportens natur: små
D3-colleges driver ofte atletikken som en sektion af universitetets eget site, og
så er der intet selvstændigt site at finde. De 207 blinde skoler beholder
gætte-adfærden.

**Til sammenligning**: den gamle tolv-sportsgrene-tabel kunne højst repræsentere
~13.000 kombinationer for de samme skoler, hvoraf de fleste var spøgelser. Nu står
der 16.261 hold der findes, og 3.988 dokumenterede «det hold har skolen ikke».

**Driftserfaring**: D2-kørslen **døde tavst** efter 30 af 80 skoler — ingen
fejltekst, ingen opsummering, altså dræbt (formodet OOM under WSL) og ikke en
undtagelse. Genstart krævede ingen særlig håndtering: `athletics_checked_at`
skrives pr. skole undervejs, så en ny kørsel tager præcis dem der mangler. Kør
lange kørsler i mindre bidder (`--limit 60`) og gentag, frem for én stor.

## 🏑 Field hockey er en sportsgren nu (2026-08-18)

Mikkel: «Add field hockey as a sport, at least for UK — there's one athlete in that
sport in Chloe Plumb». Der var **29**: alle briter, alle fundet i dag gennem det nye
JSON-API, alle parkeret i `other`, hvor sporten forsvandt sammen med lacrosse og
water polo.

**Kanonisk nøgle**: `field-hockey`. **Samme slug på begge sites: `/field-hockey`.**
Label «Field hockey» på dansk (Mikkel 2026-08-18: sporten hedder field hockey på
dansk, ikke landhockey — dansk kapitalisering, altså kun stort F), «Field Hockey»
på engelsk. Farve `#2F6E63`, emoji 🏑, eget
Tabler-lignende ikon (stav + bold), boldsport → profilteksten siger «spiller
field hockey». Positions-begreberne er fodboldens (målmand/forsvar/midtbane/angriber),
så begge sprogpakker havde dem — kun `sweeper` var ny.

**Faktatjekket pillartekst på begge sprog** (webverificeret 2026-08-18):
field hockey i NCAA er en **kvindesport** — intet herremesterskab, ingen herrelegater,
så for britiske/danske drenge findes vejen ikke · efterårssæson, start sidst i
august, NCAA-turnering midt/sidst i november · **fire kvarterer à 15 min**, sudden
victory, derefter straffekonkurrence · D1 godt 80 programmer / ~33 conferences, op
til 12 legater; D2 6,3; D3 ingen sportslegater · over 10% internationale allerede i
2015 · Northwestern vandt 2025 (3. titel) over North Carolina i semifinalen.
Kilder står i teksten (NCAA.org, USA Field Hockey, ScholarshipStats).

**Data rettet i prod**: 29 atleter `other` → `field-hockey` (17 fik samtidig
`gender='f'` — det er DATA her, ikke et gæt: NCAA-landhockey har kun kvindehold) ·
84 `roster_checks`-rækker · 0 katalogrækker (katalog-scriptet kender kun de tolv
gamle sportsgrene — en oplagt næste oprydning).

**⚠️ Fælde for næste gang en sportsgren tilføjes**: ret ALTID `athletes.sport` i
samme greb. `findExistingAthleteByIdentity()` slår op med `WHERE sport = ?`, så en
atlet der stadig står som `other`, mens hendes `roster_checks`-række er blevet
`field-hockey`, bliver ikke fundet ved næste scrape — og `INSERT OR IGNORE` på
slug'en gør så INTET. Rækken ville stille og roligt holde op med at blive opdateret.

**Sidefund, rettet**: `ICON_PATHS` i `CategoryNav.tsx` havde stadig DANSKE nøgler
efter motor-refaktoren («fodbold», «roning», «ishockey», «andet» …), mens
`SPORT_ICONS` slår op med den kanoniske nøgle — **syv af tretten sportsgrene viste
fallback-ikonet** (cirkel med plus). Samme fælde som `SPORT_KEYWORDS` 2026-08-06.

**Kræver deploy** for at være synligt (nav, /landhockey, /field-hockey, sitemap).

## 🔧 Scraperen ser nu ALLE hold (2026-08-17/18) — inventar + JSON-API + negativt register

**Baggrund**: Mikkel bad om at intet skulle være usynligt, og om et register over
hold skolerne ikke har, så kørslerne ikke spilder tid på dem. Diagnosen fandt
**fire** fejl, ikke én — og den vigtigste var ikke parseren:

1. **Kvindeholdene var usynlige.** `roster_checks` havde UNIQUE(school_id, sport),
   så en skole kunne kun have ÉN tennis-række, og gætte-løkken brød ved første
   URL der svarede (typisk herreholdet). Det stod sort på hvidt i basen: **32
   mandlige basketballspillere og 0 kvindelige · 165 mandlige fodboldspillere mod
   22 kvindelige · 68 mandlige golfspillere mod 4 kvindelige.**
2. **Spøgelses-sporten.** Scraperen spurgte hver skole om de samme tolv
   sportsgrene. Stikprøve på 14 skoler: **65% af alle `error`-rækker var hold
   skolen ikke har** (Santa Clara har ikke football, Loyola ikke baseball).
3. **Den nye Sidearm-platform.** 200 OK, men rosteren hydreres i browseren, så
   HTML'en er tom for spillere → "Ingen roster-data". **42% af D1-skolerne
   registreret som `sidearm` kører den** (D2: 3%, D3: 0%), og 73% af de danske
   atleter er D1. Louisville, Tennessee og Dartmouth fejlede på HVER sportsgren.
4. **Forbigående fejl blev permanente.** `fetchWithProbeLog` sprang enhver URL
   over der ÉN gang havde fejlet — og hver ikke-ok status blev gemt som
   `not_found`. Ét 429 eller én timeout gjorde holdet usynligt for altid.

**Bygget** (migration 041 kørt mod prod; backup af `roster_checks` taget først):

- **`db/migration-041-team-inventory.sql`** — `roster_checks` genopbygget: nøglen
  er nu (school_id, **team_slug**), så herre- og kvindehold er to rækker. Nye
  felter: `gender`, `sponsored`, `inventory_source`, `inventory_at`,
  `api_sport_id`. Ny status: **`not_sponsored`**. 13.944 rækker bevaret, 3.606
  fik deres rigtige holdnavn ud af den URL der virkede.
- **`pipeline/scrape/team-discovery.ts`** (rent modul, 57 tests) — sitemap/HTML →
  hold → kanonisk sportsnøgle. Kvinde-mønster testes FØRST ("womens" indeholder
  "mens"). Ukendte sportsgrene bliver `other`, aldrig et gæt: softball er ikke
  baseball, water polo og lacrosse er ikke volleyball.
- **`pipeline/scrape/sport-inventory.ts`** — årlig kørsel der spørger skolen selv,
  i tre kilder efter pris: **API-probe** (1 request, afgør platformen) → **sitemap**
  → **skolens egen sport-menu i HTML**. Skriver det negative register
  (`sponsored=0`) for de kanoniske sportsgrene skolen ikke har, og sletter de
  gamle gætte-rækker (`inventory_source='legacy'`) for skolen.
- **`pipeline/scrape/parsers/roster-api.ts`** (31 tests) — `/api/v2/rosters?sportId=N`.
  Rigere end HTML: fornavn/efternavn adskilt, hjemby, high school, forrige skole,
  **køn eksplicit**, højde, position i lang form, årgang i ord. `RosterEntry.gender`
  er nyt og optionelt — kilden slår mønsteret.
- **`pipeline/lib/robots.ts`** (23 tests) — robots.txt efterleves nu (User-agent,
  Allow/Disallow, længste match, fail-open). Det er betingelsen i
  `UDKAST-LIA-interesseafvejning.md` og i DSM art. 4.
- **`src/lib/roster-clean.ts`** → `cleanRosterName()`: skolernes dobbelte
  mellemrum gjorde atleten "omdøbt" ved hver kørsel ("Mikkel  Johansson").
- **`.github/workflows/sport-inventory.yml`** — 20. juli årligt + manuel; springer
  skoler over hvis inventaret er nyere end `--max-age-days` (365).

**Fælder fanget undervejs** (begge var mine egne, fundet ved at køre mod prod):
- `rosterUrlsFor()` listede kilderne positivt ("sitemap"/"api") og glemte "nav" →
  scraperen gættede `/sports/mens-other/roster` for Santa Claras water polo. Nu er
  reglen vendt om: alt der ikke er `legacy` bruger skolens egen URL.
- Roster-sitemaps lister **kun sæson-URL'er** (`/roster/2013` … `/roster/2026`),
  aldrig den bare `/roster` — den første matcher krævede at stien SLUTTEDE ved
  `/roster` og fandt derfor nul hold på hele Loyola. Sæsonen bruges nu positivt:
  et hold hvis nyeste roster er år gammel, er et **henlagt program** og indlæses
  ikke som aktivt (ACU's herre-cross country svarer stadig med 2016-rosteren).
- **RETTELSE af noget jeg selv skrev i analysen**: at skoler svarer "404 med et
  gyldigt sitemap i kroppen" holdt ikke. De svarer 404 med en HTML-side — hvori
  hele sport-menuen står. Derfor er `nav`-kilden med, og derfor kræver
  sitemap-sporet nu `<loc>` i kroppen.

**Verificeret mod prod** (fire skoler, tre kilder): Santa Clara 18 hold [nav] ·
Loyola 11 [sitemap] · ACU 11 + 5 henlagte [api] · Louisville 18 [api]. Derefter
scrape af 60 D1-checks: **19 danske atleter fundet, heraf 7 på Louisville**, som
før fejlede på hver eneste sportsgren — og 2 af dem i en sportsgren uden for de
tolv (`other`). 1.096 forgiftede probe-rækker (403/405/5xx gemt som `not_found`)
rettet, så de prøves igen; 1.324 timeout-rækker er ikke længere permanente.

**Tal at følge**: kønsbalancen i `athletes` er målet på om hullet er lukket.
Før: 0 kvindelige basketballspillere. Kør:
`SELECT sport, gender, COUNT(*) FROM athletes WHERE active=1 GROUP BY 1,2;`

**Ikke gjort**: skoler hvor `website` peger på universitetets hovedsite (typisk
D3/NAIA) svarer hverken med sitemap, menu eller API — de beholder gætte-adfærden,
og atletiksitet skal findes først. NJCAA/NAIA er uændret nedprioriteret.

## 🛑 Kladdegennemgang 2026-08-16 — to nye spærrer

Begge kladder i køen blev læst mod deres kilder. Kladde **#105** (Amtrup) var
solidt forankret og er rettet i basen (fem fejl: opdigtet alder «23-årige»,
opdigtet kamptal «18 kampe», «fuld tillid fra trænerstaben» og «markerer et
vigtigt skridt» tillagt kilden, «finaletunering», samt en manchet der blandede
«startede alle kampe» sammen med «eneste tilbagevendende på backlinjen»).

Kladde **#107** (Mackreth, UK) kunne ikke reddes og bør AFVISES i /admin.
Kilden — en kampannoncering fra goislanders.com — nævner hende **nul gange**.
Navnet stod udelukkende i `<img alt="Mackenzie Mackreth">` i RSS-beskrivelsen.
Artiklen opfandt hendes rolle, opfandt cheftræneren («Mark Carr»; han hedder
Daniel Clitnovici og står nævnt på kildens egen side), gjorde hende til
«England international», og beskrev kampen i **datid 16 timer før kickoff**.

**To huller, to mekaniske spærrer** (promptregler duer ikke — samme lære som
2026-08-06):
1. **Markup før matchning** — `stripMarkup()` i `extract-story.ts`, brugt i
   `matchAthletes()` OG i `checkStoryIdentity()` (vagten renser selv, uanset
   kalder). Et navn i en alt-tekst betyder «hun er på billedet», ikke «nyheden
   handler om hende». Uden den gav alt-teksten fuldt navn = 90 point.
2. **Forhåndsomtale-vagt** — ny `pipeline/generate/event-timing.ts`, kaldt lige
   efter identitetsvagten. Blokerer KUN ved sammenfald: begivenhedens dato er
   ikke entydigt overstået (dagen selv tæller som ikke-overstået — US-aftenkampe
   ligger efter midnat UTC) OG faktaarket har hverken score, udfald, placering
   eller tal. Hædersbevisninger (har `placement`) og samme-dags-referater (har
   tal) slipper igennem. Historien afvises permanent: skolens referat udgives
   som en selvstændig nyhed med sit eget faktaark.

Tests: `_event-timing-test.ts` (17) + 5 nye i `_identity-guard-test.ts` +
`_extract-story-test.ts` (16, ny). Alle 24 suiter grønne, tsc ren, begge nye
suiter tilføjet i `ci.yml`.

**Bemærk om verifikatoren**: begge kladder fik `fabrication_risk='medium'`.
For #107 flagede den kun datoformulering og en implicit ekstra kamp — den så
hverken den opfundne træner, den opfundne rolle eller at atleten manglede i
kilden. `verify-article` måler FORMULERINGER, ikke identitet eller virkelighed,
og må ikke bruges som gate.

## 👉 AdSense-verifikation (2026-08-04, commit 5df760d — LIVE, mangler kun Mikkels ID)
**Valget:** IKKE AdSense-kodestumpen. Den indlæser Googles annonce-JavaScript, som sætter cookies/tilgår enheden og derfor kræver forudgående samtykke — sitet er cookieløst indtil `consent.enabled` slås til. Verifikation sker i stedet med to INERTE metoder:
- **`/ads.txt`** (primær) — `src/app/ads.txt/route.ts`, `force-dynamic` (som statisk rute ville ID'et blive bagt ind ved build). Er også dét annoncekøbere slår op for at se hvem der må sælge vores plads, så den skal bruges alligevel.
- **Metatag** `google-adsense-account` i `layout.tsx` — én linje, giver ejerskabs-scanningen en vej mere.

**Begge styres af ÉT felt: admin → Tekster → «AdSense publisher-ID»** (`adsense.publisher_id`). `adsenseIds()` i `site-content.ts` normaliserer de to nødvendige former (`ca-pub-…` til metatagget, `pub-…` til ads.txt) og afviser vrøvl — en forkert ads.txt er værre end ingen. Tomt felt = 404 + intet tag (verificeret live).

**STATUS: ID'ET ER SAT** (2026-08-04, `ca-pub-6062052231600117`, skrevet til `site_content`). Verificeret live:
- `https://studentathlete.dk/ads.txt` → `google.com, pub-6062052231600117, DIRECT, f08c47fec0942fa0`
- metatag på hver side → `<meta name="google-adsense-account" content="ca-pub-6062052231600117"/>`
→ Klar til at trykke «verificér» i AdSense.

### ⚠️ KRAV FØR ANNONCER: Google-certificeret TCF-CMP (opdaget 2026-08-04)
Google kræver en **Google-certificeret CMP integreret med IAB TCF v2.2** for at vise **personligt tilpassede annoncer** til brugere i EØS/UK (gældende 16. jan. 2024) og Schweiz (31. juli 2024). Kilde: `support.google.com/adsense/answer/13554020`.

- **Vores egen `CookieConsent` opfylder det IKKE og kan ikke komme til det.** Den er en håndbygget to-knaps-boks der skriver `sa_consent`; der er ingen TC-streng, intet `__tcfapi`, ingen certificering. Vejen til compliance er ikke at udbygge den — det ville kræve at BLIVE en certificeret CMP.
- **Løsningen når annoncer tændes: Googles egen «Privacy & messaging» (tidl. Funding Choices)** — Googles eget certificerede TCF-CMP, gratis, sættes op i AdSense-dashboardet. Passer $0-princippet. Tredjeparts-CMP'er (Cookiebot, Usercentrics m.fl.) koster penge.
- **Mikkel har valgt en Google-CMP-mulighed (2026-08-04)** → AdSense-kravet er dækket. **Vores eget banner er slået FRA igen samme dag** (`consent.enabled=false`, verificeret live) for at undgå to samtykkedialoger.
- **ADSENSE-SCRIPTET ER TÆNDT (2026-08-04, Worker 275114dc)**: `<script async src=".../adsbygoogle.js?client=ca-pub-6062052231600117" crossorigin>` i `<head>`, verificeret live. Styret af **admin → Tekster → «Indlæs AdSense-scriptet»** (`adsense.enabled`) — kan slukkes igen UDEN deploy. Tænder auto ads + Googles samtykkeboks i ét.
  - **`AdSlot` viser stadig pladsholdere, ikke rigtige annoncer.** Manuelle placeringer kræver ad unit-ID'er fra AdSense (`data-ad-slot`), som ikke findes endnu. Indtægt kommer indtil da fra **auto ads**, som Google placerer selv.
  - **`/cookies` RETTET 2026-08-04** (på Mikkels udtrykkelige anmodning, med efterfølgende gennemlæsning): "vores cookieboks"/`sa_consent`/"Cookieindstillinger" er væk; teksten beskriver nu Google AdSense + Googles CMP (IAB TCF) og at valget gemmes af Google på brugerens enhed. Bevaret: cookieløs egen statistik + Cloudflares nødvendige cookies. **Sider har ingen kladde-tilstand** (kun `published` 0/1), så rettelsen gik direkte live — at afpublicere ville have fjernet cookiepolitikken helt.
  - **«Cookieindstillinger»-link BYGGET** (`src/components/ConsentSettingsLink.tsx`, i footeren, Worker af48b7c5): genåbner Googles samtykkeboks via `googlefc.callbackQueue.push(googlefc.showRevocationMessage)` — Googles egen anbefalede kald (`support.google.com/adsense/answer/10959060`), men som `<button>` frem for `href="javascript:…"` (tastaturvenligt, ingen javascript-URL). Dermed er tilbagetrækning lige så let som samtykke (GDPR-kravet).
    - Knappen **venter på at `googlefc` findes** (pollet 0,5 s × 20) og renderer ellers INTET — inkl. sit eget `<li>`, så footeren ikke får et tomt listepunkt hos læsere med annonceblokker eller uden for EU/EØS/UK/CH. Verificeret live: `<li>` er væk, `enabled:true` sendes.
    - Cookiepolitikkens afsnit **«Sådan ændrer du dit valg»** beskriver begge veje: linket, og — hvis det ikke vises — at rydde browserens cookies.
    - **RETTET 2026-08-04 (Worker 5452ae5d) — første version var forkert.** Knappen blev vist så snart `googlefc.callbackQueue` fandtes, men det objekt oprettes af AdSense-scriptet ALTID, også når der ikke er nogen samtykkebesked at genåbne → knappen stod der og gjorde intet ved klik (Mikkel bekræftede). Nu bruges Googles dokumenterede fremgangsmåde: `CONSENT_API_READY` → `__tcfapi('addEventListener', 2, …)` → vis KUN knappen når `tcData.gdprApplies` er sand (developers.google.com/funding-choices/fc-api-docs).
    - **Diagnose herfra**: vises knappen slet ikke, er der ingen aktiv samtykkebesked → **AdSense-siden, ikke koden**. Googles beskeder serveres typisk først når sitet er GODKENDT i AdSense (tilføjet i dag) og en «European regulations»-besked er PUBLICERET under Privacy & messaging.
    - **Mikkels test**: åbn studentathlete.dk i et privat vindue. Dukker Googles egen samtykkeboks op af sig selv? Nej → beskeden er ikke live endnu, og der er intet at genåbne (knappen skjuler sig nu korrekt). Ja → knappen skal også være der.
- **Googles CMP kræver INGEN ekstra kode** — beskeden serveres af auto-ads-scriptet, som er en del af selve AdSense-annoncekoden. Men den kommer derfor først på sitet sammen med AdSense-tagget: i dag indlæser vi INTET Google-script (verifikationen er ads.txt + metatag), så CMP'en vises endnu ikke.
- **RETTELSE af tidligere note:** ad-scripts skal IKKE gates på `sa_consent.marketing` — gating sker i den certificerede CMP. Den plan var forkert.
- Rammer os først når annoncer faktisk serveres (`NEXT_PUBLIC_ADS_ENABLED` er ikke sat). Men da læserne er danske, er ~al trafik EØS — det gælder altså reelt fra dag ét med annoncer.

**`consent.enabled` SLÅET TIL** samme dag (Mikkels ønske). Konsekvens: banneret vises nu, og sitet sætter dermed sin første cookie (`sa_consent` — strengt nødvendig, lovlig uden samtykke). **NB: banneret gater endnu ingenting** — AdSense-verifikationen er bevidst inert (ingen Google-JS), og `NEXT_PUBLIC_ADS_ENABLED` er ikke sat, så der loades stadig ingen marketing-scripts. Når ads tændes: ad-scripts SKAL læse `sa_consent.marketing` før de indlæses. Banneret er client-renderet (SSR viser intet med vilje) → kan kun ses i en browser, ikke med curl; `enabled:true` er bekræftet i sidens payload.

## 👉 UK-LAUNCH påbegyndt (2026-08-04) — se `SETUP-uk-launch.md`
Domænet **student-athlete.co.uk er købt**. Trin 1–3 af launch-planen er kørt; **trin 4 (engelsk UI) mangler og er blokerende, før domænet må pege på sitet.**

1. **Genereringen er landebevidst**: `generate-articles.ts` slår atletens `home_country` op → landeprofil → sprog → promptsæt, PR. HISTORIE (system-prompten bygges nu inde i løkken, ikke én gang). `articles.country` + `author` (sitets brand) stemples fra atleten.
   - **Fælden det løste**: `check-sources.ts` vælger atleter på `active = 1` UDEN landefilter. Var UK tændt først, ville danske artikler om briter være landet i den danske kladdekø. Discovery forbliver bevidst landeagnostisk — den overvåger skolefeeds, og generering afgør sproget.
2. **Engelske prompts**: `pipeline/generate/prompts/en.ts` (hele regelsættet på britisk engelsk, regler nummereret 1–23 identisk med `system.ts` så parringen er mekanisk) + `prompts/index.ts` (`promptsFor(language)`). Britisk sportssprog: football = soccer, American football, athletics.
3. **UK REGISTRERET** i `COUNTRIES` → roster-scrapen samler nu briter. Startet manuelt 2026-08-04 (kører ~1t40m; uger om at konvergere over ~1.700 skoler). Forventning 1.200–2.000 briter.
   - **Empirisk valideret**: alle **982** rigtige UK-hjembyer i kataloget klassificeres som UK, **0** som DK. Krydstest: svenskere/nordmænd/irere/australiere/canadiere + Denmark SC/Scotland PA/London Ontario rammer ingen af sitene. 73 assertions.
4. **Deployet** (Worker faa801f9). Dansk site uberørt: 118 danskere, alle sider 200.

5. **Engelsk UI — RAMMEN ER OVERSAT** (Worker 20f4c188). `LanguagePack.ui` + `t()` + `currentSite()`/`currentLanguage()` (via `headers()`). Oversat: header, footer, kategorinav, forsidens bånd, arkiv, ArticleCard, Carousel + `<html lang>`. **En manglende oversættelse er nu en TYPEFEJL** (`UiKey`-union), ikke et hul på siden; `_ui-strings-test.ts` (274 assertions) fanger manglende pladsholdere og dansk sluppet ind i den engelske pakke.
   - **Verificeret med spoofet Host via `next dev`**: UK-værten giver engelsk ramme + `/football`, `/american-football`, `/athletics` + `lang="en"`; dansk vært beholder `/fodbold`, `/atletik`, `lang="da"`. **NB: `wrangler dev` videresender IKKE Host-headeren** (hverken lokal eller `--remote`) — kontroltesten var at `www` ikke blev 301'et. Brug `next dev` til vært-tests.
6. **`site_content` er nu PR. LAND** (migration 037, kørt): nøgle = (key, country); `adsense.*` + `consent.enabled` er markeret `global` og ligger under `'*'` (én AdSense-konto dækker begge domæner). `getSiteSettings()` udleder landet af værten → ingen af de 6 kaldesteder skulle ændres.
   - **Fanget under migreringen**: `seedHashUpsertSql` brugte `ON CONFLICT(key)`, som ikke længere matcher en nøgle. I SQLite er det en HÅRD FEJL, ikke en no-op — seed-scripts ville være væltet næste gang pillar-/guide-tekster blev opdateret. Rettet til `ON CONFLICT(key, country)`; drift-tjek verificeret grønt.

7. **Skabeloner + profiler OVERSAT** (Worker 2ccfb514, 424 assertions): alle fire artikelskabeloner, atlet- og skoleprofil, brødkrummer, faktaetiketter, status, dimissions-badge. **`ARTICLE_TYPE_LABELS` var en enkelt dansk tabel i `lib/types.ts`** og sivede derfor ud på hvert eneste kort uanset vært → flyttet til sprogpakken som `articleTypeLabel()`. Verificeret live på rigtige danske data: atletprofil viser Sport/Position/Hjemby/Universitet/Årgang/Status, artikelside viser Hjem/Nyhed/Tidligere opdateringer, intet engelsk sivet ind.
8. **Første UK-scrape FÆRDIG** (2t5m): **145 britiske atleter** i basen, 122 danske. Konvergerer videre med de ugentlige kørsler.

9. **Engelske statiske sider SEEDET** (migration 038 + `db/seed-pages-uk.sql`): `pages` har nu (slug, country) som unik nøgle, så hvert site kan have sin egen /om. 5 engelske sider (om, ai-brug, presseetik, kontakt, cookies) ligger som `country='UK'`, published. **ULÆST AF MENNESKE — Mikkel gennemgår og retter i admin på UK-værten.** `upsertPage` fik `ON CONFLICT(slug, country)` (samme fælde som 037, fanget af tjeklisten denne gang).
10. **Natlig scrape under UK-opstarten**: `weekly-scrape.yml` har fået `cron: '0 22 * * *'` OVEN I søndagskørslen. **MIDLERTIDIG — fjern igen når UK-tallet flader ud.** Manuel kørsel sat i gang 2026-08-04 13:49.

11. **13 BRITISKE SPORT-PILLARTEKSTER SKREVET** (`src/lib/sport-content-en.ts`, Worker 47f2d433) — ikke oversat: sæsonstruktur og kampformater er GENBRUGT fra de faktatjekkede danske tekster, men rammen er britiske veje ind i NCAA (akademi-frasortering i fodbold, NFL Academy London, LTA/økonomien i tennis, britisk skole- og klubroning). **Kun 3 navngivne atleter, alle web-verificeret**: Luke Donald (Northwestern, NCAA-mester 1999), Cameron Norrie (TCU 2014-17), Luol Deng (Duke 2003-04 — britisk statsborger FRA 2006, altså efter college; formuleringen afspejler det). Øvrige sportsgrene får bevidst INGEN navne.
    - **Nøglet på ENGELSK slug**, ikke kanonisk nøgle: `/football` er fodbold på engelsk og amerikansk fodbold på dansk → to tabeller, ikke én oversat. `getSportContent(slug, lang)`; D1-override pr. land virker uændret.
    - **`[...segments]`-metadata lokaliseret**: sidetitler, atlet-/skolebeskrivelser og OG-siteName sagde stadig "danske atleter i NCAA | StudentAthlete.dk" på UK-værten. Sitemap'ets sport-slugs følger nu også sproget.
    - Verificeret: UK `/football` → "Football – British athletes in the NCAA | Student-Athlete.co.uk"; DK `/football` uændret amerikansk fodbold; DK 404'er korrekt det engelske `/american-football`.

12. **13 BRITISKE VIDEN-GUIDER SKREVET** (`src/lib/viden-content-en.ts`, Worker 296581e5). **KORREKTION af min egen tidligere vurdering**: jeg påstod at alle 13 var fulde af danmarks-specifikke fakta. Det holdt ikke — 11 forklarer det AMERIKANSKE system og er landeneutrale; kun 2 var reelt danske (akademiske krav + universitetssammenligning). Dem er der researchet britiske fakta til, web-verificeret og kildeangivet i guiderne:
    - Mindst 5 akademiske GCSE-beståelser, gennemsnit E eller bedre (Skotland: Standard Grade 6), dækkende engelsk, matematik, naturfag og samfundsfag — NCAA's egen International Guide.
    - **GCSE PE, media studies, ICT, D&T, musik, kunst, applied science/maths og short-course tæller IKKE** — fælden der fanger briter, som ellers opfylder UCAS fint.
    - 16 core courses, min. 2,3 core-GPA til D1. **SAT/ACT permanent afskaffet som eligibility-krav (jan. 2023)** — men kan stadig kræves til OPTAGELSE og legater; den skelnen misforstås oftest.
    - UK student finance dækker IKKE amerikanske grader.
    - **Bevidst ikke påstået**: NIL-regler for internationale på F-1-visum (restriktive og omstridte — en forkert påstand kan koste læseren visummet). Guiden siger "søg rådgivning".
    - Engelske slugs, sprogopslag som sport-teksterne. Guide-siderne henter nu brand fra sitet (titlerne sagde stadig "| StudentAthlete.dk" på UK-værten).

**FORÆLDET AFSNIT (beholdt som note):** påstanden nedenfor om at guiderne var fulde af danske fakta — gymnasiet, danske karakterer, danske NCAA-navne (gymnasiet, danske karakterer). En ordret oversættelse ville være direkte forkert for britiske læsere, som skal have A-levels/GCSE/UCAS. De skal **skrives om**, ikke oversættes — hver guide kræver britiske fakta, der skal verificeres. Indtil da har UK-sitet ingen /viden-guider (hub'en vil være tom på UK-værten — tjek før launch).

13. **DOMÆNET ER LIVE (2026-08-05, Worker 3016df29) — DARK LAUNCH.** Mikkel skiftede nameservere hos Simply; zonen `student-athlete.co.uk` stod Active. Resten kørte herfra:
    - **DNS uden dashboard**: `CLOUDFLARE_API_TOKEN` har Workers-adgang på KONTO-niveau, men **ingen DNS-rettighed på nogen zone** (`CLOUDFLARE_EMAIL_TOKEN` har DNS, men kun på .dk). Derfor er UK sat op med `custom_domain = true` i `wrangler.toml` i stedet for et route-mønster: så opretter Cloudflare selv den proxied record + certifikatet gennem Workers-API'et. Ingen manuelle records. (Apex på .dk har i øvrigt altid været en custom domain — det er derfor `www.studentathlete.dk` **slet ikke resolver** i dag: route-mønsteret findes, men ingen DNS-record. Ufarligt, men en dag værd at rette.)
    - Live-verificeret: `lang="en"`, engelsk titel/meta, canonical + sitemap + robots peger på .co.uk, `www` → apex 301, alle 16 ruter 200 (`/football`, `/american-football`, `/athletics`, de 5 engelske sider). Dansk site regressionstestet: 14 ruter 200, uændret titel/canonical.
    - **`site_content` havde ingen UK-rækker** → kode-defaults er danske og landeblinde, så UK-sitet sendte dansk `<title>`, meta-beskrivelse, footer og ai-disclaimer. 4 engelske rækker (`country='UK'`) skrevet til D1. **Ny regel: seed `site_content` for landet FØR domænet peger på sitet.**
    - **Absolut-URL-auditten var ikke helt færdig**: `Breadcrumb.tsx` og `/skoler` byggede brødkrumme-JSON-LD på modul-konstanten `BASE_URL` → strukturerede data på UK-sitet pegede på .dk. Begge bruger nu `currentBaseUrl()`. (`crumb.aria` tilføjet til sprogpakken; `aria-label` sagde "Brødkrumme" på engelsk.)
    - **DEN STORE: de læservendte forespørgsler filtrerer IKKE på land.** UK-sitet viste de **126 danske** atleter og **nul** briter, og dets sitemap var .dk's 1.968 URL'er med britisk værtsnavn. To domæner med samme indhold = dublet.
    - **Derfor `darkLaunch: true` i landeprofilen** (`src/lib/countries/uk.ts`): robots.txt spærrer alt · middlewaren sender `X-Robots-Tag: noindex, nofollow` på hvert svar · layoutets metadata sætter noindex. **Fælde fanget undervejs**: fem sider hårdkodede `robots: { index: true }` og overskrev layoutet — de bruger nu `siteRobots()`. Verificeret live: alle UK-sider noindex, alle DK-sider uændret index.

14. **LANDEFILTRERINGEN ER LAVET (2026-08-05, Worker 2d708cef).** Fejlen var ikke manglende filtre — det var **defaulten**: `siteCountry()` faldt tilbage til `DEFAULT_COUNTRY` i stedet for værten, og ingen kalder sendte et land med. Nu er den `async` og slår landet op via `currentSite()`; uden request-kontekst (byggetid, scripts) falder den tilbage til standardsitet som før. Alle 20 kaldesteder afventer den nu.
    - Filtre tilføjet hvor de manglede helt: `getLatestArticles`, `getFeaturedArticles`, `getArticleBySlug`, `getArticles`/`countArticles`, `getArticlesByAthleteId`, `getArticlesByUniversity`, `getAthleteBySlug`, `getSchoolsWithAthletes`, `getAllArticleSlugs`, `getAllSchoolSlugs`.
    - **Detaljesider 404'er nu på det forkerte site** (en dansk atlet findes ikke på .co.uk og omvendt) — ellers ville hver profil ligge på begge domæner. Skolesider 404'er når sitet ingen atleter har på skolen: skolerne er fælles, atleterne er ikke.
    - Verificeret live: DK 126 atleter / 98 skoler / 18 artikler · UK 275 atleter / 127 skoler / "No articles yet" · sitemaps 305 (DK) og 438 (UK) uden en eneste overlappende URL · dansk site regressionstestet på 14 ruter.
    - **Admin følger værten** (`getAllAthletes` m.fl. er nu vært-afhængige) — britiske atleter redigeres altså fra UK-værtens admin. Det er samme model som `site_content` og `pages`.
    - **Uløst, ældre fejl fundet undervejs**: ukendte stier svarer **200 med "Side ikke fundet"** (soft 404) — også på .dk, også før i dag. Årsagen er den kendte: `loading.tsx` streamer 200 før `notFound()` når at sætte status. Det gør nu mere ondt, fordi hver af det andet lands URL'er er en soft 404 på det forkerte domæne. Rigtig løsning: slå op i middlewaren (som atlet-aliasserne) og svar 301 til det rigtige site — eller 404.
15. **`www.studentathlete.dk` VIRKER NU.** Værtsnavnet har aldrig haft en DNS-record (kun en Workers-route), så det gav NXDOMAIN. Proxied AAAA `100::` oprettet på .dk-zonen → routen rammer, middlewaren 301'er til apex.

16. **ADMIN ER FLYTTET TIL STANDARDSITET — MED LANDEVÆLGER** (Worker bfdac353). Cloudflare Access er bundet til ÉT værtsnavn, så `/admin` på .co.uk stod **uden login foran** (app-laget afviste stadig: 401 fra API'et, tom skal på siden). To muligheder: et Access-app pr. land, eller ét admin for alle lande. Mikkel valgte det sidste.
    - Middlewaren sender `/admin` på et landedomæne til admin-værten (302) og 404'er `/api/admin` dér. Landet vælges i stedet i admin: cookie → `x-sa-country`-header (sat af middlewaren, kun på admin-stier, så en klient ikke kan smugle den ind) → `contentCountry()`.
    - **Den header driver ALT**: kladdekø, artikler, atleter, foto- og profilkø, dubletkandidater, sider og sitetekster. `createArticle`/`createAthlete` stempler nu også landet — uden det ville en britisk kladde falde tilbage på kolonnens DEFAULT 'DK' og forsvinde ud af den kø den blev skabt i.
    - Vælgeren ligger øverst i admin (`CountryPicker`), og et nyt land dukker op af sig selv, fordi den læser `COUNTRIES`.
17. **ALLE DANSKE FLADER PÅ .co.uk ER VÆK** (54 nye UI-nøgler): atletoversigt, universitetsoversigt, viden-hub, sport-landingssider, 404 og indlæsningsskærm. **`SearchBar`s `submitLabel` havde "Søg" som DEFAULT** og sivede derfor ud på hver eneste side — defaults i klientkomponenter er den type fælde `UiKey`-unionen ikke fanger. Verificeret: alle otte testede UK-ruter er nu rent engelske, .dk uændret dansk.
18. **SOFT 404 LØST.** `loading.tsx` gør sin rute til en Suspense-grænse → Next streamer skallen med 200, FØR siden kan nå at kalde `notFound()`. Spinneren ligger nu kun på de tre ruter der ikke kan 404'e (**ikke** `/viden`, som er forælder til `/viden/[slug]`). Ukendte stier, ukendte guider og det andet lands URL'er svarer nu ægte 404.
19. **DISCORD PR. LAND** (`pipeline/lib/notify.ts`, 9 tests): webhook slås op som `DISCORD_WEBHOOK_<LAND>` med fald tilbage til fælleskanalen, så en manglende kanal aldrig taber en besked. Kladdebeskeder og genereringsfejl sendes pr. land efter kørslen (aldrig undervejs — en webhook-fejl må ikke vælte genereringen), og den ugentlige rapport sendes nu **én gang pr. land** med "venter på dig"-tal og et link der SÆTTER landevælgeren og åbner køen. **Mikkel mangler kun at oprette kanalerne + secrets — se `SETUP-discord-kanaler.md`.**

20. **TO FEJL FUNDET PÅ DEN FØRSTE BRITISKE KLADDE** (Mikkels gennemlæsning — begge rettet ved roden, Worker cd1a8da6):
    - **Hele afsnit blev vist som overskrifter.** `ArticleBody` delte kun indholdet ved TOMME LINJER, så `## Overskrift` uden en tom linje under sig slugte afsnittet ind i sit eget `<h2>`. Vi kan ikke kræve at en gratis model altid husker den tomme linje — renderen skal læse markdown som markdown. Ny `src/lib/article-blocks.ts` (`splitArticleBlocks`) deler også ved overskriftslinjer; 12 tests, heriblandt den faktiske kladdetekst. Flerlinjede citater strippes nu korrekt pr. linje.
    - **Modellen kendte ikke atletens køn.** Kladden om Almi Nerurkar (kvinde) skrev "he" hele vejen og placerede hende på Georgetowns HERREhold — fordi kildeartiklen lå i skolens herre-sektion (`/news/…/mens-xc-track-…`) og basen intet sagde. Oplysningen ER kendt: hendes egen bio-URL er `/sports/womens-track-and-field/`. **Køn er nu data, ikke gæt**: `src/lib/gender.ts` (`genderFromTeamUrl`, 20 tests — kvinde-mønstre testes FØRST, da "womens" indeholder "mens"), migration 039 `athletes.gender`, scraperen sætter feltet, `backfill-gender.ts` kørt mod prod (**321 atleter udfyldt**, 80 aktive mangler bio-URL endnu). Prompten får `STEDORD:`/`PRONOUNS:` — og står der intet, beder den modellen undgå stedord helt frem for at gætte.
    - **Regel 24 og 25** (identisk nummereret i `system.ts` og `en.ts`): stedord + hold må aldrig udledes af kilden, og en atlet med ÅRGANG Sr./Gr. må ikke få fremskrevet næste sæson ("poised to play a central role" om en dimitterende graduate student).
    - **De 5 britiske kladder er skrevet FØR alt dette** og bør regenereres frem for redigeres (2 af de 5 atleter havde ukendt køn, 2 er Sr./Gr.).

### 🚨 2026-08-06: to af fem kladder handlede om DET FORKERTE MENNESKE
Gennemlæsning af de fem britiske kladder (karakterer: 2× F for forkert person, 1× F for opdigtet citat, 1× D, 1× C−):
- **#102**: kilden handlede om **Bella Murray**, kvindelig volleyball-alumne ansat som assistenttræner. Kladden tillagde hendes 3.135 assists, hendes hæder og hendes ansættelse til **Josh Murray**, mandlig fodboldforsvarer — og gengav træneres citater om "Bella" og "hun" som om de handlede om ham.
- **#101**: kilden var Northeastowns Hall of Fame-klasse om **Paul Grant** (stangspringer i 1970'erne). Kladden skrev at **Iolo Grant** (1. år) "har forpligtet sig til Northeastern" og opfandt at Paul er **hans far**.
- **#99**: opdigtet citat fra cheftræner Merritt — faktaarkets `quotes` var tom.
- **Årsag**: `matchAthletes()` gav et match på KUN EFTERNAVN 35 point, og `MIN_RELEVANCE` var 30. Begge historier scorede 35. Modellen fik en atlet-blok om ét menneske og et faktaark om et andet og flettede dem — som den skal.
- **Sidefund**: `SPORT_KEYWORDS` havde stadig DANSKE nøgler ("fodbold", "atletik") efter motor-refaktoren, så sport-tieren (60 point) var død for 264 af 487 aktive atleter. Rettet til kanoniske slugs.
- **Rettet**: `MIN_RELEVANCE_GENERATE = 60` (efternavn alene må overvåges, aldrig skrives om) · `identity-guard.ts` kører FØR modellen (fornavn skal stå i kilden; entydigt modsatte stedord eller en anden sportsgren blokerer) · citatvagt EFTER parsing (citat i kladde + tomt faktaark = kladden skrives aldrig til basen) · 12 tests, heraf de to virkelige sager. Kladde 99/101/102 slettet, historie 2622/2623 sat til `rejected`.
- **Vigtigt for vurderingen af motoren**: regel 24 og 25 var i kraft (deployet 2026-08-05 12:51), og kladderne blev genereret 2026-08-06 10:09 — **reglerne blev overtrådt alligevel**. Gratis-modellen følger ikke pålidelige negative instrukser. Denne fejlklasse kræver mekaniske spærrer, ikke bedre promptformuleringer.
- **Verifikatoren er ikke et sikkerhedsnet**: #101 (forkert menneske) fik risiko `low`; #98 (korrekt, men fyldt med floskler) fik `high`. Den måler ukildebelagte FORMULERINGER, ikke identitet.

### 🚨 2026-08-05: de danske konti postede en BRITISK artikel (dark launch brudt)
Mikkel publicerede tre britiske artikler i admin. Den timevise social-kø samlede dem op, og **den danske Facebook-side + Bluesky-konto postede en britisk artikel**. Fire yderligere opslag lå i kø til næste kørsel.
- **Årsag 1**: enqueue-forespørgslen tog ENHVER publiceret artikel — kanalerne kendte ikke deres eget land. En kanal er en **konto** (dansk Bluesky-handle, dansk FB-side), ikke en platform. Nu: `country` på `SocialChannel` + `a.country = ch.country`, plus en sidste kontrol lige før udsendelse (en kø-række skrevet af ældre kode må ikke slippe ud alligevel).
- **Årsag 2**: `darkLaunch` spærrede kun for søgemaskiner. Nu spærrer `distributionAllowed()` også for distribution — uanset om nogen senere opretter en konto for landet.
- **Sidefund**: opslaget linkede til et **.dk-link** for en britisk artikel (`buildContent` brugte modul-konstanten `BASE_URL`), altså et link der ikke findes på det site. Rettet til artiklens eget site.
- **Sidefund 2**: `import` af `post-social.ts` kørte hele posteringen — en test kunne have publiceret med de rigtige env-variabler. `main()` er nu bag en entrypoint-vagt.
- **Oprydning**: 4 køede opslag stoppet · **Bluesky-opslaget slettet** (verificeret væk via det offentlige API) · **Facebook-opslaget skal fjernes i hånden**: tokenet kan poste, men hverken læse eller slette (`/me` = siden "StudentAthlete.dk", men opslaget kræver `pages_read_engagement`/`pages_manage_posts`). Link: https://www.facebook.com/106455735664643_1111566981822624
- **Nyt værktøj**: `pipeline/social/delete-post.ts` + workflowet **Slet social-opslag** (kun manuel, dry-run som default, `--diagnose` til token-spørgsmål). Fortrydelsen skal være lige så scriptbar som udsendelsen. Rækker markeres `deleted` (migration 040) — "nåede aldrig ud" og "var ude og blev trukket tilbage" må ikke se ens ud bagefter.

### ⚠️ 2026-08-05: standardsitet var nede i ca. 40 minutter (min fejl)
`custom_domain = true` i `wrangler.toml` er en **fuldstændig liste**: wrangler afkoblede den custom domain-tilknytning `studentathlete.dk` (apex) havde haft længe, fordi den ikke stod i filen — og Cloudflare slettede den DNS-record tilknytningen ejede. Resultat: NXDOMAIN på apex. Genoprettet som en **manuel** proxied placeholder-record (AAAA `100::`), som wrangler ikke ejer; verificeret at den overlever et deploy. `www` manglede i øvrigt også en record og er nu oprettet.
**Hvorfor jeg ikke opdagede det**: jeg verificerede med `curl --resolve VÆRT:443:IP`, som springer DNS over — den beviser at Workeren svarer, ikke at domænet kan slås op. Begge dele står nu i `PLAYBOOK-nyt-land.md`.

**Næste (blokerende før UK må pushes offentligt):** `darkLaunch: false` når der er indhold · UK-artikler skrives + gennemlæses · resterende danske flader på UK (`/atleter`- og `/skoler`-metadata, `/viden`-hub, admin) · AdSense-site for .co.uk · e-mail routing på .co.uk (kræver et token med DNS/Email på den zone — det nuværende har det ikke) · fjern den midlertidige natlige scrape-cron.

## 👉 Seneste arbejde (2026-08-04) — forsidens rytme, arkiv, kildemåling
**Baggrund:** forsiden var en væg af næsten ens blokke, fordi ALLE covers er det GENEREREDE kampkort (rigtige fotos findes kun på atletprofiler + inde i artikler). Mikkel spurgte om 3-5 korttyper; konklusionen blev **nej** — flere skabeloner ville lægge et valg oven i hver redigering uden at fjerne ensartetheden. I stedet: **rytme bestemt af pladsen på siden**. Mockup: `https://claude.ai/code/artifact/3f4d7a99-dbbf-455a-a3e8-019926001c85`.

1. **Forsiden = seks bånd** (`src/app/page.tsx` + `src/components/home/`): A hero (karrusel, uændret) · B lead+skinne · annonce · C datastribe · D tre kort · annonce · E efter sport · F bredt feature (spejlvendt). Billedtunge og billedfri bånd skiftes, så kampkort aldrig står i samme størrelse to bånd i træk. **Søge-/filtervisning beholder det simple grid** (dér leder man efter noget bestemt).
2. **`ArticleCard` har nu fire tætheder**: `featured` (m. `reverse` til bånd F) · `lead` · `default` · **`compact`** (INTET billede — sportsfarvet mærke; det er den der bryder mønsteret). Nye db-queries: `getSiteCounts()`, `getArticlesGroupedBySport()`, `countArticles()`.
3. **`/artikler` — arkivet fandtes ikke.** `getArticles()` henter 18 uden paginering, så artikel nr. 19 kun kunne nås via søgning/sitemap. Nu pagineret (`?side=`) + sportsfilter, indekserbar, rel prev/next + canonical, i sitemap + footer.
4. **`/ig` NEDLAGT → 301 til `/artikler?kilde=ig`** — lagt i **middleware, ikke i siden**: med `loading.tsx` streames en 200 før et side-redirect kan sætte status, og Next falder tilbage til `<meta refresh>` (middleware-filen dokumenterede allerede fælden for atlet-aliasser). Siden var forældreløs — intet på sitet linkede til den.
5. **Kildemåling**: `migration-036` → `events.source`, fanget fra `?kilde=`/`utm_source` på landings-sidevisningen, vist i admin → Analytics. **Bonus-fix**: `classify()` regnede ETHVERT ét-segments-navn for en sportsgren → `/viden` blev logget som sporten "viden", `/viden/[slug]` som en ARTIKEL, og `/ig` som sporten "ig". Sport-slugs slås nu op i sprogpakken (`/fodbold` → `soccer`). Gamle rækker beholder deres værdier — tal er først sammenlignelige fremadrettet.
6. **Verificeret mod PROD D1** (`wrangler dev --remote`): båndene renderer (118 danskere · 91 universiteter · 11 sportsgrene · 0 nye denne uge), 14 unikke artikler uden gengangere, arkiv "Viser 1–18 af 18", `?side=99` giver pæn besked (ikke "Viser 25–18"), `/ig` → 301. Migration 036 KØRT mod remote (nødvendig FØR deploy, ellers fejler track-INSERT lydløst).

**Bemærk**: annoncerne renderer intet i dag (`NEXT_PUBLIC_ADS_ENABLED` er ikke sat) — båndene står tættere indtil ads slås til. Datastribens 4. celle viser "0 nye" i off-season. **Deployet 2026-08-04** (Worker 12b14628); verificeret live: forsidens bånd, `/artikler` "Viser 1–18 af 18", `?side=99` pæn besked, `/ig` → 301, `/ads.txt` → 404 (afventer ID).

## 👉 Seneste arbejde (2026-08-03 #2) — UK-forberedelse (funktioner klar, IKKE aktiveret)
**Mikkels beslutninger (denne session):** UK er første ekspansion · Mikkel self-editer UK ved launch (ingen redaktør-gate) · domæne LÅST til student-athlete.co.uk (studentathlete.co.uk er taget) · prep nu, launch FØRST efter DK's in-season-validering.

**Bygget (commit fa24ea1, alle tests grønne, tsc ren, INGEN adfærdsændring på live-sitet):**
1. **`src/lib/i18n/en.ts`** — engelsk (britisk) sprogpakke: soccer→"Football" på slugget `/football`, amerikansk fodbold→`/american-football`, atletik→"Athletics", britiske stavemåder (centre-back, defenceman, metre). Registreret i `LANGUAGES`.
2. **`src/lib/countries/uk.ts`** — UK-landeprofil, **BEVIDST IKKE registreret i `COUNTRIES`** (én linje = næste scrape indsætter ~1.000 UK-atleter i live `athletes`; aktiverings-checkliste står i filens header). Klassifikation er markers-først ("X, England"-formater — verificeret mod 40 rigtige katalog-rækker); byliste kun navne UDEN US/CA-navnebror (bar "London" klassificeres bevidst ikke); guards mod New South Wales/New England/canadiske provinser/nations-highschools. `code: "UK"` (matcher katalogets vokabular, ikke ISO's GB).
3. **`src/lib/profile-baseline-en.ts`** — engelsk profil-grammatik (registreret i `PROFILE_BUILDERS`): a/an-artikler, rolle-normalisering ("as a freestyle swimmer", "vault specialist"), "American football" m. stort A, "California" (ikke "Californien"), UK-nationssuffiks strippes fra hjemby.
4. **Tests**: `pipeline/lib/_hometown-uk-test.ts` (57) + `src/lib/_profile-baseline-en-test.ts` (32); `_positions-test.ts` håndhæver nu positionPhrase-completeness for ALLE registrerede sprog. Begge nye suiter i `ci.yml`.

**Research-fund inden Mikkel afbrød domæne-sporet (gem til launch):** `studentathlete.co.uk` er registreret (2021, fornyet til feb 2027, registrant redacted) men DØD — nameservers (thundercloud.uk) svarer ikke, intet hostet siden ~2016 → ingen aktiv konkurrent; evt. opkøbelig. **Katalog-tal**: UK = 972 rå rækker (DK = 62 rå vs 138 kuraterede → reel UK-pulje snarere 1.200–2.000 = 10–15× DK's review-load, IKKE de gamle ~760). Sport-split: soccer ~476 (D2-tung!), golf ~132, tennis ~105, atletik ~95. Ireland = 111, ALDRIG poolet under UK-brand.

**Mangler før UK-aktivering** (jf. `ARKITEKTUR-motor.md` + header i `countries/uk.ts`):
- [ ] Domæne købt + CF-zone + wrangler-route
- [ ] Engelske genererings-prompts (`pipeline/generate/prompts/` er hardcodet "Skriv ALTID på dansk")
- [ ] ~400 danske UI-strenge i JSX + danske route-mapper (`/atleter`, `/viden`, `/skoler`) + sprog-pr-request-context
- [ ] Throttle-strategi for review-load (10–15× DK — fx D1-only eller top-sports ved launch)
- [ ] DK in-season-validering bestået + Mikkels go

## 👉 Seneste arbejde (2026-08-03 #1) — motor-refaktor (kerne/sprog/land)
Migration 034+035 kørt mod prod + deployet. **`ARKITEKTUR-motor.md` i repo-roden er den autoritative reference** (tre lag; databasen taler ikke dansk; nationalitet er en kolonne; ingen vært som konstant; alt læservendt gennem `sportLabel()`).

## 👉 Seneste arbejde (2026-07-08) — profiltekster (udkast→godkend) + juridisk vurdering
**Mikkels krav:** kort profiltekst pr. atlet, bygget af VORES egen hårde information (roster-fakta + kildebelagte athlete_events) — freshman får "startede på X"-linje, sommer-job udvider til karriere-resumé sæson for sæson. **ALT går gennem udkast→godkendelse — "mennesker læser alt der publiceres" gælder OGSÅ regelbaseret skabelon-tekst** (Mikkel 2026-07-08; profile_summary skrives KUN af admin-godkendelsen).
1. **Basis-tekst (regelbaseret, $0)**: `src/lib/profile-baseline.ts` — deterministisk dansk sætning fra roster-fakta (freshman/veteran/dimitteret/inaktiv-varianter; hjembysuffiks strippes). Test: `_profile-baseline-test.ts` (15). Vises IKKE direkte — bruges kun som udkast-generator.
2. **Migration-031** `athletes.profile_draft`/`profile_draft_at` (kørt remote). Konvention: draft≠NULL=afventer · godkend→summary, begge NULL · afvis→draft NULL men draft_at BEHOLDES (afvist-markør: baseline genforeslår aldrig; expand må gerne).
3. **Pipeline** `pipeline/profiles/build-profile-drafts.ts`: `--baseline` (regelbaseret, ingen LLM; dry-run verificeret live: 111 udkast/111 kandidater) + `--expand` (LLM via gratis-kæden, json-mode, KUN athlete_events+baseline som input; deterministisk verifikation afviser opfundne tal/manglende navn/URL'er; **helbreds-events filtreres fra** — GDPR art. 9, jf. JURA-vurderingen). Test: `_profile-drafts-test.ts` (18).
4. **Admin-kø** `/admin/profiler` (side + ProfilerClient + `/api/admin/profil/[id]`): udkast redigerbart før godkendelse, fakta-grundlag (events m. kildelinks) foldes ud, Profiler-badge på dashboard. Godkendelse → `profile_summary` (vises i "Om"-sektionen + meta description som hidtil).
5. **Workflow** `profile-drafts.yml`: baseline søndag 08:00 UTC (efter roster-scrape 04:00) + expand årligt 5. juli (sommerpausen); manuel dispatch m. mode/dry_run; Discord-besked ALTID m. antal + /admin/profiler-link (udkast = dashboard-synlig værdi). CI: begge nye suiter tilføjet ci.yml.
6. **Juridisk vurdering af HELE setuppet** (baggrunds-research, kun primærkilder): `Mikkels eget/StudentAthlete.dk/JURA-vurdering-2026-07-08.md`. Hovedpunkter: intet strukturelt ulovligt; hullerne er dokumentation (privatlivsside, LIA, katalog-retention) + **Pressenævnet-registrering = største de-risking** (HLTV.org-kendelsen 2023 = næsten identisk præcedens i vores favør); AI Act art. 50(4)-undtagelsen passer vores human-review-model (gælder fra 2/8 2026 — behold AiDisclaimer + review_log); foto-kreditering er IKKE en licens (skriftlig tilladelse pr. skole før foto-featuren aktiveres).
7. **Kataloget**: `run-catalogue.sh` loft 1400→2000 skoler (DB har 1761 — halen blev aldrig scannet). NB fra 07-07: catalogue-daily har nu ✅/❌-Discord-besked m. summary.

## 👉 Seneste arbejde (2026-07-07) — katalog dagligt + Google News væk + Discord /catalogue (alt LIVE)
1. **Ekspansions-katalog: ugentligt → DAGLIGT.** `catalogue-weekly.yml` omdøbt → `catalogue-daily.yml`; cron `0 6 * * 0` → `0 21 * * *` (roligt vindue: efter 18:00-discover, før 00:00-discover; fri af js-scrape 03:00 + morgen-cluster 06:30/07:00/07:30 → undgår D1-kontention). Hvert fuldt sweep skipper nogle skole-slices; daglige kørsler konvergerer inventaret ~7× hurtigere via idempotent upsert. Inden for alle limits: public repo = gratis GH-minutter; ~10k D1-writes/kørsel << 100k/dag; ingen LLM. Commit 1dc4264.
2. **Google News fjernet** (Mikkel: kun officielle holdsider, væk fra kommercielle medier). Slettet `pipeline/discover/google-news.ts` + `google-news-daily.yml`-workflow; `sensitive.ts`-kommentar generaliseret. (Kørte stadig på GitHub indtil push — nu stoppet.) Commit 5d7e07c.
3. **Discord `/catalogue`-kommando** — kør ekspansions-sweepet on-demand. Ny slash-kommando → `catalogue-daily.yml` workflow_dispatch i `workers/discord-bot/` (`index.ts` WORKFLOWS-map + `register-commands.ts`). Worker redeployet (version 99cb571a). Kommando-registrering lagt i ny **`register-discord-commands.yml`** (manuel Actions-knap; bruger repo-secrets `DISCORD_APP_ID` + `DISCORD_BOT_TOKEN`, tilføjet af Mikkel via GitHub UI). Kørt grøn: 5 kommandoer registreret (/discover /generate /scrape /stats /catalogue). Deploy-helper: `workers/discord-bot/deploy-and-register.sh`. Commits 734bd1d + 0a9127d.
   - **NB**: bot-token nulstillet af Mikkel — påvirker IKKE den kørende worker (verificerer interaktioner med `DISCORD_PUBLIC_KEY`, trigger workflows via `GITHUB_PAT`; bot-token bruges KUN til kommando-registrering). Re-registrering verificeret grøn med det nye token → GitHub-secret'et holder det aktuelle token.

## 👉 Seneste arbejde (2026-07-03 #2) — hærdnings-batch (alt LIVE + verificeret)
1. **Kampkort i FULD 1200×630 er live** — pre-rendret UDENFOR Workeren: `pipeline/render/render-cards.ts` (satori+resvg i Node, egen twemoji-loader) + DELT element-træ `src/lib/og-card.ts` (plain-object-elementer, ingen JSX — én kilde til sandhed med `/api/og`-fallbacket). Gemt som base64 i D1 `card_blobs` (migration-029, ~220 KB/kort); `/api/og?type=card` serverer blob → fallback on-the-fly 600×315. `CARD_VERSION=8` (buster gamle edge-caches). Alle 18 publicerede kort uploadet + verificeret live (curl: 1200×630 fra prod; fallback-vej: 600×315). Timevis `render-cards.yml` (:05, før social :15; `--force`-input til design-ændringer). **NB: R2 var Mikkels ønske, men kontoen har aldrig aktiveret R2 (API-fejl 10042 "enable R2 through the dashboard") → D1-blobs giver samme resultat på $0. Vil Mikkel have R2 senere: aktivér i dashboard → lille migrering.**
2. **CI**: `ci.yml` — tsc (src+pipeline) + alle 10 testsuiter på hvert push/PR. Første kørsel grøn på commit 2209806.
3. **Ugentlig D1-backup**: `weekly-backup.yml` (lørdag 02:00 UTC, FØR søndags-scrapen) — `wrangler d1 export` → gzip → Actions-artefakt 90 dage. Discord ved fejl.
4. **Drift-tjek (gotcha-værnet fra 07-02)**: seed-scripts stempler nu content-hash i `site_content` (`seedhash.sport`/`seedhash.guides`, delt helper `pipeline/lib/content-hash.ts`); dagligt `content-drift.yml` (06:30) sammenligner kodens hash med stemplet → Discord-alarm "kør seed-scripts" KUN ved drift. Admin-redigeringer rører ikke stemplet → ingen falske alarmer. Stemplet + verificeret grønt.
5. **`/spil-i-usa` + `/api/lead` PARKERET** (Mikkel: ikke klar til den lead-model endnu): mapper omdøbt til `_spil-i-usa`/`_lead` (Next ignorerer underscore-mapper; genaktivering = omdøb tilbage, note i page-headeren). `/ig`-CTA peger nu på `/viden`. Admin → Leads + migration-028 består (tom, harmløs). Verificeret: begge URL'er serverer 404-siden.
6. **Kendt SEO-småting (IKKE fikset)**: catch-all'en returnerer HTTP 200 med 404-indhold (soft-404) for ukendte slugs — pre-eksisterende; ret ved lejlighed.

## 👉 Seneste arbejde (2026-07-02/03) — strategibeslutninger + bygge-batch (alt LIVE)
**Mikkels beslutninger (2026-07-02, sparring):** INGEN auto-publish nogensinde (menneskelig godkendelse = permanent politik; skalering via landsredaktør-model) · DK kører på $0 (Anthropic-nøgle droppet — kreditter kom aldrig; JSON-mode på gratis-kæden i stedet) · Canada nedprioriteret (dæknings-gab-logik) · skader = normal dækning (kun tidslinje-hallucination skal værnes) · kildepolitik: team-sites OK, kommercielle medier kun citatskik; langsigtede søjler = frivillige/freelance-interviews (evt. YouTube) · NSSA-leadgen genoplives når motoren er bevist (15% af fee-aftale fandtes i site v1). **PLAN-autonomi-uk.md er OMSKREVET** til at afspejle alt dette.

**Bygget + deployet (migrations 024–028 kørt remote FØR deploy; alle 193 tests grønne; typecheck ren):**
1. **JSON structured outputs på gratis-kæden**: `GenerateOpts.json` → Mistral/Groq `response_format: json_object`, Gemini `responseMimeType` (CF AI/Anthropic ignorerer flaget bevidst). Skrivefasen beder om `{title, summary, content}`-JSON (`buildSystemPrompt(..., {jsonOutput:true})` + `parseArticleOutputSmart` m. legacy-fallback); `json:true` på alle 6 JSON-kaldesteder (verify-article, box-score, build-factsheet, verify-story, mine-edits, generate). Dræber fed-titel/tomme kladder + prompt-ekko. Test: `_parse-output-test.ts` (19).
2. **Sensitive-detektor** (`pipeline/discover/sensitive.ts`, regelbaseret): crime/discipline/eligibility/personal; værn mod sports-idiomer ("sudden death", "eligibility remaining", "court"). Migration-024 `stories.sensitive`; sat i extract-story + google-news; **rød FØLSOM-badge** øverst i admin-kladdeliste (flagede sorteres først); `sensitiveCareBlock()` føjes til skrive-prompten. Skader er BEVIDST ikke en kategori. Test: `_sensitive-test.ts` (23).
3. **Skade-tidslinje-værn**: system-prompt regel 23 (tidslinjer KUN fra kilden, aldrig estimeret) + verify-article SPECIAL RULE (usourced tidslinje → high).
4. **Byline-fundament**: migration-025 `articles.author_role` (NULL=AI; 'human' skjuler AiDisclaimer i alle 4 templates); redigerbar i admin-editoren (rolle-select). Forbereder frivillige/interviews.
5. **Synlige rettelser**: migration-026 `correction_note`/`corrected_at`; admin-felt (kun publicerede); `CorrectionNotice`-boks ("Rettet [dato]: …") før SourceBox i alle templates. `corrected_at` stemples automatisk i updateArticle.
6. **Review-log**: migration-027 `review_log`; publishArticle logger approved_as_is/edited (content vs original_content), deleteArticle logger rejected (kun AI-kladder); 28-dages fordeling i weekly digest. Formål: EVIDENS for review-omkostning (landsredaktør-rekruttering), ikke auto-publish.
7. **Leads m. attribution (NSSA-prep)**: migration-028 `leads`; offentlig side `/spil-i-usa` (guide-links + formular) → `/api/lead` (isbot + same-origin + honeypot + feltlængder); admin → **Leads** (statusflow ny→kontaktet→videresendt→lukket) + badge på dashboard. Verificeret live: gyldig gemmes, evil-origin + honeypot smides stille væk, tom → 400. Syntetisk verify-række slettet.
8. **YouTube-embeds**: `src/lib/youtube.ts` (`youtubeIdFromUrl` — kun blokke der KUN er en YT-URL; nocookie-domæne = cookieløs status bevaret) + ArticleBody-branch. Test: `_youtube-test.ts` (17).
9. **`/ig` link-i-bio-side** (noindex, mobil-først, seneste 12 artikler som store tryk-mål + CTA'er) — til Instagram-profilens bio-link.
10. **Oprydning**: X-secrets slettet fra GitHub (API død → social-poster springer X over); migrate.sh manglede 023, nu 023–028; pre-eksisterende typefejl i `_honors-test.ts` fikset; admin article-PUT whitelister nu felter eksplicit.

**Udestående før sæsonstart (fra omskrevet plan):** R2 pre-render af kampkort · CI-testkørsel på push · ugentlig D1-backup · D1↔kode drift-tjek på sport/viden-tekster · newsletter (fase 1.5) · Meta-app til Facebook+Instagram (samme app, FB-kode findes).

## 👉 Seneste arbejde (2026-07-02) — faktatjekket indhold DEPLOYET til D1 + Worker
**Opdaget**: 06-30-faktatjekket (commit 307ad7b) ramte kun `src/lib/sport-content.ts`/`viden-content.ts` — men alle 13 sport- + 13 viden-sider har D1-overrides (Phase 1, `resolveSportContent`/pages-tabellen fletter D1 over kode), og alle 26 rækker var seedet **06-24, FØR faktatjekket** → intet af det var faktisk live. Mikkel havde selv lappet `football`-siden manuelt i admin samme morgen (kun Vinatieri-delen, ikke Big House/APA) — den rettelse er nu overskrevet af den fulde, kildebelagte version fra koden (samme faktakonklusion, mere komplet).
- Kørt `npx tsx pipeline/seed/seed-sport.ts` + `seed-guides.ts` → `wrangler d1 execute studentathlete-dk --remote --file=db/seed-sport.sql`/`seed-guides.sql` (upsert, 26 rækker skrevet).
- `npm run deploy` kørt (Worker-version a5b8e2c0) — også fanger `6c74366` (honors-monitor).
- Verificeret live: `/football` viser nu Vinatieri+2018+107.601+APA-Kilder; `/viden/hvad-er-ncaa` viser "91. i 2026"-rettelsen.
- **NB fremover**: `seed-sport.ts`/`seed-guides.ts` er destruktive upserts — kør dem KUN lige efter en kode-ændring af pillar/guide-tekst, ALDRIG uden at tjekke om der er uafhængige admin-redigeringer i D1 først (`wrangler d1 execute ... --command "SELECT slug,updated_at FROM pages WHERE kind IN ('sport','guide')"`).

## 👉 Tidligere arbejde (2026-06-30) — faktatjek (djævelens advokat) + APA-kilder på de statiske tekster
**Mål (Mikkel): maksimér ethos — alle påstande i sport-pillartekster + viden-guider websøgt og verificeret, og "Kilder" omlagt til APA-referenceliste (akademisk stil), fordi AI er en integreret del af projektet.**

Verificeret påstand-for-påstand mod primærkilder. Teksterne var generelt meget præcise; rettelser anvendt i `src/lib/sport-content.ts` + `src/lib/viden-content.ts` (tsc rent):
- 🔴 **Faktafejl rettet — Morten Andersen** (`sport-content.ts`): påstod han er NFL's mestscorende spiller gennem tiderne. Forkert siden 2018 (Adam Vinatieri passerede ham → Andersen nr. 2). Nu korrekt + "Big House" = præcis 107.601 + Signing Day omformuleret (december-perioden er nu primær).
- 🟠 **Inge Nissen** (basketball): titlerne 1979/1980 var **AIAW**, ikke NCAA (NCAA kørte ikke kvindebasketball før 1981-82) → markeret som "AIAW, forløberen for NCAA-turneringen".
- 🟠 Football-intro "wide receivers" → "linemen"; **volleyball** "titusinder" → reelle ~18.000-19.000 (finalestævne); **roning** Sutton strammet til den kildebelagte kendsgerning (første dansker på Cal-holdet, 2015).
- 🟡 Blødgjort ukildebelagte påstande: basketball-seertal, fodbold "faktisk flest danskere" (→ "egen optælling"), football-kausalpåstand. "knap 90 mesterskaber" → "omkring 90 (kvindebrydning = nr. 91 i 2026)".
- **APA-omlægning**: alle "Kilder"/`sources` (17 i sport, 27 i viden) → `Org. (År, D. måned). Title.` som klikbar APA-reference (URL = link-mål bag citatteksten). Tilføjet støttekilder (Pro Football HOF, Women's Basketball HOF, Cal Athletics, golf-history).
- **Statiske sider** (om/ai-brug/kontakt): ingen eksterne faktapåstande → ingen APA nødvendig; Twemoji CC-BY 4.0-kreditering var allerede korrekt. NB: `om.md` "over 100 aktive atleter" = selvpåstand bundet til live-DB — hold den ærlig når rosteren ændrer sig.
- **Forbehold**: nyhedskilder uden tydelig byline brugt med organisation-som-forfatter (gyldig APA-praksis); enkelte `.com`-opslagssider er `(n.d.)`. Personlige bylines kan tilføjes på ønske.
- **Committet (307ad7b) + nu deployet til D1 + Worker (2026-07-02)** — se sektion ovenfor.

## 👉 Seneste arbejde (2026-06-25)
- **Honors-monitor LØST** (`pipeline/discover/honors.ts` + `_honors-test.ts`, 15/15 grøn): regelbaseret `detectHonor()` genkender ugentlige konference-hædersbevisninger ("Player/Athlete/Pitcher/Freshman of the Week", "of the Month", "All-Conference", "All-American"). Wiret ind i `extract-story.extractStoriesForSchool` → `HONORS_BOOST=15` (kappet ved 100) løfter honors-historier i `stories.relevance_score`, så `generate-articles` prioriterer dem. **Ingen ny infra**: honors flyder allerede gennem de skole-feeds der overvåges i check-sources (skolen poster typisk selv "X kåret til Conference POTW"). Verificeret web: konference-sites er Sidearm m. `/rss.aspx` (big12sports.com `.dbml`/`.aspx`, meacsports.com `rss_feeds.aspx`) — `Source.source_type` har allerede `'conference'`-værdi reserveret → konference-feeds kan tilføjes som backup uden skemaændring.
- **Box-score-API research (ikke wiret — afventer go):** `henrygd/ncaa-api` (gratis, self-hostbar, `/game/{id}/boxscore`, multi-sport) = bedste API, MEN nøglet til ncaa.com game-IDs og individuelle stat-lines tynde for D2/D3/NJCAA (stor del af seed). → fast-path for D1-marquee, IKKE erstatning for nuværende Sidearm-scrape (`box-score.ts`). `CollegeFootballData` = rig men kun football. Anbefaling: behold scrape som baseline; tilføj evt. ncaa-api som D1-fast-path senere (kræver game-ID-opslag + build-factsheet-integration = rører genererings-kernen).
- **Hashtags: PAUSET** på Mikkels anmodning (research gjort: Bluesky 2-3 tags = reel discovery, Facebook 0-1, identitets-tag #DanskeriUSA højest værdi; undgå scholarship-framing).

## 👉 Seneste arbejde (2026-06-24)
- **Athlete career-timeline LØST + deployet** (commits 9ff4eca + 131f857; se [[project-studentathlete-generation]]). `athlete_events`-tabel (migration-023) + regelbaseret extractor (`src/lib/athlete-events.ts`) der høster priser/begivenheder ved publish (dedup, fail-safe). Genereringen fodres med kontinuitets-kontekst (`pipeline/generate/timeline.ts`, "N. år i træk"-derivation) via athleteFactsBlock (alle 4 typer). Profil viser "Karriere-højdepunkter"; admin-redigerbar (tilføj/slet) på atlet-siden. Backfill kørt (9 begivenheder). Verificeret live (Marie Madsen).
- **Presseetik-prompts #1 + #2 LØST** (commit 2efc484, pipeline): artikeltekst fra stats/egen komposition; kilde kun til ét citat + tal-tjek; navngiv medie tidligt.
- **Cookie-features LØST** (commits 4a11a58 + 86fc617): scan → sitet er **cookieløst i dag** (ingen Set-Cookie nogen steder). GDPR-samtykkeboks bygget men **dormant** (vises kun når `consent.enabled` slås til i admin → Tekster — gør det når ads/tracking aktiveres). `/cookies`-deklaration (redigerbar) + footer-link + sitemap. `sa_consent`-cookie; "Kun nødvendige" ligestillet m. "Accepter alle"; fremtidige ad-scripts skal læse `sa_consent.marketing`.
- **weekly-digest fix** (commit f1bba02): `.ts`-extension-import fjernet (TS5097).

### Mulige næste skridt (intet aftalt)
- Aktivér ads → slå cookie-boks til + wire ad-scripts bag `sa_consent.marketing`.
- Fanatics-affiliate (bygges fra spec) · crisp-card pre-render (R2/CI) · valgfri citatskik-stramning (mindre kvalitativ udtrækning ved rene medie-kilder).

---


## 👉 Seneste arbejde (2026-06-23) — redaktionel kontrol (Phase 1) + hotfix
**Mål (Mikkels regel): Mikkel skal kunne redigere ALT selv i /admin, uafhængigt af AI-rate-limits. Plan: [EDITORIAL-PLAN.md](EDITORIAL-PLAN.md) i repo-roden.**

Princip: **kode-default + D1-override** — alt læses fra D1 med hardcoded fallback, så intet kan gå i stykker, og indholdsændringer kræver hverken kode eller deploy.

- **Phase 1a LØST + deployet (commit bd5f554, version 13c86b72):** de 13 viden-guider er nu **redigerbare i admin → Sider**. `migration-020` (pages += `kind`/`category`), `seed-guides.ts`→`db/seed-guides.sql` (guider som markdown-pages, kind='guide'), `/viden/[slug]` + hub + sitemap læser D1 med kode-fallback (`guideToMarkdown`). `getPublishedPageBySlug` serverer kun kind='page' (ingen rod-dubletter). Verificeret live: 13 guides 200, ingen dubletter, markdown renderes.
- **OG-HOTFIX (commit e322621):** 1200×630-kortene (v6) sprængte free-plan CPU (10 ms) → 503 "Worker exceeded resource limits" ved kolde renders (+ kaskade-503 på sider). Rullet tilbage til **600×315** (v7). Skarpe kort venter på pre-render (R2/CI) — se nedenfor.
- **Fanatics-template (commit 87b7754, inert):** `src/lib/fanatics.ts` + `src/components/ui/FanaticsAffiliateLink.tsx` — ikke wiret ind; aktiveringstrin i fanatics.ts-header. Mapping: docs `Mikkels eget/StudentAthlete.dk/fanatics-store-mapping.csv`.

- **Phase 1b LØST (commit 8e94f07):** 13 sport-pillar-tekster → redigerbare `kind='sport'`-pages; `resolveSportContent()` fletter D1 over kode (title/pillar/meta). `intro` stadig kode (Phase 2-rest). → **Hele Phase 1: al lang-form prosa (guides+sport+sider) redigerbar.**
- **Phase 2 (core) LØST + deployet (commit c700542, version eb4ad124):** `site_content` KV (migration-021) + `src/lib/site-content.ts`-registry + admin → **Tekster** (`/admin/indstillinger` + `/api/admin/settings`). Redigerbart nu: `site.title`, `site.description`, `footer.blurb`, `disclaimer.ai`. Verificeret: D1-override går live + falder tilbage til kode-default; editor token-gated. Nyt felt = 1 linje i registry + 1 brug (ingen anden kode).

### Redaktionel kontrol — afsluttet (2026-06-23, deployet e1675118 m.fl.)
- **Phase 4 LØST (delvis):** admin → Sider grupperet efter kind (Sider/Guider/Sportssider).
- **Featured/pinned carousel LØST:** `articles.featured` (migration-022); forsidens karrusel viser fastgjorte (fallback nyeste); pin-toggle i artikel-editoren. Verificeret.
- **Shelved (bevidst):** editable nav (strukturel/risiko), edit-blyant (kræver login-session), ad-toggle (rører kerne-render, ads off), sport-intros (lav værdi). Crisp-cards pre-render = separat track (R2/CI), ikke gjort.

### Presseetik — vurdering + beslutninger (2026-06-23)
Vurdering: `Mikkels eget/StudentAthlete.dk/PRESSEETIK-vurdering.md`. Beslutninger truffet:
- **#5 LØST:** ny `/presseetik`-side (rettelse/klage/afpublicering) + footer-link.
- **#6 LØST:** "Menneskelig gennemlæsning"-afsnit tilføjet `/ai-brug`.
- **#3 (forelæggelse) & #4 (mindreårige): ikke et problem** — dækningen er neutral/positiv; college-atleter er ~18+ og vant til dækning.
- **#2 + #1: TODO i pipelinen (prompts) — IKKE gjort endnu.** #2: navngiv kildemediet øverst + max ét direkte citat. **#1 (vigtig):** skift generering så artikelteksten bygges fra STATS/egen komposition; kildeartiklen bruges KUN til ét citat (hvis den har et) + "vibe check" af tal — ikke som tekstgrundlag. Mindsker citatregel-konflikten.

### Parkeret (til når ads aktiveres)
- **Cookie-scan + GDPR-samtykkeboks.** Nødvendig FØR ads går live. NB: nuværende analytics er bevidst **cookieløs** (daglig-saltet hash, IP gemmes aldrig) → ingen banner krævet i dag. Når tredjeparts ad-cookies (Fanatics/ad-net) tilføjes, kræves: forudgående granuleret samtykke (afvis lige så let som accepter), cookie-scan/-deklaration, og at ad-/tracking-scripts først loades efter samtykke. Byg automatisk samtykkeboks + scan af faktisk satte cookies.

### Næste skridt
- **Prompt-ændringer #1 + #2 LØST** (commit 2efc484, pipeline — virker ved næste generering; system.ts regel 4/11/22 + renderFactSheet).
- **Athlete-timeline-feature** (NÆSTE — se [[project-studentathlete-generation]]): `athlete_events`-tabel m. significance-tier (routine/notable/honor → recall-vindue) + `season` + "consecutive honors"-derivation; harvest fra faktaark ved publish; fodres ind i generering; profil-højdepunkter + admin-redigerbar. 3 slices.

---


## 👉 Seneste arbejde (2026-06-22) — SEO-canonical, cover-fixes, Ai-disclaimer, Fanatics-mapping
**Alt deployet til prod (Worker-version f0c16520, commits 426a657 + 9241d2d på main) og verificeret live.**

1. **GSC duplikat-sider (http/www) LØST**: ny `src/middleware.ts` 301-redirecter `http→https` og enhver ikke-kanonisk vært → `https://studentathlete.dk` (skipper /api, _next, dotted-filer via matcher). `www` har i øvrigt INGEN DNS-record → var aldrig en reel duplikatkilde; http:// var det. Tilføjet `metadataBase` + self-canonical på forside/atleter/viden (catch-all havde dem i forvejen). **Mikkels GSC-opgaver**: submit `https://studentathlete.dk/sitemap.xml` (eksisterede allerede, 1935 URLs, auto-opdaterer fra D1) + klik "Validate Fix" på duplikat-rapporten.
2. **Atletfoto ødelagde kort-dimensioner LØST**: `publishArticle()` stamplede tidligere atletens headshot i `cover_image_url` → lister viste råt portræt. Nu returnerer `getArticleCoverUrl()` ALTID det genererede 16:9 kampkort; stamp fjernet; og:image + profil-thumbnails bruger også kampkortet. Rigtige fotos vises kun på atletprofil + inde i artiklen. Verificeret på Marie Eline Madsen-artikel (og:image = `/api/og?type=card&article=80&v=6`).
3. **Kornede kort på store skærme LØST**: OG-kort renderes nu i fuld **1200×630** (var 600×315 via `scale(0.5)`); `CARD_VERSION`→6 buster edge-cachen. NB: 4× pixels = højere render-CPU på free-plan (mitigeret af edge-cache 7d + retry-script; fald til ~900×472 hvis blanke kort under spidsbelastning).
4. **Ai-disclaimer** (commit 426a657): `AiDisclaimer`-komponent i bunden af alle 4 artikelskabeloner, linker til `/ai-brug`.
5. **Fanatics-affiliate (Layer 2) — plan + verificeret mapping** (docs i OneDrive `Mikkels eget/StudentAthlete.dk/`): `fanatics-affiliate-implementation.md` (spec + EU-29) + `fanatics-store-mapping.csv` (alle 104 roster-skoler web-verificeret: 7 EU→fanatics.de, 85 US→fanatics.com, 12 uden butik). Slug delt på tværs af .com/.de/.co.uk. Rutér danskere til .de (ikke .co.uk = post-Brexit told). IKKE bygget i koden endnu. Se [[project-studentathlete-commerce]].

---


## 👉 LØST (2026-06-16, #3): foto-pipelinen kører nu automatisk end-to-end
**Test-kørsel afslørede at JS-rendering ALDRIG har virket. Tre kode-bugs + én token-fejl fundet og fikset (commits 993be62 + fedf346 + 9b18a44). Verificeret i PROD. Se [[project-studentathlete-photos]].**

1. ~~GitHub-secret manglede Browser Rendering-perm (401)~~ **LØST**: secret'en er sat til det fungerende token (`gh secret set CLOUDFLARE_API_TOKEN` med det lokale token, der har Browser Rendering + D1). Verificeret: workflow renderede **47 rosters**, fandt 2 danskere, stoppede pænt på HTTP 429 (dagskvote opbrugt — som designet).
2. `scrape-js-rosters.ts` brugte forkert endpoint (`/scrape` + `formats:["html"]` + streng-`waitForSelector` → HTTP 400, renderede ALDRIG). Omskrevet til `renderPage` (`/content`) + kvote-stop med rå status-logning (401 auth vs 429 kvote).
3. `suggest-photos` havde ingen identitets-gate → køede UNCG's "Lars.png" som Hector Nissen (holdkammerat!). Tilføjet efternavns-match-gate på og:image; afviste det forkerte forslag.

**Pipelinen er nu LIVE**: daglig cron (03:00 UTC) renderer ~47 rosters/dag → backfiller bio_url → gated suggester → kø i admin → Fotos. Roterer gennem skolerne i bidder inden for gratis-kvoten, konvergerer over dage.
**~18 forslag venter på godkendelse** (Madsen + 3 manuelle + Zoe + Karoline Lauritsen + Casper Puggaard + Tobias Kristensen m.fl.). **Mikkels eneste opgave: godkend i admin → Fotos** (tjek Dikte Bang visuelt — uverificeret opaque-hash).

---


## 👉 Seneste arbejde (2026-06-16, #2) — profilbilleder iterativt (commit 214b5ec, pushet)
**0/128 atleter havde foto. Pipeline = bio_url → suggest-photos → admin-godkendelse. Bottleneck: kun 11 havde bio_url (roster-scraper plain-HTTP fejler på JS-Sidearm-sider). Gjorde den daglige JS-scraper til en iterativ, kvote-bunden billed-udfylder. Se [[project-studentathlete-photos]].**

- **Bugfix**: `parseInt(x) || default` gjorde `--max-age-days 0` → 30 (0 er falsy). Rettet i `scrape-rosters.ts` + `scrape-js-rosters.ts` + `suggest-photos.ts`.
- **`scrape-js-rosters.ts`**: fanger nu `bio_url` (INSERT + dedikeret `COALESCE`-backfill-UPDATE på slug, uafhængig af class_year — den GJORDE det ikke før!) + selektionen medtager/prioriterer nu rosters på skoler med aktive danskere uden bio_url (ikke kun `js_required`). `checked_at ASC` roterer gennem de ~95 målskoler over flere daglige kørsler → udfylder bio_url i bidder inden for den gratis browser-kvote (~10 min/dag).
- **`daily-js-scrape.yml`**: kører nu `suggest-photos` lige efter scrapen (plain fetch, ingen kvote) → nye bio_urls bliver til køede headshots samme dag.
- **Manuelt udført forinden**: 10 foto-forslag venter på godkendelse i admin → Fotos (9 auto + Marie Eline Madsen #1, 8 artikler, verificeret). +6 bio_urls sat manuelt på artikel-atleter (nu 17 m. bio).
- **Caveat**: foto kun køet når bio-siden har et navne-matchet og:image (JS-lazy-load-templates giver intet). og:image er IKKE identitetssikkert (UNCG gav holdkammerats foto) → navne-match-gate. Godkendelse er stadig Mikkels gate. Konvergerer gradvist.
- **TODO Mikkel**: godkend de 10 i admin → Fotos. Daglig cron (03:00 UTC) starter backfill; kan trigges nu med `gh workflow run daily-js-scrape.yml`.

---


## 👉 Seneste arbejde (2026-06-16) — first-party analytics (besøg + pageviews + klik)
**Erstattede den bot-tællende edge-logning med en first-party JS-beacon. DEPLOYET til studentathlete.dk + migration 019 kørt mod remote D1 + `ANALYTICS_SALT`-secret sat. Build/typecheck/tests grønne. Committet + pushet til `main` (commits 124f3b3 content + 4f6c5bf analytics; main = prod-tilstand).**

Hvorfor: Statistik-siden viste ubrugelige tal (middleware loggede ALT, inkl. bots; UA-filter alene fanger ikke spoofede scrapers) og kunne ikke spore klik. Beacon = kræver JS-eksekvering (filtrerer de fleste bots som hosted-værktøjer gør) + `isbot`-UA-tjek; data forbliver i egen D1; ingen samtykke-banner; gratis. Valg truffet vs Umami Cloud (se [[project-studentathlete-expansion]] — revurder ved UK-launch hvis funnels/UTM/realtid ønskes).

**Arkitektur:**
- Ny `events`-tabel (migration-019, ÉN tabel for pageview+click). IP gemmes ALDRIG — kun daglig-saltet SHA-256(salt:dato:ip:ua) → unikke mennesker/dag.
- `src/app/api/track/route.ts` (offentlig POST): isbot-filter → same-origin-værn (Origin-host = studentathlete.dk/localhost) → server UDLEDER selv page_type/sport via `classify()` → daglig visitor_hash → INSERT. Returnerer altid 204 (lækker aldrig).
- `src/components/Analytics.tsx` (`"use client"`, i layout): pageview ved mount + `usePathname()`-skift; delegeret klik-lytter (`[data-track]` vinder, ellers eksterne links auto = 'outbound'). Transport: `sendBeacon` → fetch keepalive (`src/lib/track.ts`).
- Klik annoteret: ArticleCard + Carousel + SportLandingPage atlet-links (`data-track="internal"`), AthleteProfilePage bio-link (`bio_out`), AdSlot (`ad`), SearchBar (fyrer `search` i handleSubmit).
- Dashboard (`admin/analytics/page.tsx`) læser nu fra `events` via `getAnalytics()` i `src/lib/analytics.ts`; tilføjet **Unikke besøgende** (sum af daglige distinct hashes) + **Klik**-sektion (efter type + mest klikkede mål).
- SLETTET `src/middleware.ts` (eneste opgave var bot-logningen; `classify()` flyttet til `lib/analytics.ts`). Gammel `pageviews`-tabel + data efterladt urørt (dashboard læser den ikke længere; valgfri oprydning senere).
- Dep: `isbot@^5.1.43`. Test: `src/lib/_analytics-test.ts` (classify/device/click-kind/hash) → `npx tsx src/lib/_analytics-test.ts`.

**Verificeret live (2026-06-16):** curl-tests mod prod → Googlebot-UA + cross-origin (evil.com) = INGEN række; Chrome-UA + Origin = pageview m. referrer-host/DK/desktop/visitor_hash; bio_out-klik m. samme hash. Synthetic verify-rækker slettet bagefter.

**MANGLER (næste session):**
- [ ] **Menneske-sti** (kan ikke køres uden browser): browse et par sider + klik bio-link/kort + søg på studentathlete.dk, åbn så `/admin/analytics?token=…` og bekræft Unikke besøgende + Klik-tal udfyldes. (Sti-tjek af SPA-pageviews + data-track-klik.)
- [ ] **Commit + push** (koden er uncommitted; deployet direkte fra arbejdskopi via `wrangler deploy`).
- [ ] Valgfrit: drop gamle `pageviews`-tabel når dashboardet er bekræftet.

---

## 👉 Tidligere arbejde (2026-06-15) — sport-landingssider, KUN content
**Redigeret: `src/lib/sport-content.ts` (pillar-tekst for alle 13 sportsgrene). Ingen kode/skema ændret. Typecheck ren. Graphify opdateret. UNCOMMITTET.**

- Hver sport fik rigere **"Sæsonens gang"** + **tidbits**. For de individuelle sportsgrene (svømning, atletik, golf, tennis, roning, gymnastik) tilføjet en **"Sådan afgøres en holdkamp"**-sektion, der forklarer skole-mod-skole-formatet (dual meet/match, pointscoring, golf-match-play, cross country lavest-vinder osv.).
- **Webverificerede fakta** (juni 2026): CFP 12 hold (2024), soccer College Cup 48 hold, golf 8-hold match play (siden 2009), tennis først-til-4 + no-ad, baseball CWS 8 hold/BBCOR, svømning 25-yards, roning kvinder=NCAA/herrer=IRA. **Rettet 3 fejl**: football 85-stipendier → 105-trupsloft (House-forliget 2025); DI herre-soccer afskaffede gen-indskiftning 2024; perfekt 10-skala gælder kun KVINDERS NCAA-gymnastik (herrer + elite = åben skala).
- **Tilføjet prolifike danske NCAA-navne** (webverificeret): football Morten Andersen (Michigan State) + Hjalte Froholdt (Arkansas); basketball Christian Drejer (Florida) + Inge Nissen (Old Dominion); svømning Anton Ipsen + Søren Dahl (NC State); atletik Ole Hesselbjerg (Eastern Kentucky); golf Rasmus Neergaard-Petersen (Oklahoma State); tennis Mikael Torpegaard (Ohio State) + August Holmgren (San Diego); roning Joachim Sutton (Cal); ishockey Oliver Lauridsen (St. Cloud State); fodbold = ærlig note (flest danskere, men ingen enkelt stjerne).
- **MANGLER navn** (ingen verificeret prolifik NCAA-dansker fundet — bevidst IKKE opdigtet): baseball, gymnastik, volleyball. Spørg Mikkel hvis der findes navne.

---


## 👉 Næste session — start her (handoff 2026-06-11: social-kø)
**Modul 7 (social media-automation) er bygget og testet lokalt — migration 018 KØRT mod remote D1, men koden er UNCOMMITTET og workflowen kører først når den er pushet + secrets er sat.**

1. **Arkitektur**: `social_posts`-kø i D1 (én række pr. artikel × kanal, UNIQUE-dedup). Publicerede artikler enqueues automatisk (kun published_at < 48t — de 18 gamle artikler backfilles bevidst IKKE, verificeret mod prod). Timevis GitHub Actions-cron (`social-post.yml`, :15) dræner med **adaptiv pacing**: gap = 24t/kø-dybde, clamped 60–180 min. Lille kø → 3t mellem opslag; dyb kø → speeder op til hård grænse 1/time/kanal (Mikkels krav 2026-06-11: adaptiv + hård grænse + friskhed). Kø-rækker ældre end 48t → 'expired' (postes aldrig — friskhedsgarantien).
2. **Kanaler** (`pipeline/social/channels/`): Bluesky (AT Protocol, uploader kampkort som embed-thumb), X (API v2, OAuth 1.0a HMAC-signering i ren node:crypto, gratis tier ~500/md), Facebook Page (Graph API, link-preview automatisk). Ukonfigurerede kanaler (manglende secrets) springes helt over og får ingen kø-rækker → kanaler kan tilføjes gradvist.
3. **Opslagstekst er regelbaseret** (`copy.ts`, ingen LLM): Bluesky = titel (link i embed-kort), X = titel + URL, FB = titel + ingress (link separat). Kampkortet (OG-billedet) er det visuelle. 27 tests i `_social-test.ts` (pacing + copy), typecheck ren.
4. **Fejlhåndtering**: 3 forsøg → status 'failed'; enhver kanal-fejl → exit 1 → Discord-besked (KUN ved fejl, samme princip som discover-daily). `workflow_dispatch` har dry_run-input; lokalt: `npx tsx pipeline/social/post-social.ts --dry-run` (kræver CF-env-vars fra ~/.bashrc).
5. **Verificeret**: migration 018 kørt remote (14 tabeller), dry-run mod prod D1 OK (kø 0 = korrekt, seneste publish 5. juni er uden for vinduet), enqueue-SQL kørt uden fejl.

**STATUS 2026-06-11 (senere samme dag) — committet (1e87d35) + Bluesky LIVE:**
- [x] Commit + push — workflowen kører timevis
- [x] **E-mail**: Cloudflare Email Routing aktiv på studentathlete.dk — social@ + catch-all → m.guldbjerg@gmail.com (destination var allerede verificeret fra GFC-setuppet). Sat op via API (nyt token `CLOUDFLARE_EMAIL_TOKEN` i ~/.bashrc: Email Routing Addresses + Rules + DNS edit; enable-endpointet kræver en permission tokenet ikke har → MX/SPF swappet manuelt via DNS API, verificeret med SMTP-probe RCPT 250 OK). Gamle simply.com MX/SPF slettet.
- [x] **Bluesky LIVE**: konto oprettet (API-signup blokeret af captcha → Mikkel oprettede i appen), handle opgraderet til **@studentathlete.dk** via `_atproto` TXT + updateHandle (app-password-session måtte gerne). DID: did:plc:cuxgz7lfn4735dtwz3pzpp7z. Secrets `BLUESKY_HANDLE` + `BLUESKY_APP_PASSWORD` sat. Dry-run mod prod OK — første rigtige opslag sker automatisk når næste artikel publiceres.
- [x] **X LIVE**: @StudAthleteDK (dedikeret konto, IKKE Mikkels personlige) — alle 4 secrets sat, verificeret read-write via verify_credentials. NB free tier ~500 posts/md; pacing-cap 24/dag kan teoretisk ramme loftet i tunge uger → tilføj månedsbudget pr. kanal hvis det sker
- [ ] **Facebook**: developers.facebook.com-app + page access token (long-lived via /me/accounts) → secrets `FB_PAGE_ID` + `FB_PAGE_ACCESS_TOKEN` (mest bøvl — kan vente)
- [ ] Bluesky-profil: udfyld avatar/bio/banner i appen (konto er nøgen)

---

### Tidligere handoff (2026-06-10 eftermiddag)
## 👉 (handoff 2026-06-10 eftermiddag)
**Billedmodulet (IDEA-billeder.md niveau 1+2) er bygget, deployet til studentathlete.dk og verificeret live (commit 38bd59e). Migrations 014–016 kørt mod remote D1.**

1. **Kampkort (niveau 1) LIVE**: artikler uden foto viser nu genereret kampkort (skolefarve + twemoji-piktogram + navn/skole + modstander/score fra faktaark + dato). `getArticleCoverUrl()` i seo.ts (bump `CARD_VERSION` ved designændring — edge-cache 7 dage). Verificeret: artikel 79 → Cleveland State-grønt kort, korrekt uden score (transfer-historie).
2. **VIGTIG opdagelse**: `/api/og` har renderet BLANKT i prod siden start (kun brugt til meta-tags, så ingen så det). Tre satori-på-Workers-gotchas fixet: (a) ingen default-font → Playfair 700 + Noto Sans 400/700 TTF i `public/fonts/`, hentes via ASSETS-binding (HTTP-fallback i dev, husk try/catch — dev-shim tager ikke Request-objekter); (b) `inset: 0` understøttes ikke → eksplicitte top/left/right/bottom; (c) alpha-hex i gradients (`#rrggbb88`) fejler → solid farve + rgba()-overlay. Logo inlines som data-URI (Worker kan ikke fetche egen zone).
3. **Skolefarver**: migration-015 + `pipeline/scrape/school-colors.ts` (theme-color/CSS-var-heuristik). Kørt live: **73/101 skoler fik farve automatisk; 28 mangler** → sæt manuelt i **admin → Skoler** (ny side med farvevælger).
4. **Foto-forslag (niveau 2)**: migration-016 + `pipeline/scrape/suggest-photos.ts` (headshot fra bio_url-siden, kredit forudfyldt "Foto: X Athletics") + **admin → Fotos** godkend/afvis-kø (badge-tal på dashboardet). Kørte med 0 forslag — bio_url udfyldes først af søndagens scrape (14. juni); `photos`-job i weekly-scrape.yml fylder køen automatisk derefter.
5. **Statiske sider i admin**: migration-014 `pages.published` (kladde-gate) + publicér-checkbox i admin → Sider + offentlig route viser kun published=1. De 3 udkast (om/kontakt/ai-brug) er seedet som kladder — **Mikkel: udfyld [REDIGER:-felterne i admin → Sider og sæt flueben i "Synlig på sitet"**. Seed klobrer ALDRIG admin-redigeringer (INSERT OR IGNORE).
6. **Free-plan CPU-fix (senere samme dag)**: kolde kampkort-renders ramte fejl 1102 (Workers free = ~10ms CPU; satori er tungere). Firdelt fix: latin-subset-fonte (110KB i stedet for 1,2MB pr. render), eksplicit `caches.default` put/match (**Worker-svar edge-caches IKKE af Cache-Control alene!**), 600×315-canvas via scale(0.5)-wrapper, retry-script i layout + lazy-loading. Sekventielt nu 8/8; samtidige bursts kan stadig fejle enkelte (retry-scriptet healer + cachen holder 7 dage/PoP). Cache varmet for alle 18 publicerede. **Robust slutløsning hvis det driller i sæsonen (mange nye artikler + trafik): præ-render kort i pipelinen → R2 (gratis) ELLER Workers Paid $5/md — Mikkels valg.**
7. **Læringsloop BYGGET + LIVE (commit 89e1cf2)**: `pipeline/learn/mine-edits.ts` miner original_content↔content-diffen på publicerede artikler — regelbaseret ord-diff (vagter: ingen tal=fakta, ingen småord, ingen sætningsskel-støj, omskrivnings-detektion >45%, maks 5/artikel) + LLM-klassifikation (gratis-kæden, fail-open; håndhævede caps fordi svage modeller ignorerer instruktioner). Forslag → `style_corrections` status='suggested' (migration-017: status/rule_type/evidence_count + articles.edits_mined_at) → **admin → Stilguide "Forslag fra pipelinen"** godkend/afvis; godkendt = direkte i system-prompten (husregler som egen blok i buildSystemPrompt). Afvist genforeslås aldrig; gensyn tæller evidence op; enkeltords-par vises først ved 3+ sigtninger. Kører dagligt efter generate (generate-manual.yml). Weekly digest viser nu **redigeringsgrad** (auto-publish-KPI'en) + ventende forslag. 19 tests. Minet de 11 eksisterende redigerede artikler → 58 forslag i kø (admin viser top 25). NOTE: lokal kørsel brugte CF Workers AI (svag) — kvaliteten af LLM-forslag løftes automatisk når ANTHROPIC_API_KEY sættes 15.-16. juni.
8. **🎓 Dimissions-badge BYGGET + LIVE (commit 4502344)**: atleter med expected_graduation forbliver AKTIVE med badge (1. juni dimissionsår → 31. maj året efter) = discovery dækker stadig draft-/pro-kontrakt-nyheder i badge-året (Mikkels præcisering 2026-06-10). Vises på atletprofil (hero-chip + status) og /atleter-kort. `pipeline/report/retire-graduates.ts` (dry-run default; --apply i weekly-scrape) pensionerer til alumni FØRST efter vinduet. Afledt af expected_graduation → 5.-årsspillere mister badgen automatisk når scraperen skubber året. 19 atleter (2026) badget nu; 0 klar til pensionering (korrekt). Coverage: 82/126 aktive har expected_graduation — resten fanges efterhånden af roster-scrapes (class-year.ts).
9. **Kampkort-status (ærligt)**: efter font-subset + edge-cache + 600×315 + retry-script renderer kort pålideligt sekventielt (8/8) men samtidige kolde bursts kan stadig fejle nogle (fri-plan CPU, fejl 1102) — retry-scriptet healer i browseren og cachen holder 7 dage/PoP. Artikel 72/73/79-kort ville ikke rendere i test-vinduet (budget-throttling efter mange testkald) — de healer ved første rigtige besøg. Robust slutløsning hvis det driller i sæsonen: præ-render → R2 (gratis, byggearbejde) eller Workers Paid $5/md.

**TODO MIKKEL (uændret + nyt):**
- [ ] **15.–16. juni: `ANTHROPIC_API_KEY`** som GitHub-secret (kredit åbner)
- [ ] Redigér de 3 sider i **admin → Sider** (ikke længere md-filerne) + publicér
- [ ] Udfyld de 28 manglende skolefarver i **admin → Skoler** (liste i school-colors-output; kør evt. `npx tsx pipeline/scrape/school-colors.ts --dry-run` igen)
- [ ] CF Access (`SETUP-cloudflare-access.md`, 15 min)

---

### Tidligere handoff (2026-06-10 formiddag)
## 👉 (handoff 2026-06-10)
**SWOT-analyse → `PLAN-autonomi-uk.md` (mål: autonom til publicering → auto-publish af korte artikler → UK). Fase 0 påbegyndt — alt UNCOMMITTET i working tree:**

1. **Plan**: `PLAN-autonomi-uk.md` — 4 faser med acceptkriterier. Kernen: review-tid er eneste ikke-skalerende led; auto-publish-gate defineres EMPIRISK af én sæsons review-data (log godkendt/redigeret/afvist — fase 1.3, ikke bygget endnu); UK-launch gated på bevist auto-publish.
2. **Kø-fuld-ping** (`generate-manual.yml`): `SKIP_REASON=max_pending_drafts` surfaces nu som egen Discord-besked ("⚠️ Kladde-kø fuld — generering pauset", orange) i stedet for misvisende "Ingen nye historier". YAML valideret.
3. **Review-ergonomi**: (a) kladde-kø sorteret efter risiko — lav→uverificeret→medium→høj, ældste først (hurtige godkendelser først = køen tømmes = MAX_PENDING_DRAFTS frigøres); (b) grønt "✓ Lav risiko"-badge på dashboardet; (c) **faktaark-panel** på rediger-siden (`FactSheetPanel.tsx`, ny `getFactSheetForArticle()` i admin.ts, `a.story_id` tilføjet ARTICLE_SELECT) — viser fase 1-faktaarket + kilde/box-score-links ved siden af kladden, så review ikke kræver at åbne kilden. Typecheck ren (src + pipeline; weekly-digest TS5097-fejlen er præ-eksisterende, tsx kører den fint).
4. **Statiske sider**: udkast i `content/pages/` (om.md, kontakt.md, ai-brug.md) med `[REDIGER:]`-pladsholdere. **Mikkel: redigér + indsæt e-mail**, så `npx tsx pipeline/seed/seed-pages.ts` (nægter at indlæse filer med pladsholdere; `--dry-run` virker). Footer har nu også "Sådan bruger vi AI"-link (/ai-brug). Siderne serveres via `[...segments]` + pages-tabellen.
5. **CF Access**: `SETUP-cloudflare-access.md` — trinvis guide (~15 min, dashboard-arbejde, ingen kode). Verificeret: intet kalder `/api/admin` server-til-server → simpel e-mail-policy rækker.

**TODO MIKKEL:**
- [ ] **15.–16. juni: sæt `ANTHROPIC_API_KEY`** som GitHub-secret når kreditterne åbner (plan-punkt 0.1) → derefter structured outputs på skriv/verificér (0.2)
- [ ] Redigér `content/pages/*.md` (udfyld `[REDIGER:]`) → kør seed-pages
- [ ] Følg `SETUP-cloudflare-access.md` (15 min)
- [ ] Commit af ovenstående (uncommittet på main)

---

### Tidligere handoff (2026-06-09)
## 👉 (handoff 2026-06-09)
**Committet på branch `feat/data-quality-dedup-backtest` (IKKE pushet/merget endnu). Fem leverancer, 91 tests grønne:**

0. **Box-score-FIX (vigtigst)** — den live backtest afslørede at box-scores v2 **aldrig har virket på Sidearm** (den dominerende platform): (a) `renderPage`-default `networkidle0`/30s timeouter pga. tracking-pixels, (b) `extractMainText` gav 404K tegn navigation så spiller-tabellen (tegn ~19K) lå udenfor `extractBoxScoreStats`' 6000-tegns-vindue → alle spillere gav `found:false`. Fix: `browser-render.ts` default → `networkidle2`/45s; ny `extractBoxScoreText()` målretter stat-tabellerne. **Valideret live: Wyoming/Pedersen career-high 29 PTS, 8-13 FG, 10-10 FT korrekt udtrukket.** (commit 36ff346)
1. **Klassifikator-fix** — `isDanishHometown` (`pipeline/lib/danish-cities.ts`) fanger nu fulde US-statsnavne + "By, Stat / High School"-format + typo-tilfælde; "Elsinore"-alias fjernet. 6 false-positive "danskere" deaktiveret (active=0, reversibelt) via `cleanup-false-positives.ts` (nu dry-run-default). Live: **127 aktive / 9 inaktive.** Test: `pipeline/lib/_danish-cities-test.ts`.
2. **Dedup + transfer** — ny `pipeline/lib/athlete-identity.ts` (identitet på tværs af navne-varianter; mellemnavns-konflikt-guard). Marqus Marion-dublet flettet (#33→#272). Scraperen opdaterer nu eksisterende række (inkl. university) ved transfer i stedet for ny slug. Sweep-script: `pipeline/report/dedup-athletes.ts`. Test: `_athlete-identity-test.ts`.
3. **Officielt bio-link** — `migration-013-bio-url.sql` (kørt mod remote D1), parsere fanger href, scraper gemmer `bio_url`, vist på atletprofil. **Udfyldes ved næste ugentlige scrape.**
4. **Backtest-harness** — `pipeline/backtest/` (offline, deterministisk, 4/4 fixtures). Kører den ægte box-score+to-fase-pipeline via injicerede replay-deps. Kør: `npx tsx pipeline/backtest/run-backtest.ts`. **Mangler:** rigtige in-season-fixtures (creds + håndverificering — se `pipeline/backtest/README.md` RECORD MODE).

**Beslutning:** ekspansion → **UK** (engelsk = ingen oversættelse; ~8× DK's pool). Sekvens uændret: validér DK in-season → parametrisér "dansk" til country-profile → klон.
**Sikkerhed:** admin = statisk `ADMIN_TOKEN` i URL'en (`?token=`), håndhævet på både sider + mutérende API'er. Svaghed = URL-læk/ingen rotation/ingen identitet. **Opgradér til Cloudflare Access før UK-launch** (gratis, edge, ingen token i URL).
**TODO DIG:** sæt `ANTHROPIC_API_KEY` (Claude-routing) + CF Web Analytics-token (uændret fra før). Overvej `git commit` af ovenstående.

---

### Tidligere handoff (2026-06-03)
## 👉 (handoff 2026-06-03)
**Box scores v2 (plan-trin 7) er bygget + unit-testet (39 tests grønne) + typecheck ren, committet + pushet til main. Sidste plan-trin i to-fase-generering er færdigt. Mangler kun live in-season validering på en rigtig recap m. box-score-link (off-season nu → ingen at ride på; fail-open, så det aldrig blokerer en artikel).**

1. **Parser-fix VIRKER i prod** ✅ — scrape-run `26870990500` færdig: **+5 nye danske atleter** (124→129 aktive), **113 'error'→parsed** (8308→8195). `parseRoster` faldt aldrig tilbage til generisk tabel-parser → fejlagtigt-'error' Sidearm-tabel-sider. Aktuelle tal: **133 atleter / 129 aktive · roster_checks: 71 success / 4646 empty / 8195 error / 108 js_required.**
   - **Fortsætter automatisk**: ~2.288 fetch-ok 'error'-rækker blev nulstillet (`checked_at=NULL`); kun én batch (500/division) er kørt. Den ugentlige scrape (søndag 04:00 UTC) tygger resten — atlettal stiger uden indgriben. Render (rate-limited) tager JS-shell-resten. Vil man fremskynde: trigger `weekly-scrape.yml` igen.
2. **DU mangler at gøre**: sæt `ANTHROPIC_API_KEY` som GitHub-secret ($15-kredit) → aktiverer Claude-routing (feature/season) + opgraderer fakta-verifikation. Indtil da kører alt på gratis-kæden (fungerer fint).
3. **CF token**: Browser Rendering-permission tilføjet ✅ (render virker; 429 = per-minut rate limit → `renderPage` retry/backoff).
4. **Box scores v2 BYGGET** ✅ (plan `clever-popping-storm.md` trin 7) — `pipeline/generate/box-score.ts` (ny): `findBoxScoreUrl` (deterministisk link-detektion, ingen LLM), `extractBoxScoreStats` (LLM, fail-open), `mergeBoxScoreIntoFactSheet` (tagger `source:"boxscore"`, overstyrer aldrig prosa, dedupe), `renderBoxScoreBlock` (fase 3 autoritativ tal-blok), `enrichFactSheetWithBoxScore` (orkestrering, ≤1 render/historie, deps injiceret). Wiret i fase 1 (`build-factsheet.ts`: `--no-boxscore`, `--boxscore-budget N` default 8) + fase 3 (`verify-article.ts`: tal der modsiger box scoren → `fabrication_risk='high'`). Tests: `_boxscore-test.ts` (39 grønne). Wiring-smoke-test mod live D1 OK (0 historier off-season). Ingen migration/workflow-ændring (kolonner + steps fandtes). **Mangler**: live in-season validering på en rigtig recap m. box-score-link (off-season = ingen at ride på nu; fail-open så det aldrig blokerer).
   - **Bevidst begrænsning**: link-scan bruger plain fetch af kildesiden — JS-shell-recaps uden statisk box-score-link fanges ikke (renderer ikke kildesiden for at finde linket; kun selve box scoren renderes). Dækker recaps med server-renderet "Box Score"-anker (de fleste Sidearm-templates + CMS-sider).
5. **Udskudt** (bevidst): 599 juco/NAIA missing-website skoler — lav dansk-densitet; NCAA er fuldt dækket.

**Verificér to-fase pipeline manuelt**: `build-factsheet.ts` → `generate-articles.ts` → `verify-article.ts` (kører i `generate-manual.yml` i den rækkefølge). Off-season nu, så få nye historier.
**Fase**: Pipeline fungerer / redaktionel gennemgang

## Oversigt

Nyhedsplatform for danske college-atleter i USA. Next.js + Cloudflare D1.
Pipeline: discovery (skole-feeds) → generering → kladder i admin.

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
- [x] Discovery: skolefeed-scraping (RSS + HTML)
- [x] Artikelgenerering via LLM ProviderChain (multi-provider fallback)
- [x] GitHub Actions: discovery hvert 6. time, backfill + generate kl. 07:00/07:30 UTC
- [x] Pipeline UI: knapper i admin med realtids-polling af GitHub Actions-status
- [x] **Pipeline-fix (april 2026)**: `content_raw IS NOT NULL`-kravet fjernet — genererer nu fra `summary` (RSS `<description>`) når fuld artikeltekst ikke kan hentes
- [x] **Diagnostik**: generate-scripts viser fordeling af historier per indholdskilde ved hver kørsel
- [x] **Polling-fix**: 30s clockskew-buffer i run-status API så "Venter i kø" ikke sidder fast
- [x] **Fane-titel**: browser-tab opdateres med kørestatus (Venter / Korer / Faerdig / Fejl)
- [x] **Google News fjernet** (april 2026): `auto-sources.ts` slettet, `checkGoogleNewsSources()` og hjælpefunktioner fjernet fra `check-sources.ts`. Pipeline bruger nu kun skole-feeds som datakilde. `source-trust.ts` beholdes.
- [x] **Server-side analytics** (april 2026): `src/middleware.ts` logger pageviews til D1 via `ctx.waitUntil()` (nul latency). Admin-dashboard på `/admin/analytics` med datointerval-vælger (presets + custom). CF Web Analytics-beacon klar til aktivering (token mangler — se `layout.tsx`).: `auto-sources.ts` slettet, `checkGoogleNewsSources()` og hjælpefunktioner fjernet fra `check-sources.ts`. Pipeline bruger nu kun skole-feeds som datakilde. `source-trust.ts` beholdes.

- [x] **Discord-digest fixet** (2026-06-02): `weekly-digest.ts` brugte `created_at` på `stories` (kolonnen findes ikke — tabellen bruger `discovered_at`) → SQLITE_ERROR, begge planlagte kørsler fejlede. Talte også `status='published'` på stories (forekommer aldrig; lifecycle er new→drafting→drafted) → rettet til `status='drafted'`. Verificeret: manuel kørsel grøn, digest leveret til Discord.

- [x] **Discord-kommando-notifikationer** (juni 2026): Discord-botten (`workers/discord-bot/index.ts`) udløser 4 workflows via slash-kommandoer (`/discover`→discover-daily, `/generate`→generate-manual, `/scrape`→weekly-scrape, `/stats`→weekly-digest) og lover "du får besked når det er færdigt". Før svarede kun `/generate` (+ `/stats` via selve digesten). Nu giver alle 4 besked — både manuelle OG planlagte kørsler:
  - `discover-daily.yml`: **kun ved fejl** (`if: failure()`). Mikkel 2026-06-04: stories er IKKE dashboard-elementer (en story uden kladde har ingen værdi) → ingen "fandt N"-besked overhovedet. Dashboard-signalet er `/generate: N kladder klar`. (Tidligere variant med found-gate fjernet sammen med tæller-fixet.)
  - `weekly-scrape.yml`: separat `notify`-job (ÉN besked for D1–D3-matrixen, ikke 3) på `always()` → både manuel og planlagt søndags-cron (ugentlig = lav støj).
  - `weekly-digest.yml`: succes poster digesten selv; tilføjet `if: failure()`-besked så et brudt digest-job ikke fejler tavst (jf. SQLITE-fejlen 2026-06-02). Både planlagt + manuel.
  - YAML-valideret (3 filer parser, betingelser OK). Ikke live-trigget (ville køre rigtige jobs + poste i delt Discord → blokeret som uden for opgaven). Verificér ved at køre `/discover` fra Discord.

- [x] **Discover-tæller fikset** (2026-06-04): `check-sources.ts` talte feed-matches, ikke faktiske inserts — `INSERT OR IGNORE` kaster IKKE ved dublet-url_hash, så gen-matchede RSS-items (bliver i feedet i dagevis) blev talt som "nye" ved HVER kørsel → Discord-phantom "fandt 2" uden nye DB-rækker. Verificeret mod live D1: **0 stories siden 06-02**; den ene admin-kladde er artikel 76 ("Madsen All-American", `published=0`), genereret 06-03 fra en 06-02-story — ægte, men urelateret til discovery. Fix: `D1Client.execute` returnerer nu resultatet (var `void`); tæl kun `meta.changes > 0`; ægte insert-fejl logges nu (ikke tavst). Generate-tælleren ("Genereret N artikeludkast" = dashboard-signalet) er OK: dedup på story_id + plain INSERT + tæl efter succes. Se [[laerdomme]] #30.

## Aktuel status

Pipeline kører. **Off-season** (juni): skole-feeds er stille — discovery finder ~1 historie/uge. Få kladder genereres pt. (datagrundlag, ikke fejl).

**Detektion-overhaul (juni 2026)** — fokus: billig/gratis automatisk atlet- + nyhedsopdagelse (se `WORKLOG-detection.md`):
- **PARSER-FIX (juni 2026, største atlet-unlock)**: `parseRoster` (`parsers/index.ts`) faldt aldrig tilbage til den generiske tabel-parser når `parseSidearm` gav 0 → **2.368 roster-checks hentede 200 OK men blev fejlagtigt 'error'** (Sidearm-tabel-layout). Fix: fald tilbage til `parseGeneric`. Stikprøve: ~27% genvindes straks af parser-fixet (~620 rosters), resten er JS-shells til render. 2.288 fetch-ok 'error'-rækker er nulstillet (`checked_at=NULL`) → genscrapes med fixet ved næste kørsel.
- **CF Browser Rendering** (`pipeline/lib/browser-render.ts`) som fallback i roster-scraping + backfill for JS-sider. ✅ Token-permission tilføjet (render virker; 429 = per-minut rate limit → retry/backoff). Resterende JS-shell 'error'/js_required genvindes herigennem.
- **Roster-audit**: 599/1761 skoler mangler website — scopet juni 2026: **alle er NJCAA (juco) + NAIA** (ingen NCAA mangler website; alle 1085 NCAA dækket). Lav dansk-densitet tier → **udskudt** (fokus NCAA). Hvis pursued senere: scrap njcaa.org/naia.org medlemskataloger (ikke 599 søgninger). 'empty'-status (4.533) = roster parset, ingen danskere (normalt, ikke fejl).
- **Præcis nyhedsmatching** (`extract-story.ts`): Unicode hele-ord + bekræftelse (fuldt navn/fornavn/sport-kontekst); almindelige efternavne kræver fornavn. Dræber navnedobbeltgængere.
- **Dansk by-detektion** (`danish-cities.ts`): by-liste som 2. signal (fanger rosters uden "Denmark"-markør); US-stat-guard bevaret.
- **Google News genindført** (`google-news.ts` + `verify-story.ts`): navnesøgning + matcher + isBlockedDomain + LLM-verifikation af ALLE kandidater (`source_type='google_news_rss'`). Daglig workflow 05:30 UTC.
- **Roster-prioritering**: skoler der allerede har en dansker scrapes først.
- **Oprydning**: 545 døde `google_news`-rækker (status='new') arkiveret → generate's fantom-backlog = 0.

**Frossen backlog ryddet**: de gamle Google News-rækker er nu `status='archived'` (reversibelt).

Kladder skal gennemgås manuelt i `/admin` — godkend, rediger eller afvis.

## Næste skridt

### Kræver kørsel nu
1. [x] **Migration-011 kørt** — `pageviews`-tabel verificeret i remote D1 (2026-05-26)
2. [x] **Deployet** — `/admin/analytics` returnerer 200 live (2026-05-26)
3. [ ] **CF Web Analytics** — hent token i CF Dashboard → Analytics → Web Analytics, uncomment script-tag i `layout.tsx`

### Redaktionelt (løbende)
4. **Gennemgå kladder** — godkend eller afvis i `/admin`
5. **Trigger generate manuelt** for at tømme backloggen (~189 historier, 5 pr. kørsel)

### Artikel-nøjagtighed — TO-FASE GENERERING BYGGET (juni 2026, plan: `clever-popping-storm.md`)
Pipeline er nu: **backfill (fase 0) → faktaark/fact-finding (fase 1) → skriv fra faktaark (fase 2) → verificér (fase 3)**. Kører i `generate-manual.yml`.
- [x] Prompt-hærdning (`system.ts` regel 16; betinget længde; ingen sæson-sammenligning).
- [x] **Fase 0**: `renderPage()` fallback i `backfill-content.ts` (dormant til CF token-permission).
- [x] **Fase 1**: `build-factsheet.ts` — udtrækker struktureret faktaark (stats + **kvalitative** fakta + citater, kilde-tagget); `fact_status` gate. Verificeret: midtbane-recap (0 mål/assists) fanget korrekt uden hallucination. Se [[feedback-article-prose-vs-stats]].
- [x] **Fase 2**: `generate-articles.ts` skriver KUN fra faktaark; DB-fakta via `athleteFactsBlock`.
- [x] **Fase 3**: `verify-article.ts` → `articles.fabrication_risk` + `fact_flags`; badge i admin. Kildebaseret prosa flages IKKE; kun upålagte påstande (fangede opdigtet alder "21" i test).
- [x] **$15 Claude**: `preferProvider:"anthropic"` for feature/season_update (dormant til `ANTHROPIC_API_KEY` sættes).
- [x] **Box scores (v2)** — task #16 BYGGET (juni 2026): `box-score.ts` detektér (`findBoxScoreUrl`, regelbaseret) + render + udtræk (`extractBoxScoreStats`, fail-open) box score som `source:"boxscore"` i fase 1 (`build-factsheet.ts`); tal-kryds-tjek i fase 3 (`verify-article.ts` — modstrid m. box score → `high`). Box scores = grundsandhed for TAL, aldrig erstatning for kvalitativ prosa. 39 unit-tests grønne; typecheck ren; wiring verificeret mod live D1. Afventer in-season validering på rigtig recap.

### Kræver dig (credentials)
- **Britisk Bluesky-konto** (kode + e-mail klar, 2026-08-31): opret kontoen på
  `info@student-athlete.co.uk`, lav et app-password, og sæt to GitHub-secrets:
  `BLUESKY_UK_HANDLE` + `BLUESKY_UK_APP_PASSWORD`. Uden dem springes kanalen
  bare over. Handlen kan verificeres som `@student-athlete.co.uk` med en
  `_atproto` TXT-record (samme som .dk) — kræver kontoens DID.
- **CF token**: tilføj "Browser Rendering — Edit" permission → aktiverer render i roster-scrape + backfill.
- **`ANTHROPIC_API_KEY`** ($15-kredit): sæt som GitHub-secret → verifikation + feature-skrivning opgraderes automatisk til Claude.

### Kode (øvrigt)
8. **Statiske sider** — Om, Kontakt, AI-brug (30 min, indsæt indhold via admin → Sider)
8. **Statiske sider** — Om, Kontakt, AI-brug (30 min, indsæt indhold via admin → Sider)
9. **Billedgenerering** (modul 8) — Unsplash API anbefales som start
10. **Social media automation** (modul 7) — Bluesky AT Protocol API (gratis)

---

## Kendte problemer

| Problem | Status |
|---------|--------|
| `content_raw` er NULL for alle historier — JS-sider kan ikke scrapes med plain HTTP | Midlertidigt løst: genererer fra `summary`. Langsigtet fix: CF Browser Rendering |
| MAX_PENDING_DRAFTS = 20 stopper generering stille hvis kladder hober sig op | Dokumenteret — løses ved regelmæssig gennemgang af admin |
| Ralph-pipeline (JSON til output/) er ikke koblet til D1 | Ikke prioriteret — D1-pipeline bruges i stedet |

## Learnings

- **satori/ImageResponse på Cloudflare Workers (2026-06-10)**: ingen default-font (tekst forsvinder tavst — routen var blank i prod i månedsvis), `inset`-shorthand ignoreres (div'er kollapser til 0×0), alpha-hex i gradients (`#rrggbb88`) fejler tavst. Fonte skal leveres eksplicit (TTF via ASSETS-binding; statiske weights, IKKE variable fonts); brug eksplicitte top/left/right/bottom; rgba() i gradients. Egen zone kan ikke fetches fra Workeren → inline assets som data-URI.

- `fetchStoryContent` bruger plain HTTP og fejler for JS-renderede college-sider ved discovery OG backfill (samme funktion) — backfill-steget giver nul merværdi for disse URL'er
- GitHub Actions clockskew: `run.created_at` stempletes ~200ms inden `triggeredAt` returneres til klienten — `>=`-sammenligning skal have buffer
- Google News blev fjernet april 2026 (scam-redirects, navnedobbeltgængere) — **genindført juni 2026** med løsning på dobbeltgænger-problemet: præcis hele-ord-matcher + LLM-verifikation af alle kandidater + domæne-blocklist + obituary-filter. Den oprindelige svaghed var manglende disambiguering, ikke kilden selv.
