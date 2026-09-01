# Idé: højere nøjagtighed i kladderne (2026-08-31)

Mikkel: «Is there a way for us to improve draft accuracy? I'm open to anything.»
Her er rangordningen, hvad der er besluttet, og hvad der blev fravalgt — og hvorfor.

## Tallene der former svaret

| | |
|---|---|
| Publicerede artikler | 51 |
| …redigeret af et menneske før udgivelse | **46** |
| `season_update` | 44 af 59 artikler |
| Fixtures i backtesten | **2** |
| Menneskelige review-afgørelser (`draft_reviews`) | 124 |
| LLM-kald pr. dag (top / tilgængeligt) | 63 / ~2.650 |

**90 % af alt udgivet er rettet i hånden.** Det er det ærlige nøjagtighedsmål —
ikke `fabrication_risk`, som slap #198's opdigtede påstand igennem som «medium».

## Besluttet

### 1. Talvagt med reparation — GJORT (c8231e2)
Et tal kræver ikke skøn. Har kladden tal uden dækning i faktaark, kilde eller
profil, bedes modellen rette præcis dem; overlever de, markeres kladden `high`
med tallene i `fact_flags`. Reparation frem for forbud, fordi negative
instrukser ikke holder gratis-modeller i skak — men «du skrev 33, faktaarket
siger 32» er en lille konkret opgave.

Kasserer IKKE kladden, som citatvagten gør: citatvagten er gammel og præcis,
taltjekket er nyt. Strammes når idé 2 kan måle præcisionen.

### 2. Fyld backtesten — NÆSTE
Harnessen findes (`pipeline/backtest/`) og har to fixtures. Med ~40, høstet fra
de 124 gennemgåede kladder, bliver enhver senere idé en **målt** forskel i
stedet for en smagssag. Uden den er resten af dette dokument holdninger.

### 5. To udbydere, sammenlign tallene — BYGGET, MÅLT, SLÅET FRA
Bygget 2026-08-31 og afmålt samme dag. Bagudtesten mod de 38 dømte artikler:
**22 % præcision** (13 rigtige mod 46 falske alarmer, n=59). Talvagten ligger
på 73 %.

Fejlen i idéen: **fravær er ikke modsigelse.** To modeller skriver ikke den
samme artikel — den ene nævner skudstatistikken, den anden ikke — og det siger
intet om hvem der har ret. Uenigheden fordeler sig over alt hvad de to valgte
at nævne, ikke over det opdigtede.

Et støjende flag koster desuden mere end det vejer: står det ved siden af det
gode i `fact_flags`, lærer man at ignorere begge.

**Hvis den tages op igen**: spørg den anden model om det SAMME konkrete tal
(«i hvilket minut scorede X?») i stedet for at bede den skrive en hel artikel.
Modsigelse er et signal. Fravær er støj. Koden står bag `SECOND_OPINION=1`, og
`second-opinion-backtest.ts` kan måle en ny udgave.

### Bagudtest — den vigtigste metode her
Mikkels spørgsmål «can't you test backwards?» viste sig at være den skarpeste
idé i hele forløbet. Enhver ændring der påvirker TEKSTEN kan måles mod de
artikler mennesket allerede har dømt, uden at vente på ny produktion:
faktaarkene ligger i korpusset, så et manglende udkast kan bare skrives nu.

Det tog en time at aflive idé 5. Uden bagudtesten ville den have kørt i
produktion i ugevis og stille udhulet tilliden til de flag der virker.
## Fravalgt — og hvorfor (så det ikke genopfindes)

### 3. Skabelon med pladsholdere · 4. Sætning-for-sætning-kildebelæg
Mikkel, 2026-08-31: «I could see it thin out too much, so each article is just
a few lines of text long, and that's not interesting.»

Indvendingen er rigtig, især for 4: kræver hver sætning et fakta-id, presses
teksten mod en liste af kendsgerninger, og en artikel ingen gider læse er ikke
en bedre artikel. Nøjagtighed må ikke købes for læseværdighed.

**Hvis de nogensinde tages op igen**, er det kun for `season_update` og kun for
TALLENE — ikke for prosaen.

## Om at overvåge nye modeller (Mikkels spørgsmål)

Del det i to. **Tilgængelighed** er et faktum og bør overvåges automatisk —
det gør `llm-health.ts` nu, og den kan udvides til at hente udbydernes
modelkatalog og sige til, når en model vi bruger forsvinder, eller en ny dukker
op. Billigt og risikofrit.

**«Bedre»** er derimod ikke en oplysning man kan læse i et katalog. Det kræver
en målestok, og den er præcis idé 2. Derfor:

    opdag ny model → kør backtesten mod den → foreslå → menneske godkender

**Aldrig automatisk indsætning.** To grunde: en ny model skriver med en anden
stemme, og de 32 aktive stilregler er trænet på den nuværende — et skift
nulstiller den tilpasning i stilhed. Og en utestet model ville skrive om
navngivne mennesker uden at nogen havde set et ord af det.

Skiftet er allerede billigt: `GROQ_MODEL` og `NVIDIA_MODEL` er env-variabler,
så et modelskifte er konfiguration, ikke kode.

## Målestokken

Ikke `fabrication_risk`. Brug **hvor meget Mikkel måtte skrive om**:
`original_content` ligger gemt ved siden af `content` for alle 46. Falder den
afstand, virkede ændringen. Det tal kan en model ikke tale sig ud af.
