# Idé: Payload CMS — vurdering

**Skrevet**: 2026-08-03. Status: **vurderet, anbefaling = vent**. Ikke besluttet, ikke bygget.
Anledning: Mikkel havde noteret "Payload … admin-roller … skal virke oven på koden", men
ikke hvorfor. Noten kunne ikke findes i repoet eller i OneDrive-dokumenterne, så det
nedenstående er en rekonstruktion af argumentet plus en efterprøvning af det.

## Hvad Payload er (og hvorfor "oven på koden" passer)

Payload 3 er et open source-CMS der **installeres ind i en eksisterende Next.js-app** —
samme repo, samme `app/`-mappe, ét deploy. Det er ikke en separat tjeneste man
integrerer imod. Det er efter alt at dømme den sætning noten handlede om: Payload ville
ikke erstatte sitet, det ville lægge sig oven på det vi allerede har.

Ud af æsken giver det:
- **Auth + rollestyret adgang** i vilkårlig TypeScript, både pr. collection og pr. felt
  ("denne redaktør må oprette kladder, men ikke publicere; og kun for sit eget land").
- **Auto-genereret admin-UI** til alt hvad man definerer som en collection.
- **Kladder + versionshistorik** indbygget (vi har håndbygget `published=0` + `review_log`).
- **Mediebibliotek** med R2-upload (vi har håndbygget `photo_suggestions` + godkendelse).

## Passer det på vores stak? Ja — teknisk set

Det var det åbne spørgsmål, og svaret er bedre end forventet:
- **Officiel D1-adapter**: `@payloadcms/db-d1-sqlite` (v3.85.0, august 2026, aktivt vedligeholdt).
- **Officiel Cloudflare-skabelon**: `templates/with-cloudflare-d1` med bindings til D1 og R2.

Så Workers + D1 + Next.js er en understøttet kombination. Stakken er ikke problemet.

## To blokeringer, og den ene er principiel

**1. Payload kræver betalt Workers-plan.** Skabelonens egen README: *"This can only be
deployed on Paid Workers right now due to size limits."* Grænsen er 3 MB gzippet på
gratis-planen mod 10 MB på den betalte. Vores Worker fylder allerede **2,07 MB gzippet af
de 3** (målt ved deploy 2026-08-03) — Payloads admin-panel oveni sprænger loftet med
sikkerhed. Det koster $5/md og bryder dermed **$0-princippet** fra strategibeslutningerne
2026-07-02. Det er ikke en teknisk detalje, det er den beslutning der har styret hele
projektet indtil nu.

**2. Payload vil eje databasens skema.** Adapteren bygger på Drizzle, og dokumentationen
siger rent ud at *"Payload drops the current database schema"* som udgangspunkt. Vi har 23
tabeller fra 33 håndskrevne migrationer, og hele pipelinen skriver til dem udenom Next
(D1 REST API fra GitHub Actions). Sameksistens er mulig via `beforeSchemaInit` +
Drizzle-introspektion af hver eksisterende tabel, eller ved at give Payload sin egen
D1-database. Begge dele er reelt arbejde og en permanent ekstra kompleksitet.

**3. (Ikke en blokering, men den største skjulte omkostning.)** Vores `/admin` er ikke
generisk CRUD. Det er arbejdsgangs-specifikt: kladdekøen er risikosorteret lav→null→
medium→høj, faktaark-panelet ligger ved siden af teksten, stilguiden har forslag med
bevisantal, dubletkøen viser to atleter side om side med begrundelse. Payload giver
formularer over collections — det ville være et *tab* af ergonomi at bytte det væk.

## Hvad noten sandsynligvis handlede om — og den billigere vej

Det reelle problem bagved er sikkert **landsredaktør-modellen**: én redaktør pr. sprog,
flere nationale sites. Det kræver rigtige brugerkonti med forskellige rettigheder, og det
kan vores nuværende opsætning ikke udtrykke — `src/lib/admin-auth.ts` har en hardcoded
`ALLOWED_EMAILS = ["m.guldbjerg@gmail.com"]`. Én ejer, alt eller intet.

Men vi er tættere på end det ser ud: **Cloudflare Access leverer allerede verificeret
identitet**. `verifyAccessJwt()` validerer JWT'et og returnerer e-mailen. Roller er derfor
ikke et nyt system, men en tabel:

```
admin_users(email PRIMARY KEY, role, country, active)
```

… plus et opslag i stedet for `ALLOWED_EMAILS.includes(email)`, og en `role`-parameter i
de handlinger der allerede er gated (`publishArticle`, `decideProfileDraft`,
`decideMergeCandidate`, …). Det er ~1 dags arbejde, koster $0, rører ikke skemaet, og
beholder den admin-ergonomi vi har bygget.

## Anbefaling

**Vent.** Payload løser et problem vi endnu ikke har (mange redaktører, mediebibliotek,
versionering) og koster to ting vi har besluttet at holde fast i ($0-driften og vores eget
skema). Byg rolle-laget oven på Cloudflare Access når det bliver aktuelt.

**Genbesøg Payload hvis ét af disse indtræffer:**
- Vi har **3+ redaktører** og bruger mere tid på at bygge admin-funktioner end på indhold.
- Vi får brug for **rigtigt mediebibliotek + versionshistorik**, som vi ellers skulle bygge selv.
- Vi alligevel går på betalt Workers-plan af andre grunde (så forsvinder blokering 1).

Og hvis vi gør det: den realistiske vej er **Payload på sin egen D1-database** til redaktionelt
indhold, mens pipeline-tabellerne (`athletes`, `stories`, `athlete_events`, …) bliver hvor de er.

## Kilder

- [Payload 3.0: installerer direkte i enhver Next.js-app](https://payloadcms.com/posts/blog/payload-30-the-first-cms-that-installs-directly-into-any-nextjs-app)
- [`@payloadcms/db-d1-sqlite` på npm](https://www.npmjs.com/package/@payloadcms/db-d1-sqlite)
- [Cloudflare D1-skabelonens README (betalt plan-kravet)](https://github.com/payloadcms/payload/blob/main/templates/with-cloudflare-d1/README.md)
- [Payload: SQLite/D1-adapter og skemastyring](https://payloadcms.com/docs/database/sqlite)
- [Payload: Access Control](https://payloadcms.com/docs/access-control/overview)
- [Cloudflare Workers: størrelsesgrænser (3 MB gratis / 10 MB betalt, gzippet)](https://developers.cloudflare.com/workers/platform/limits/)
