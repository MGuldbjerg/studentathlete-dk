# Backtest — box-score + to-fase-pipeline

Deterministisk, **offline** validering af box-score-berigelsen og to-fase-genereringen
(faktaark → skriv → verificér) uden at vente på sæsonen og uden netværk/LLM/CF-creds.

```bash
npx tsx pipeline/backtest/run-backtest.ts                       # alle fixtures
npx tsx pipeline/backtest/run-backtest.ts --only normal-volleyball --verbose
npx tsx pipeline/backtest/run-backtest.ts --now 2025-02-15      # "mid-season"-kontekst
```

Exit-kode ≠ 0 hvis nogen fixture fejler (egnet til CI).

## Hvorfor det her virker uden at "sætte datoen"

Box-score- og to-fase-**kvalitet** afhænger af **kilde-indhold** (recap-tekst + box-score-side),
ikke af systemuret. Datoen påvirker kun (a) historie-*udvælgelsen* (recency-vinduet på
`discovered_at`) og (b) `getAcademicYear()` (class_year) — begge ortogonale til om box scoren
udtrækkes korrekt og om artiklen holder sig til fakta. Harnessen kalder derfor pipeline-
funktionerne **direkte på fixtures** og omgår SQL-recency-gaten. `--now` vises kun som kontekst.

## Arkitektur

| Fil | Rolle |
|-----|-------|
| `types.ts` | `Fixture`, `FixtureKind`, `FixtureExpectation`, scriptede `FixtureLLMResponses` |
| `fixtures.ts` | 4 syntetiske fixtures (inline HTML + scriptede LLM-svar) |
| `replay-deps.ts` | `makeReplayDeps()` → `BoxScoreDeps` (HTML pr. URL, `extractText` = ægte `extractMainText`) + `StubChain` (router på SYSTEM-tekst) |
| `scorecard.ts` | pr.-fixture-checks + pass/fail-tabel + numerisk konsistens |
| `run-backtest.ts` | orkestrator: buildFactSheet → enrichFactSheetWithBoxScore → skriv → verifyArticle → score |

**Ægte pipeline-funktioner der importeres** (ikke reimplementeret): `buildFactSheet`,
`renderFactSheet` (build-factsheet); `enrichFactSheetWithBoxScore`, `findBoxScoreUrl`,
`renderBoxScoreBlock` (box-score); `verifyArticle` (verify-article); `parseArticleOutput`
(parse-output); `newsPrompt` (prompts/news); `extractMainText` (extract-story);
`getAcademicYear` (class-year). Kun selve *skrive-orkestreringen* (renderFactSheet → newsPrompt
→ chain → parseArticleOutput) spejles, fordi `generate-articles.ts` holder den privat + skriver til D1.

**StubChain-routing** (én instans betjener alle 4 faser; rækkefølge vigtig — verify-systemet
nævner OGSÅ "fact sheet"): `fact-checker` → verify · `box score` → box-score-udtræk ·
`fact sheet` → faktaark · ellers → artikel.

## Fixtures (de fire scenarier)

1. **normal** — recap m. `/boxscore`-link + atlet på siden → stats flettes (`source:"boxscore"`), `fabrication_risk=low`.
2. **no_boxscore_link** — recap uden link → berigelse skipper, **ingen opdigtede tal**, low.
3. **athlete_absent** — link findes, men `found=false` → ingen tal flettet, artiklen opfinder intet, low.
4. **contradicting_number** — artiklen påstår et resultat der modsiger box scoren → verify **high** (+ numerisk konsistens fanger det opdigtede tal).

## Checks pr. fixture (scorecard)

- **link-detektion** — `findBoxScoreUrl(recapHtml)` vs forventet.
- **slutresultat** + **box-score-statline** — flettede box-score-værdier vs forventet.
- **fabrication_risk** — `verifyArticle`-verdict vs forventet.
- **numerisk-konsistens** — hvert tal i artiklen skal findes i faktaark+box-score-blok
  (0 opdigtede tal; for `contradicting_number` forventes ≥1, fanget af verify).

## RECORD MODE — rigtige in-season-fixtures (manuelt, ikke kørt her)

