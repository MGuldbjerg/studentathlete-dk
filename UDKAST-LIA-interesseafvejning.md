# Udkast: interesseafvejning (LIA) — indsamling, katalog og profiltekster

**Status: UDKAST — internt dokument, ikke juridisk rådgivning, ikke til udgivelse.**
Skrevet 2026-08-17 som svar på handlingspunkt 2 i `JURA-vurdering-2026-07-08.md`.
Læs igennem, ret, dater og gem som den version der ligger på filen.

Tre behandlinger vurderes hver for sig, fordi de har forskelligt grundlag. Den journalistiske
behandling (udgivne artikler) er IKKE med her — den hviler på databeskyttelseslovens § 3, stk. 8 og
kræver ingen interesseafvejning. Denne vurdering dækker det, som ikke er "udelukkende journalistisk
øjemed".

Metode: trestrinnet test efter EDPB Guidelines 1/2024 — formål, nødvendighed, afvejning.

---

## A. Indsamlingen (roster-scrapen)

**Behandling.** Automatiseret hentning af offentligt tilgængelige holdlister og nyhedssider fra
amerikanske universiteter. Udtræk af: navn, hjemby/land, universitet, division, sportsgren,
position, årgang, køn (udledt af holdets navn), link til skolens egen atletprofil, i nogle tilfælde
skolens profilbillede.

**1. Formål.** At kunne identificere danske og britiske atleter på amerikanske colleges, så vi kan
dække dem redaktionelt. Uden en systematisk indsamling findes der ingen liste over dem — hverken hos
DIF, hos universiteterne eller hos NCAA. Interessen er legitim og forbereder en aktivitet
(journalistik), som lovgiver udtrykkeligt har givet plads.

**2. Nødvendighed.** Kan formålet nås mindre indgribende?
- *Spørge atleterne selv*: ville kun give dem, der svarer, og forudsætter at vi allerede kender dem.
- *Kun følge nyheder*: nyheden nævner sjældent nationalitet; nationaliteten står på rosteren.
- *Købe data*: findes ikke for dette felt, og ville være mere indgribende (flere kilder, mindre
  kontrol).
Indsamling af roster-fakta er derfor nødvendig, og den er minimeret: vi henter ikke fødselsdatoer,
kontaktoplysninger, karakterer, skader eller sociale medier, selvom flere af felterne står på samme
side.

**3. Afvejning.**
- *Rimelig forventning*: oplysningerne er lagt offentligt ud af atletens egen skole netop for at
  blive læst. En atlet på en offentlig roster kan rimeligt forvente at blive omtalt i sportslig
  sammenhæng.
- *Indgriben*: lav. Ingen følsomme kategorier, ingen profilering med retsvirkning, ingen
  sammenstilling med andre datakilder end skolens egne.
- *Sårbarhed*: nogle er 17 år. Se værn nedenfor.

**Værn.** Respektér robots.txt og maskinlæsbare forbehold (også betingelsen i DSM art. 4) ·
begræns hastighed · foretræk feeds frem for fuld crawl · gem ikke rå HTML efter faktaudtræk ·
hold en intern udelukkelsesliste, så en atlet, der har gjort indsigelse, ikke samles op igen ved
næste kørsel · ingen billeder af atleter under 18.

**Konklusion: interessen bærer.** Betinget af værnene ovenfor.

---

## B. Ekspansionskataloget (`international_athletes`)

**Behandling.** Samme type oplysninger om internationale atleter fra alle lande — 11.076 rækker fra
92 lande pr. 17. august 2026 — gemt uden at blive udgivet. Formålet er markedsvurdering: hvor mange
udækkede atleter har et land, og kan det bære en redaktion.

**1. Formål.** Redaktionel planlægning af, hvilke lande vi udvider til. Legitimt, men — som den
juridiske vurdering påpeger — ikke "udelukkende" journalistisk, fordi rækkerne også bruges
forretningsmæssigt. Derfor står det her på art. 6, stk. 1, litra f.

**2. Nødvendighed.** Beslutningen kræver antal og fordeling, ikke navne. Det taler for en mindre
indgribende variant: **aggregér lande, vi har nedprioriteret.** For lande uden en planlagt udgave er
et tal pr. land/sport/division nok; navnelisten er kun nødvendig for lande, hvor en udgave er
under forberedelse (i dag: DK, UK).

**3. Afvejning.**
- *Rimelig forventning*: svagere end i A. Atleten kan forvente omtale i sit eget lands medier, men
  ikke nødvendigvis at optræde i et dansk mediehus' interne register.
- *Indgriben*: lav i indhold (samme offentlige fakta), men bredere i omfang (92 lande).
- *Kompenserende foranstaltning*: en offentlig persondataside, der beskriver kataloget, er det, der
  bærer undtagelsen fra art. 14 (art. 14, stk. 5, litra b — umulighed/urimelig indsats ved 11.000
  personer). **Uden persondatasiden holder afvejningen ikke.**

**Værn.** Slet en række på enhver indsigelse, uden vurdering · slet rækker, der ikke er set på en
roster i 24 måneder · aggregér nedprioriterede lande · optag kataloget i art. 30-fortegnelsen ·
ingen videregivelse til tredjemand, herunder rekrutteringsbureauer.

**Konklusion: interessen bærer — men først når persondatasiden er publiceret, og med
sletteregel og aggregering.** Dette er den svageste af de tre behandlinger og bør revurderes
årligt.

---

## C. Profiltekster (den regelbaserede bio)

**Behandling.** En kort tekst pr. atlet, sammensat mekanisk af roster-fakta og kildebelagte
begivenheder, foreslået som udkast og godkendt af et menneske før visning.

**1. Formål.** At gøre en profilside forståelig for en læser, der ikke kan afkode en amerikansk
roster-tabel. Redaktionelt formål.

**2. Nødvendighed.** Teksten tilføjer ingen nye oplysninger — den formulerer dem, der allerede står
på siden. Alternativet (kun en fakta-tabel) er dårligere for læseren og ikke mindre indgribende.

**3. Afvejning.** Da teksten godkendes af et menneske og udgives redaktionelt, er den i praksis
dækket af den journalistiske behandling. Den står her, fordi genereringen af udkastet sker
automatisk og i bulk: 453 udkast i kø pr. 17. august 2026.

**Værn.** Ingen udkast vises uden menneskelig godkendelse — også ved batch-godkendelse skal hver
tekst have været læst · ingen helbredsoplysninger i skabelonen (udelukket ved konstruktion) ·
ingen fremskrivning af fremtidige sæsoner for dimitterende atleter · ingen stedord, hvor køn ikke er
kendt fra data.

**Konklusion: interessen bærer.**

---

## Samlet

| Behandling | Grundlag | Bærer? | Betingelse |
|---|---|---|---|
| A. Indsamling | Art. 6(1)(f) | Ja | Scraper-hygiejne + udelukkelsesliste |
| B. Katalog | Art. 6(1)(f) | Ja, betinget | Persondataside + 24-mdr. sletteregel + aggregering |
| C. Profiltekster | Art. 6(1)(f) → journalistisk ved udgivelse | Ja | Menneskelig godkendelse af hver tekst |

**Revurderes:** årligt, og straks hvis (a) kataloget bruges til andet end landevalg, (b) et
kommercielt lag begynder at bruge atletdata, eller (c) vi registreres hos Pressenævnet (så flytter
A og C helt over i medieansvarsregi).

**Udarbejdet:** [dato] · **Ansvarlig:** [navn] · **Næste gennemgang:** [dato + 12 mdr.]
