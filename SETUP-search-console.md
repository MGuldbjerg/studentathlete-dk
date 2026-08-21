# Search Console — opsætning (service-konto)

Rapporten (`pipeline/report/search-console.ts`) henter tal for **begge** sites i
samme kørsel, så .dk og .co.uk kan sammenlignes. Den bruger en service-konto —
ingen browser-login, ingen udløbende session, og den kan køre fra cron.

## Det du skal gøre (én gang, ~5 minutter)

### 1. Verificér propertyen (KUN et menneske kan dette)

En service-konto kan læse en property, men **aldrig oprette eller verificere**
den. `student-athlete.co.uk` skal altså verificeres i Search Console først.

Nemmest her: **domæne-property + DNS-TXT**, fordi zonen allerede ligger i
Cloudflare. Search Console → tilføj property → «Domæne» → indsæt TXT-posten i
Cloudflare → verificér. En domæne-property dækker både apex og `www`, og både
http og https — de fire varianter samles i ét datasæt.

> Vil du hellere bruge HTML-tag-metoden, så sig til: så lægger jeg et
> verifikationsfelt i landeprofilen, og token'et rendres i sitets `<head>`.

### 2. Google Cloud: API + service-konto

1. [Google Cloud Console](https://console.cloud.google.com/) → vælg eller opret
   et projekt.
2. **APIs & Services → Library** → søg «Google Search Console API» → **Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
   Navn fx `search-console-reader`. Rolle i projektet: **ingen** (den skal ikke
   have adgang til Google Cloud, kun til Search Console).
4. Åbn service-kontoen → **Keys → Add key → Create new key → JSON** → hent filen.
   Noter e-mailen; den ser ud som
   `search-console-reader@<projekt>.iam.gserviceaccount.com`.

### 3. Giv service-kontoen adgang til propertyen

Search Console → propertyen → **Indstillinger → Brugere og tilladelser →
Tilføj bruger** → indsæt service-kontoens e-mail.

| Tilladelse | Rækker til |
|---|---|
| **Begrænset** | at læse søgetal, sider, sitemap-status |
| **Fuld** | dét + at INDSENDE sitemap (`--submit-sitemap`) |

Gør det for **begge** properties (.dk og .co.uk), ellers rapporterer kørslen kun
på den ene — og siger det højt.

### 4. Læg nøglen hvor rapporten finder den

```bash
mkdir -p ~/.config/gcloud
mv ~/Downloads/<projekt>-<hash>.json ~/.config/gcloud/sa-searchconsole.json
chmod 600 ~/.config/gcloud/sa-searchconsole.json
echo 'export GOOGLE_SEARCH_CONSOLE_KEY=$HOME/.config/gcloud/sa-searchconsole.json' >> ~/.bashrc
```

Til GitHub Actions: læg hele JSON-indholdet i secreten
`GOOGLE_SEARCH_CONSOLE_KEY_JSON` i stedet — scriptet tager imod begge.

## Sådan bruges den

```bash
./scripts/search-console.sh                      # begge sites, 28 dage, top 10 søgninger
./scripts/search-console.sh --site=uk --days=7   # kun UK, sidste uge
./scripts/search-console.sh --dimension=page --limit=25
./scripts/search-console.sh --sitemaps           # er sitemappet hentet, og hvor meget er indekseret?
./scripts/search-console.sh --submit-sitemap     # indsend sitemap.xml (kræver «Fuld»)
./scripts/search-console.sh --inspect https://student-athlete.co.uk/football/…
./scripts/search-console.sh --json               # til videre behandling
```

## Fredagsgennemgangen (fast arbejdsgang)

```bash
./scripts/search-console.sh --opportunities
./scripts/search-console.sh --opportunities --min-impressions=5 --days=90   # tidligt, tyndt datagrundlag
./scripts/search-console.sh --opportunities --min-position=3 --max-position=20
```

Finder **statiske sider** (forside, arkiv, sportslandingssider, guider,
redaktionelle sider) med søgeord i **position 5-15** og mindst 10 visninger.
Artikler, atlet- og skoleprofiler er bevidst UDE: en artikel handler om én kamp
og skal ikke skrives om for et søgeords skyld.

**Tallene er ikke svaret.** Scriptet finder kandidater; vurderingen er
redaktionel og laves af et menneske (eller Claude, som forslag):

1. Handler siden FAKTISK om det søgeord? Hvis nej, drop det — også når volumen
   er fristende. Mikkels eksempel: *Temple University* handler om universitetet,
   ikke om templer.
2. Er der reelt noget at hente? Position 11 på et hovedord som «ncaa» er en
   anden opgave end position 6 på et langt, præcist søgeord.
3. Hvad ville ændringen KOSTE læseren? En side der skrives om for at ramme et
   ord, læses dårligere.

**Ændringer kræver en godkendt plan** (se `CLAUDE.md`). Gennemgangen afleverer et
forslag; den retter ikke selv.

## Det du skal vide om tallene

- **Data halter 2-3 døgn.** Vinduet slutter derfor i går, ikke i dag — ellers
  ville hver kørsel se ud som om trafikken faldt.
- **En ny property har ingen historik.** Search Console begynder at samle data
  den dag propertyen oprettes; den kan ikke se bagud. Derfor er det værd at
  oprette den nu, selvom .co.uk knap nok er indekseret endnu.
- **`type: "web"`**: rapporten tæller søgeresultater, ikke Discover/News. Ellers
  blandes to helt forskellige trafikkilder i samme tal.
- **403 betyder næsten altid manglende brugeradgang**, ikke en forkert nøgle —
  se trin 3.
- **Indexing API kan IKKE bruges** til at få almindelige sider indekseret; den
  gælder kun job-opslag og livestreams. Sitemap + intern linkning er vejen.
