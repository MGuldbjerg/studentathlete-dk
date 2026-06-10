# Idé: billeder uden rettighedsrod (modul 8-skitse)

**Skrevet**: 2026-06-10. Status: skitse — ikke besluttet, ikke bygget.

## Princip

Identitetssikkerhed + korrekt kreditering vejer tungere end fotodækning. Vi bruger ALDRIG et foto, hvor vi ikke ved (a) at det er den rigtige atlet og (b) hvem der skal krediteres. Det udelukker auto-scraping af kampbilleder fra kildesider — og det er fint, for de to problemer kan løses i tre niveauer:

---

## Niveau 1 — Genererede kampkort (byg først, nul rettighedsrisiko)

**Idéen**: Hver artikel får et genereret "kampkort" som synligt cover — skolens farver, sport-piktogram, atletnavn, modstander, resultat og dato. Som ESPN's score-grafik, bare i vores layout. Det løfter sitet fra "bogstaver fra navnet" til et redaktionelt udtryk — og kreditlinjen er altid bare **"Grafik: StudentAthlete.dk"**.

**Hvorfor det er en lille byggeopgave og ikke en stor**:
- `src/app/api/og/route.tsx` genererer ALLEREDE 1200×630-billeder med sport-farver, initialer og logo via `ImageResponse`. Kampkortet er en udvidelse af den route (nye params/variant), ikke noget nyt system.
- Faktaarket (fase 1) indeholder allerede de data, kortet skal vise: `event.opponent`, `event.date`, `event.competition`, `result.final_score`, `result.outcome`. Kortet tegner sig selv fra strukturerede data — ingen LLM.
- `articles.cover_image_url` + publish-stempling findes allerede (`publishArticle` fryser cover ved publicering).

**Skal bygges**:
1. **Skolefarver**: migration-014 `schools.primary_color` + `secondary_color`. Backfill-script (dominant farve fra skolens forside/favicon, regelbaseret) + farvevælger i admin → atleter/skole-redigering til manuelle rettelser. ~129 aktive danskeres skoler først, resten on-demand.
2. **Sport-piktogrammer**: ét CC0/public-domain SVG-sæt bundtet i repoet (én silhuet pr. nøgle i `SPORTS`). Ingen ekstern afhængighed, ingen kreditpligt (vælg eksplicit CC0 — IKKE Noun Project/IOC-piktogrammer, som kræver licens).
3. **Kort-varianter** pr. `article_type`: news = resultatkort (modstander + score), feature/season = portræt-layout (navn + skole + sæsonkontekst), recruiting = "ny destination"-kort.
4. Wire som synligt cover på artikelsider + forside-grid (i dag bruges `/api/og` kun til meta-tags).

**Team-logoer — bevidst tilvalg, ikke default**: College-logoer er varemærker. Redaktionel brug til at identificere holdet i nyhedsdækning er udbredt praksis (nominativ brug), men ikke licenseret. Default er derfor farver + piktogram (juridisk nul-risiko); logo-laget kan slås til senere pr. skole, hvis vi vil — feltet kan hedde `schools.logo_url` og bare stå tomt indtil da.

---

## Niveau 2 — Officielle roster-headshots med verificeret kredit (halvautomatisk)

**Nøgleindsigt**: Identitetsproblemet ("er det overhovedet danskeren på billedet?") er løst *by construction* på atletens egen bio-side — fotoet på `bio_url` (som scraperen nu fanger, migration-013) ER den rigtige person.

**Workflow (menneske godkender altid)**:
1. Pipeline henter headshot-URL fra atletens bio-side (samme parser-familie som roster-scrape).
2. Admin får en "foto-forslag"-kø: billedet vises med forudfyldt kredit **"Foto: \<University\> Athletics"** — som er den korrekte kreditering for roster-fotos (skolen ejer/administrerer dem; en navngiven fotograf på siden overstyrer og forudfyldes i stedet).
3. Mikkel godkender med ét klik → `athletes.photo_url` + `photo_credit` (begge kolonner findes allerede, og AthleteProfilePage viser allerede kredit). Aldrig auto-publiceret.

**Rettigheder, ordentligt**: Roster-fotos er skolens ophavsret. Praksis er redaktionel brug med kredit, men den rene løsning er en engangs-tilladelsesmail pr. skole til deres Sports Information Director (SID'er siger typisk ja — det er eksponering for deres atleter). Tilføj `schools.photo_permission` (NULL/spurgt/givet/afslået) + en mail-skabelon; spørg kun skoler hvor vi faktisk har en dansker (~70 skoler, ikke 1.761).

---

## Niveau 3 — Egne og indsendte fotos (senere, bedst kvalitet)

- **Atleterne/familierne selv**: de har ofte de bedste billeder og rettighederne til dem — og de VIL gerne dækkes. Outreach-skabelon + simpel upload (admin-side eller mail) med eksplicit rettighedsbekræftelse. Kredit: "Foto: privat" / fotografens navn.
- **Stock (Unsplash/Pexels)** kun til generiske stemningsbilleder på features ("sådan er livet som student athlete") — aldrig præsenteret som atleten, altid krediteret efter tjenestens regler.

---

## Rækkefølge

1. **Niveau 1 nu** (uafhængig af sæson; gør sitet færdigt at se på — adresserer "proof of concept"-følelsen)
2. **Niveau 2 til sæsonstart** (foto-forslag-køen er endnu et dashboard-element, jf. dashboard-princippet)
3. **Niveau 3 opportunistisk** (skabelonen koster en time; resten kommer af sig selv)

UK-note: niveau 1 og 2 er landeagnostiske (farver, piktogrammer, bio-headshots) — ingen ekstra arbejde ved kloning.
