# Plan — sociale konti på tværs af markeder

_Skrevet 2026-09-22, efter en dag hvor Facebook-tokenet blev mintet tre gange og
fejlede tre gange. Vedrører `pipeline/social/`._

## Diagnosen bag planen

Problemet var aldrig Facebook. Det var at **hver eneste legitimation hænger på
Mikkel personligt**, så alt der rammer hans konto — en adgangskodeændring, en
Meta-throttle, en rolleændring — rammer distributionen i alle markeder på én
gang. Med to markeder er det irriterende. Med fire er det uholdbart.

Konkret, målt 22. september:

- Siden `StudentAthlete.dk` **ejes af virksomhedsporteføljen**, og Mikkels
  adgang til den går GENNEM porteføljen («Fuld adgang»), ikke gennem en klassisk
  side-rolle.
- `/me/accounts` viser kun sider hvor brugeren har en **klassisk** rolle. Derfor
  svarede den `{"data": []}` hver eneste gang, uanset hvor rigtigt tokenet blev
  mintet. Appen manglede adgang til porteføljens aktiver.
- Det token der lå i `FB_PAGE_ACCESS_TOKEN` var et **USER**-token. Det bar hver
  eneste krævede rettighed og kunne alligevel ikke poste SOM siden, og Meta
  svarede med præcis samme `(#200)` som ved manglende rettigheder.

## Princippet

> **Aktiver hører til porteføljen. Tokens hører til en systembruger, ikke til et
> menneske.**

Alt andet følger af det.

## Måludgaven

### Meta, pr. marked

| Ting | Antal | Hvorfor |
|---|---|---|
| Virksomhedsportefølje | 1 i alt | Ejer alle aktiver |
| App | **1 i alt**, ejet af porteføljen | Appen er softwaren, ikke kontoen. Én app pr. land ville sprede `debug_token` og kanariefuglen over flere app-hemmeligheder |
| Facebook-side | 1 pr. marked | |
| Instagram-konto | 1 pr. marked | Koblingen konto↔side er **1:1** hos Meta |
| Threads-profil | 1 pr. marked | Oprettes automatisk med IG-kontoen; er et aktiv i Business Settings |
| Systembruger | **1 pr. marked** | `sa-publisher-dk`, `sa-publisher-uk` — hver med KUN sit markeds aktiver |

Systembruger pr. marked, ikke én global: et kompromitteret eller tilbagetrukket
token koster ét marked, og et nyt marked rører ikke et eksisterende token.

⚠️ **Threads har sit eget token.** `graph.threads.net`, egne scopes
(`threads_basic`, `threads_content_publish`), 60-dages levetid med
fornyelse — den rider IKKE på side-tokenet. `PLAN-social-expansion.md` påstår det
modsatte; dét afsnit er forkert.

Bluesky er den nemme: app-passwords, ingen OAuth, ingen portefølje.

### Secrets

Symmetriske navne uden et implicit standardmarked:

```
BLUESKY_DK_HANDLE      FB_DK_PAGE_ID            IG_DK_USER_ID        THREADS_DK_TOKEN
BLUESKY_UK_HANDLE      FB_UK_PAGE_ID            IG_UK_USER_ID        THREADS_UK_TOKEN
```

At `BLUESKY_HANDLE` er dansk og `BLUESKY_UK_HANDLE` britisk er den samme
asymmetri som `siteCountry()`'s danske fallback og de landeblinde læser-
forespørgsler — og den har kostet det samme hver gang.

## Status: hvad der er bygget (2026-09-22)

`pipeline/social/registry.ts` er lavet og i brug. Den kan:

- **oversætte (platform, land) → kanalnavn**, med de gamle navne bevaret
- **oversætte (platform, land, felt) → secret-navn**, nyt navn før gammelt
- **svare på om en konto er konfigureret**, ét sted
- **opremse alle mulige konti** ud fra `COUNTRIES` × platforme

Alle adaptere (`bluesky`, `facebook`, `instagram`), `delete-post.ts` og
`check-tokens.ts` læser nu deres secrets gennem registeret. **Det betyder at de
nye navne virker allerede i dag** — sæt `FB_DK_PAGE_ACCESS_TOKEN`, og den vinder
over `FB_PAGE_ACCESS_TOKEN` uden deploy, uden kodeændring. De gamle kan slettes
ét ad gangen bagefter.

### 🛑 Kanalnavnet er en databaseværdi

`social_posts.channel` gemmer navnet, og pacingen, kø-dybden, «hvornår postede vi
sidst» og dubletsikringen (`INSERT OR IGNORE` på article_id+channel) slår alle op
på det. **Omdøbes en eksisterende kanal, mister den sin historik, pacingen tror
den aldrig har postet, og hele arkivet lægges i kø igen.**

Derfor beholder de fire kanaler fra før i dag deres gamle navne — også det
usymmetriske `bluesky` for den danske konto. Nye konti får `<platform>_<land>`.
Testen holder præcis dét fast; den er ikke pedanteri.

## Det der mangler

1. **`facebook.ts` og `instagram.ts` skal blive fabrikker** parametriseret på
   land, som `bluesky.ts` allerede er, og `ALL_CHANNELS` skal genereres fra
   `allAccounts()`. Så er et nyt marked: opret konti, mint ét token, sæt
   secrets. Ingen kodeændring, intet deploy. **Det er hele gevinsten**, og det
   er den eneste kodeopgave tilbage.
2. **Systembruger for DK** — blokeret på at appen kan lægges i porteføljen
   (Meta afviste handlingen 22. september som «midlertidigt udelukket»).
3. **UK-side + UK-IG-konto** → `sa-publisher-uk`.
4. **Threads** pr. marked, med et fornyelsesjob til 60-dages-tokenet.

## Arbejdsdelingen med Claude

Grænsen er ikke en indstilling, den er permanent:

**Altid Mikkels:** oprette konti, logge ind på Facebook/Instagram, klikke OAuth-
samtykke, identitetsbekræftelse. Det er ~20 minutter pr. nyt marked, én gang.

**Claudes bagefter:** systembruger-tokens er præcis dét der kan uddelegeres — de
er ikke et menneske, de udløber ikke, og de overlever en adgangskodeændring. Med
dem plus Cloudflare-tokenet og `gh` kan Claude minte side-tokens, rotere
secrets, tilføje kanaler, køre og fejlsøge køen. Cloudflare-tokenet 22. september
viste mønsteret: tre runders gætteri blev til ét API-kald.

Undtagelsen der bliver ved med at gælde: **noget der udgiver uden for den normale
kø** spørges der om først. Køen der poster på sin plan er aftalt; et ad hoc-opslag
er ikke.
