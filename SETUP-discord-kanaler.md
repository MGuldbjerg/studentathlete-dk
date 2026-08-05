# Discord: én kanal pr. land

**Bygget 2026-08-05.** Koden er klar og virker allerede uden kanalerne — den
falder tilbage til fælleskanalen. Det du skal gøre, er at oprette kanalerne og
lægge deres webhooks ind som GitHub-secrets. Ca. 5 minutter.

## Hvad der sendes hvor

| Besked | Hvornår | Kanal |
|---|---|---|
| 📝 **n kladder klar til gennemlæsning** | Umiddelbart efter generering, én besked pr. land, med de første fem overskrifter og et link **direkte ind i det lands kø** | Landets kanal |
| ❌ **Generering fejlede for n historie(r)** | Samme kørsel, hvis en historie fejlede | Landets kanal |
| 📊 **Ugentlig status** | Mandag 08:00 UTC, én rapport pr. land (artikler, historier→kladder, nye atleter, redigeringsgrad, totaler, hvor mange kladder der venter) | Landets kanal |
| ❌ Scrape, discovery, backup, drift-tjek m.fl. fejlede | Ved fejl | **Fælleskanalen** — de kører for alle lande på én gang, så beskeden hører ikke til ét land |

Linket i kladdebeskeden går til `/api/admin/land?code=UK&next=/admin`: det
**sætter landevælgeren** og åbner admin i den rigtige kø. Ét klik fra Discord
til den kø beskeden handler om.

## Sådan gør du (pr. land)

1. **Discord → din server → opret kanal**, fx `#dk-redaktion` og `#uk-redaktion`.
2. Kanalens **⚙️ → Integrationer → Webhooks → Ny webhook** → kopiér URL'en.
3. **GitHub → repoets Settings → Secrets and variables → Actions → New secret**:
   - Navn: `DISCORD_WEBHOOK_DK` (henholdsvis `DISCORD_WEBHOOK_UK`)
   - Værdi: webhook-URL'en

Navnet er `DISCORD_WEBHOOK_<LANDEKODE>` med landekoden fra `COUNTRIES` —
altså den samme kode som i `athletes.home_country`. Intet andet skal ændres.

## Test uden at vente på mandag

```bash
# Kun ét land, til din testkanal:
DISCORD_WEBHOOK_UK="https://discord.com/api/webhooks/…" \
  npx tsx pipeline/stats/weekly-digest.ts --country=UK
```

Eller kør workflowet `Ugentlig Discord-digest` manuelt i GitHub Actions
(`workflow_dispatch`) — det sender for alle lande.

## Når land nr. 3 kommer

To linjer: opret kanalen + secret'en, og tilføj `DISCORD_WEBHOOK_XX` i
`env:`-blokken i `.github/workflows/weekly-digest.yml` og
`generate-manual.yml`. GitHub kan ikke slå secrets op dynamisk, så den ene
linje pr. land er uundgåelig. Glemmer du den, forsvinder beskederne ikke —
de lander i fælleskanalen (se `pipeline/lib/notify.ts`).