De syntetiske fixtures beviser logikken. For at validere mod **virkeligheden** udskiftes de
med snapshots fra en rigtig in-season-recap m. box-score-link:

1. **Find** en rigtig recap for en dansk atlet fra en aktiv sæson (basketball ~feb, football ~nov,
   fodbold ~okt) hvor recap-siden linker en box score.
2. **Snapshot recap-HTML** med plain fetch (links bevaret — som pipelinen ser den):
   `curl -A "StudentAthlete.dk/1.0" <recap-url> > recap.html`.
3. **Snapshot box-score-HTML** *renderet* (JS-tunge stats-sider kræver CF Browser Rendering).
   Sæt `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (+ D1-binding) og kald `renderPage(boxUrl)`
   fra `pipeline/lib/browser-render.ts`, eller gem `/content`-outputtet manuelt.
4. **Håndverificér** `expected`-blokken mod de rigtige sider: `linkDetected` (absolut box-score-URL),
   `finalScore`, `statLine` (atletens linje ordret), `fabricationRisk` (low for en tro artikel).
5. **Scriptede LLM-svar**: kør evt. den rigtige `ProviderChain` én gang og indsæt dens output i
   `llm.{factsheet,boxScore,article,verify}` — så bliver kørslen herefter gratis + deterministisk.
   (Alternativt: peg `run-backtest.ts` på en rigtig `ProviderChain` bag et flag for et live-tjek.)

Snapshots + håndverificeret `expected` er den eneste del der kræver et menneske/creds; resten kører offline.

## Live-fund (2026-06-09) — to rigtige in-season-kørsler

Kørt mod ægte Sidearm-recaps via `record-fixture.ts`: UC Davis (Svanholm) og Wyoming
(Malene Lind Pedersen, career-high-kamp).

- ✅ **Link-detektion virker live**: `findBoxScoreUrl` fandt korrekt `/boxscore.aspx?path=wbball&id=…`
  (legacy-href der 302-redirecter til SPA-stats-siden). Var aldrig før valideret live.
- ✅ **Box-score-tabellen renderer fint** — min første konklusion ("renderer ikke") var FORKERT:
  tabellen var der hele tiden (spillere + statkolonner). Svanholm stod bare ikke i den (bænkspiller,
  ingen statline) → `found:false` var korrekt. De to ÆGTE fejl var:
- 🛠️ **FIXET (1) — render-timeout**: prod-default `networkidle0`/30s *timeouter* på disse sider, fordi
  tracking-/annonce-pixels (statcollector, id5-sync, rlcdn) holder forbindelser åbne → netværket
  bliver aldrig helt roligt. Fix: `browser-render.ts` default → **`networkidle2` + 45s** (gælder også
  roster-scraping, samme sider).
- 🛠️ **FIXET (2) — extract-cap**: `extractMainText` gav ~404.000 tegn (mest navigation); spiller-
  tabellen lå ved tegn ~19.000, men `extractBoxScoreStats` så kun de første 6.000 → *alle* Sidearm-
  spillere gav `found:false`. Fix: ny `extractBoxScoreText()` målretter stat-tabellerne
  (404KB → ~2KB) + cap hævet til 16.000. **Dette var den dominerende fejl.**
- ✅ **Valideret end-to-end** (Wyoming/Pedersen, default prod-sti): statline udtrukket korrekt —
  `38 MIN · 8-13 FG · 3-7 3PT · 10-10 FT · 3 REB · 29 PTS`, slutresultat 60-53, `fabrication_risk: low`.
- ⚠️ **STADIG ÅBENT — gratis-model-format**: skrivefasen (Mistral) lavede titlen som `**fed**` i stedet
  for `# overskrift` → `parseArticleOutput` gav "Udkast uden titel". Verify-modellen ekkoede også
  prompt-tekst ind i `flags`. Hører til "betalt editor"-sporet, ikke box-score-gappet.

**Resterende anbefalinger**: (3) gør `parseArticleOutput` robust over for `**fed**`-titler;
(4) betalt LLM + structured outputs for skrive-/verify-faserne (fjerner format-/flag-flakiness).

Snapshots ligger i `snapshots/` (HTML gitignored — regenér med `record-fixture.ts`; `.fixture.json` beholdt).
