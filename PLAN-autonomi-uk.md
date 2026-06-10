# Plan: autonom pipeline → auto-publicering → UK

**Oprettet**: 2026-06-10. Bygger på SWOT-analyse (samme dato).
**Mål**: (1) Pipelinen kører autonomt frem til publicering; Mikkel validerer kun kladder. (2) Korte artikler auto-publiceres når data viser det er sikkert. (3) UK-klon når DK er valideret.

## Styrende princip

Det eneste led der ikke skalerer, er Mikkels review-tid. UK er ~8× DK's atletpulje.
Derfor: **gør review billigt → mål review-data en sæson → auto-publicér den sikre klasse → først derefter UK.**

---

## Fase 0 — Nu → sæsonstart (juni–august 2026)

| # | Punkt | Ejer | Status |
|---|-------|------|--------|
| 0.1 | `ANTHROPIC_API_KEY` som GitHub-secret | **Mikkel** | ⏳ Venter på kredit-åbning **15.–16. juni** — sæt den samme dag |
| 0.2 | Structured outputs på skriv+verificér (dræber bold-titel/tomme kladder + prompt-ekko i flags) | Pipeline | Efter 0.1 (giver mest med Claude) |
| 0.3 | Discord-ping når `MAX_PENDING_DRAFTS` blokerer generering | Kode | I gang 2026-06-10 |
| 0.4 | Review-ergonomi i admin: kø sorteret efter fabrication_risk + faktaark vist ved siden af kladden | Kode | I gang 2026-06-10 |
| 0.5 | Statiske sider: Om, Kontakt, AI-brug (E-E-A-T + GDPR-kontakt) | Kode → Mikkel redigerer | Udkast klar 2026-06-10 |
| 0.6 | Cloudflare Access på `/admin` (fjerner token-i-URL) | **Mikkel** (dashboard) + kode | Guide klar 2026-06-10 |

**Accept (fase 0 færdig når):** et kladde-review tager < 2 min for kort nyhed; ingen tavse pipeline-stop; admin bag CF Access; siderne ligger live.

## Fase 1 — In-season validering (august–november 2026)

| # | Punkt | Ejer |
|---|-------|------|
| 1.1 | Kør fuld DK-sæsoncyklus; følg box-scores v2 + to-fase live | Pipeline |
| 1.2 | Optag rigtige backtest-fixtures (RECORD MODE, `pipeline/backtest/README.md`) | Kode + Mikkel håndverificerer |
| 1.3 | **Log hver review-beslutning**: godkendt-som-er / redigeret / afvist + artikeltype + fabrication_risk (lille tabel + auto-log fra admin-handlinger) | Kode |
| 1.4 | Månedlig opgørelse: % godkendt-uden-redigering pr. (artikeltype × risiko) — i weekly-digest | Kode |

**Accept:** ≥ 8 ugers reviewdata; backtest-fixtures fra rigtige kampe.

## Fase 2 — Auto-publicering + parametrisering (oktober–december 2026)

| # | Punkt | Ejer |
|---|-------|------|
| 2.1 | Definér auto-publish-gate **empirisk** fra 1.3-data. Kandidatklasse: `article_type='news'` + `fabrication_risk='low'` + box-score-belagte tal. Tærskel: ≥ 95 % godkendt-uden-redigering over flere uger | Mikkel beslutter på data |
| 2.2 | Implementér gate som opt-in: auto-publish kun for klassen; alt andet forbliver kladde. Discord-besked ved hver auto-publicering (fortrydelsesknap = unpublish i admin) | Kode |
| 2.3 | **Country-profile refactor**: udtræk `CountryProfile`-config (byliste/markører, hometown-klassifikator, slug-tegnmap, UI-strenge, sport-labels, prompts, class-year). DK-adfærd skal replaye identisk i backtesten | Kode |
| 2.4 | UK-matcher designet til tvetydighed: almindelige britiske navne kræver hometown- ELLER sport-bekræftelse; forvent højere LLM-verifikationsforbrug end DK | Kode |

**Accept:** auto-publish kører i DK uden tilbagekaldelser i 4 uger; backtest grøn efter refactor.

## Fase 3 — UK-launch (start 2027, inden forårssæsonen)

| # | Punkt | Ejer |
|---|-------|------|
| 3.1 | UK-domæne + CountryProfile UK + seed UK-rosters (~760 NCAA-atleter) | Kode + Mikkel (domænekøb) |
| 3.2 | CF Access genbruges (3.1 forudsætter 0.6) | — |
| 3.3 | **Launch-gate: auto-publish-tier SKAL være bevist i DK først** — 8× volumen med fuldt manuelt review er ikke holdbart | Beslutning |

## Risici fra SWOT → hvor de håndteres

- **UK-navnekollision** (Jack Smith-problemet) → 2.4
- **Fri-LLM-kvalitet** (bold-titler, prompt-ekko) → 0.1 + 0.2
- **Tavse stop** (MAX_PENDING_DRAFTS) → 0.3
- **Review-flaskehals** → 0.4 (billigere) + 2.1–2.2 (mindre af det)
- **Libel/GDPR** → 0.5 (kontakt/takedown + AI-deklaration) + human gate på alt over 'low'
- **Admin-token-læk** → 0.6
- **Sidearm/render/fri-tier-skørhed** → overvåges via fejl-notifikationer; backtest-fixtures (1.2) gør parser-ændringer testbare
- **SEO/AI-indhold** → 0.5 (E-E-A-T-sider); allerede: JSON-LD, semantisk HTML, SEO-regler i prompts

## Bevidst udskudt

- Billedgenerering (modul 8) og social automation (modul 7): efter fase 1 — distribution før valideret kvalitet er omvendt rækkefølge
- Canada (~20× DK): efter UK har kørt en sæson
- NJCAA/NAIA-skoler uden website: lav dansk-densitet, uændret udskudt
