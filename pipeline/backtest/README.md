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

## Live-fund (2026-06-09) — første rigtige in-season-kørsel

Kørt mod en ægte UC Davis WBB-recap (triple-OT vs UC San Diego, Lena Svanholm) via
`record-fixture.ts`. Resultater + fund:

- ✅ **Link-detektion virker live**: `findBoxScoreUrl` fandt korrekt `/boxscore.aspx?path=wbball&id=28395`
  (legacy-href der 302-redirecter til SPA-stats-siden). Dette var aldrig før valideret live.
- ✅ **Slutresultat udtrækkes**: scoreboardet renderer → "88-80" korrekt udtrukket.
- ❌ **Box-score-STATLINE renderer IKKE**: selv med `networkidle2` + 50s timeout indeholder den
  renderede HTML *kun* shell + scoreboard — spiller-stat-tabellen kommer aldrig i DOM'en
  (Svanholm optræder 0 gange). Prod kalder `renderPage` med **default `networkidle0`/30s**, der
  *timeouter helt* på disse tunge Sidearm-box-score-SPA'er → box-score-stat-berigelse fejler-open
  (springes over) for den mest udbredte platform. **Dette er backtestens vigtigste fund.**
- ⚠️ **Gratis-model-format**: skrivefasen (Mistral) lavede titlen som `**fed**` i stedet for `# overskrift`
  → `parseArticleOutput` gav "Udkast uden titel" + tom brødtekst. (Bemærk: harness'ens `WRITE_SYSTEM`
  er minimal; prod-skrive-prompten i `generate-articles.ts` er rigere — bekræft om prod rammer samme.)
- ⚠️ **Gratis-verify-flakiness**: verify-modellen ekkoede prompt-tekst ind i `flags`.

**Anbefalede fixes** (separat arbejde, ikke gjort her): (1) render box scores med `waitForSelector`
på stat-tabellen + længere timeout, eller skift box-score-kilde til en ikke-SPA-endpoint; (2) hæv
6000-tegns-cap'et i `extractBoxScoreStats` og/eller målret tekstudtrækket mod stat-tabellen;
(3) gør `parseArticleOutput` robust over for `**fed**`-titler; (4) genovervej fri-vs-betalt LLM
for skrive-/verify-faserne (jf. format-compliance ovenfor).

Snapshots ligger i `snapshots/` (HTML gitignored — regenér med `record-fixture.ts`; `.fixture.json` beholdt).
