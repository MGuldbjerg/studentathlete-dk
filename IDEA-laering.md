# Idé: redaktøren der lærer (selvforbedrende sprog)

**Skrevet**: 2026-06-10. Status: skitse — ikke besluttet, ikke bygget.

## Nøgleindsigt: træningsdataene findes allerede

Hver gang Mikkel redigerer en kladde, opstår et perfekt træningseksempel:
`articles.original_content` (rå LLM-tekst) vs. `content` (efter redaktøren).
Det datasæt vokser af sig selv, koster ingenting, og er præcis defineret som
"forskellen på maskinens dansk og det dansk vi vil have". Stilguiden
(`style_corrections`, injiceres allerede i system-prompten) er i dag håndfodret
— den skal fodres af diffen i stedet.

## Tre læringsloops

### Loop 1 — Edit-mining → stilguide-forslag (kør natligt)

1. Find nyligt publicerede artikler hvor `content != original_content`.
2. **Regelbaseret først** (jf. token-økonomi): sætnings-/ord-diff; eksakte
   udskiftninger ("opgør"→"kamp") der går igen på tværs af ≥2 artikler →
   foreslå direkte som stilguide-rettelse. Ingen LLM nødvendig.
3. **LLM-pas på resten** (gratis-kæden): klassificér hver ændring som
   (a) generaliserbar fraserettelse, (b) stil-/tonemønster, (c) engangs-/fakta-
   rettelse → ignorér (c) — faktafejl hører til verifikationssporet, ikke stil.
4. Forslag lander i admin → Stilguide under en ny "Forslag"-sektion med
   godkend/afvis (samme mønster som foto-køen). INTET aktiveres uden Mikkel.
5. Senere (samme filosofi som auto-publish): eksakte fraserettelser set 3+
   gange kan auto-aktiveres — tærsklen bevises empirisk først.

### Loop 2 — Husregler (lært prompt-tekst)

Mønstre der ikke er fraserettelser ("kortere ingresser", "fjern superlativer",
"aldrig klichéen 'markerer sig stærkt'") vedligeholdes som en rangordnet liste
af prosaregler med evidens-tællere. Top-15 injiceres i system-prompten som
"Redaktionelle regler lært af redaktørens rettelser". Månedlig komprimering:
regler hvis mønster forsvinder fra nye diffs (= modellen har lært det) går på
pension — listen er selvbalancerende og prompt-budgettet bundet.

### Loop 3 — Few-shot fra guldartikler

Artikler publiceret **uden** redigering = guldstandard. Hold et lille bibliotek;
ved skrivning vedlægges 1-2 bedst-matchende eksempler (samme artikeltype/sport)
som forbillede. Udkastene konvergerer mod den accepterede stil i stedet for
modellens default.

## Målingen er allerede planlagt

Review-beslutningsloggen (PLAN-autonomi-uk.md fase 1.3) registrerer
godkendt-som-er / redigeret / afvist. Samme instrumentering driver BÅDE
auto-publish-gaten OG læringen: **KPI = % udkast publiceret uredigeret.**
Læringsloopet accelererer altså direkte vejen til auto-publicering — falder
redigeringsgraden, nærmer vi os tærsklen. Ugentlig digest viser trenden +
hvilke regler der "fanger" mest.

## Guardrails

- Faktarettelser lærer ALDRIG ind i stil (verifikationssporet ejer fakta).
- Stilguide ≤ 50 aktive (eksisterende LIMIT), husregler ≤ 15 → bundet prompt.
- Alt menneskegodkendt indtil evidens-tærskler er bevist.
- Per-sprog regelsæt: dansk-reglerne er et country-profile-aktiv; UK starter
  med tom liste og lærer engelsk husstil fra Mikkels UK-redigeringer.

## Mindste byggesæt (1-2 sessioner)

1. `style_corrections` får `status`-kolonne ('active'/'suggested'/'rejected') — genbrug tabellen.
2. `pipeline/learn/mine-edits.ts` + natligt workflow-step (efter generate).
3. Admin → Stilguide: "Forslag"-sektion (godkend/afvis).
4. `prompts/system.ts`: husregel-blok fra aktive regler af type 'house_rule'.
5. `weekly-digest.ts`: redigeringsgrad-trend.

**Timing**: byg inden sæsonstart (august) — så lærer systemet gennem hele
valideringscyklussen, og hver eneste af Mikkels redigeringer arbejder dobbelt.
