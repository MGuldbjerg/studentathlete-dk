# Cloudflare Access på /admin — opsætningsguide

**Hvorfor**: Admin er i dag beskyttet af ét statisk token i URL'en (`?token=`). Det lækker via browserhistorik, bookmarks og logs, kan ikke roteres uden at bryde dine bookmarks, og har ingen identitet. Cloudflare Access lægger et gratis login-lag på edge, FØR requesten når Workeren. Plan-krav før UK-launch (se `PLAN-autonomi-uk.md` punkt 0.6).

**Tid**: ~15 min i Cloudflare Dashboard. Ingen kodeændring nødvendig for at slå det til.

**Verificeret 2026-06-10**: intet kalder `/api/admin/*` server-til-server (GitHub Actions skriver direkte til D1 via REST; Discord-botten trigger workflows via GitHub API). Alle admin-kald kommer fra din browser → en simpel e-mail-policy dækker alt; ingen service tokens nødvendige.

## Trin

1. **Zero Trust-konto** (engangs): [one.dash.cloudflare.com](https://one.dash.cloudflare.com) → vælg din konto → første gang bliver du bedt om et *team name* (fx `groenagergaard`) og plan-valg → vælg **Free** (op til 50 brugere).

2. **Tilføj applikation**: Zero Trust → **Access → Applications → Add an application → Self-hosted**.
   - Application name: `StudentAthlete admin`
   - Session duration: `1 week` (du logger ind igen én gang om ugen)
   - **Public hostname** #1: domæne `studentathlete.dk`, path `admin` (dækker `/admin` og alt under).
   - Klik *Add public hostname* og tilføj #2: domæne `studentathlete.dk`, path `api/admin` (dækker de muterende API-ruter).
   - Tilføj evt. #3 og #4 for `www.studentathlete.dk` med samme to paths, hvis www ikke redirecter før edge.

3. **Policy**: Add policy →
   - Name: `Kun Mikkel`, Action: **Allow**
   - Include → Selector **Emails** → `mgj@groenagergaard.dk` (tilføj flere senere ved behov)

4. **Login-metode**: Under Authentication → vælg **One-time PIN** (ingen identity-provider-opsætning; du får en engangskode på mail ved login). Vil du have Google-login senere, kan det tilføjes under Settings → Authentication.

5. **Gem og test**:
   - Åbn `https://studentathlete.dk/admin?token=...` i et inkognitovindue → du skal mødes af Cloudflare-login FØR siden vises.
   - Efter login virker admin som før (token-checket i appen kører stadig nedenunder).
   - Tjek at en pipeline-knap (fx Pipeline-siden) stadig virker — den kalder `/api/admin/*` fra browseren og har din Access-cookie med.

## Efter det virker

- **Behold `ADMIN_TOKEN` indtil videre** (forsvar i dybden + lokal dev uden Access). Senere oprydning (valgfri kode-opgave): læs identitet fra Access-headeren `Cf-Access-Authenticated-User-Email` i stedet for `?token=`, så token forsvinder helt fra URL'er.
- **Rotér tokenet én gang** nu hvor det har ligget i URL'er i måneder: `npx wrangler secret put ADMIN_TOKEN` → opdater din bookmark.
- Mobil: Access-login virker fint i mobilbrowser (one-time PIN på mail).

## Fejlsøgning

- *Uendeligt redirect/login-loop*: tjek at `studentathlete.dk` er den zone applikationen er oprettet under, og at både apex og www er dækket.
- *404 efter login*: appens eget token-tjek fejler — tokenet skal stadig med i URL'en, indtil oprydningen ovenfor er lavet.
- *GitHub Actions/pipeline fejler efter aktivering*: bør ikke ske (intet server-kald rammer `/api/admin`), men sker det → tilføj en **Service Auth**-policy med service token for den kaldende part.
