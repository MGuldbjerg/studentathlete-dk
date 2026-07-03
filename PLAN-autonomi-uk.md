# Plan: autonom pipeline → menneskelig godkendelse → UK

**Oprettet**: 2026-06-10. **Omskrevet 2026-07-03** efter Mikkels strategi-beslutninger 2026-07-02.
**Mål**: (1) Pipelinen kører autonomt frem til publicering; Mikkel (senere: en landsredaktør) validerer kladder. (2) UK-klon når DK er valideret. (3) Danmark forbliver gratis-drevet proof of concept.

## Styrende beslutninger (2026-07-02, erstatter tidligere plan)

1. **INGEN auto-publicering — nogensinde.** Menneskelig slutgodkendelse af hver artikel er permanent redaktionel politik ("every article human-approved" er sitets tillids-differentiator mod AI-slop). Tidligere fase 2 (empirisk auto-publish-gate) er ANNULLERET.
2. **Skalerings-svaret er landsredaktør-modellen, ikke automatisering af review.** UK ~8× volumen bæres af en frivillig/freelance UK-redaktør, der reviewer UK-kladder med samme værktøjer (faktaark-panel, risiko-sortering, FØLSOM-badges). Review-loggen (1.3) er EVIDENSEN der beviser at et review koster ~2 min — det der skal til for at rekruttere og stole på en landsredaktør.
3. **Danmark kører på $0.** Ingen betalte LLM-nøgler (ANTHROPIC_API_KEY-punktet er droppet — kreditterne kom aldrig, og gratis-princippet ER pitchen: "hele landet kører uden marginalomkostninger"). Kvalitetsværktøjet er JSON-mode structured outputs på gratis-kæden (Mistral/Groq/Gemini) — BYGGET 2026-07-02.
4. **Canada er nedprioriteret på ubestemt tid.** Værdien af produktet er proportional med DÆKNINGS-GABET mellem US-medier og hjemlandet. Canadiske medier dækker allerede NCAA → lille gab. UK og DK har ~nul dækning af egne atleter → totalt gab. Markedsstørrelse måles i UDÆKKEDE atleter, ikke atleter.
5. **Kildepolitik**: team-/skolesider er ikke-kommercielle og fair at bygge på; kommercielle mediers tekst bruges kun jf. citatskik (ét citat, navngiv mediet, fakta til faktaark). Langsigtede søjler = menneskelige interviews/features fra frivillige/freelancere (byline-infrastruktur BYGGET 2026-07-03: author_role, Ai-disclaimer skjules for 'human', YouTube-embeds til interviews).
6. **Kommercielt spor = leads, ikke annoncer.** Første sites NSSA-aftale (15% af fee pr. formidlet atlet) genoplives NÅR motoren er bevist in-season. Attribution-fundamentet er BYGGET (migration-028: /spil-i-usa-formular → leads-tabel m. source_path/referrer; admin → Leads). Fanatics-affiliate forbliver spec'et sekundærspor.

## Fase 0 — færdiggjort (juni–juli 2026)

| # | Punkt | Status |
|---|-------|--------|
| 0.2′ | Structured outputs (JSON-mode) på skriv+verificér — GRATIS-kæden, ikke Claude | ✅ 2026-07-02 |
| 0.3 | Discord-ping når MAX_PENDING_DRAFTS blokerer | ✅ |
| 0.4 | Review-ergonomi: risiko-sorteret kø + faktaark-panel + FØLSOM-badge | ✅ (badge 2026-07-02) |
| 0.5 | Statiske sider (Om/Kontakt/AI-brug) + presseetik + ai-brug | ✅ |
| 0.6 | Cloudflare Access på /admin | ✅ 2026-06-23 |
| 0.7 | Presseetik-værn: sensitive-detektor (crime/discipline/eligibility/personal) + skade-tidslinje-regel (system #23 + verify-eskalering) | ✅ 2026-07-02 |
| 0.8 | Synlige rettelser (correction_note → "Rettet [dato]"-boks) | ✅ 2026-07-02 |
| 0.9 | Review-beslutningslog (publish/slet → approved_as_is/edited/rejected; i weekly digest) | ✅ 2026-07-02 |

**Sæsonstarts-hærdning — FÆRDIG 2026-07-03 (commit 2209806):**
- [x] **Pre-render af kampkort i fuld 1200×630** — via **D1-blobs**, ikke R2 (R2 kræver dashboard-aktivering på kontoen, API-fejl 10042 → Mikkels næste-uge-liste hvis ønsket; migrering er lille). `pipeline/render/render-cards.ts` (satori+resvg i Node) + delt element-træ `src/lib/og-card.ts` + `card_blobs` (migration-029); `/api/og` serverer blob først, on-the-fly 600×315 som fallback. Alle 18 kort uploadet; timevis `render-cards.yml` (:05). CARD_VERSION=8
- [x] CI: tsc (src+pipeline) + alle 10 testsuiter på push/PR (`ci.yml`)
- [x] Ugentlig D1-backup: `weekly-backup.yml` (lørdag 02:00, gzip-artefakt 90 dage)
- [x] Drift-tjek: seed-hash-stempel i site_content + dagligt `content-drift.yml` → Discord ved kode-ændring uden re-seed
- Kendt SEO-småting (ikke fikset): catch-all'en serverer 404-siden med HTTP 200 (soft-404) for ukendte slugs — ret ved lejlighed

## Fase 1 — In-season validering (august–november 2026)

| # | Punkt | Ejer |
|---|-------|------|
| 1.1 | Kør fuld DK-sæsoncyklus; følg box-scores v2 + to-fase + JSON-mode live | Pipeline |
| 1.2 | Optag rigtige backtest-fixtures (RECORD MODE) | Kode + Mikkel håndverificerer |
| 1.3 | Review-log samler data automatisk (BYGGET) — månedlig opgørelse i weekly digest | ✅ kører |
| 1.4 | Mål: median review-tid < 2 min/kladde; redigeringsgrad-trend | Mikkel aflæser digest |
| 1.5 | Newsletter ("Danskere i USA — ugens resultater") fra digest-data → ejet publikum + retention-metrik (visitor-hash kan bevidst ikke måle genbesøg) | Kode (næste større byggeri) |
| 1.6 | NSSA-genpitch NÅR motoren er bevist: definér bevis-metrikker (guide-trafik, leads, artikelkadence) FØR pitch | Mikkel |

**Accept:** ≥ 8 ugers reviewdata; backtest-fixtures fra rigtige kampe; leads-funnel målbar.

## Fase 2 — Parametrisering (efterår/vinter 2026)

| # | Punkt |
|---|-------|
| 2.1 | **Country-profile refactor** (vigtigste engineering-aktiv): CountryProfile-config (byliste/markører, hometown-klassifikator, slug-tegnmap, UI-strenge, sport-labels, prompts, class-year). DK-adfærd skal replaye identisk i backtesten |
| 2.2 | UK-matcher designet til tvetydighed: almindelige britiske navne kræver hometown- ELLER sport-bekræftelse; forvent højere LLM-verifikationsforbrug end DK |
| 2.3 | Bidragyder-infrastruktur modnes efter behov: roller/indsendelsesflow når første frivillige melder sig (author_role-fundamentet findes) |

**Accept:** backtest grøn efter refactor; DK kører uændret.

## Fase 3 — UK-launch (2027, inden forårssæsonen)

| # | Punkt |
|---|-------|
| 3.1 | UK-domæne + CountryProfile UK + seed UK-rosters (~760 NCAA-atleter) |
| 3.2 | CF Access genbruges; UK-redaktør får egen adgang |
| 3.3 | **Launch-gate: en UK-landsredaktør (frivillig/freelance) er rekrutteret og oplært** — 8× volumen med Mikkel som eneste reviewer er ikke holdbart, og auto-publish er fravalgt |
| 3.4 | UK-libel-disciplin: sensitive-detektoren er OBLIGATORISK gate; truth/public-interest-forsvaret hviler på kildebelagte faktaark + synlige rettelser (findes) |

## Risici → hvor de håndteres

- **Fri-LLM-kvalitet** (fed-titel/tomme kladder/prompt-ekko) → JSON-mode ✅ + parse-fallback ✅
- **Negative historier om navngivne unge** → sensitive-detektor ✅ + nøgternheds-instruks ✅ + FØLSOM-badge ✅
- **Opdigtede skades-tidslinjer** → system-regel 23 ✅ + verify-eskalering ✅
- **Review-flaskehals** → billigt review ✅ + landsredaktør-model (3.3)
- **Libel/GDPR** → presseetik-sider ✅ + human gate på ALT ✅ + synlige rettelser ✅
- **Sidearm/render/fri-tier-skørhed** → fejl-notifikationer ✅; R2 pre-render (udestående); backtest-fixtures (1.2)
- **D1-override skygger kode-tekster** → drift-tjek (udestående)
- **Foto-rettigheder** (headshots m. kredit ≠ tilladelse) → standard-mail til skolernes SID om blanket permission, efterhånden som skoler dækkes (lav friktion, ikke bygget)

## Bevidst fravalgt / udskudt

- **Auto-publicering: FRAVALGT permanent** (2026-07-02)
- **Canada: nedprioriteret** — lavt dæknings-gab (2026-07-02)
- **Anthropic-nøgle/betalte LLM'er: droppet** — $0-princip (2026-07-02)
- **X (Twitter): død** — API'et findes ikke længere på gratis-vilkår; secrets slettet 2026-07-02. Kanaler: Bluesky ✅ live · Facebook: kode klar, mangler Meta-app + page-token · Instagram: samme Meta-app, kampkort-feed-posts + /ig-bio-link (side BYGGET 2026-07-03)
- **Hashtags: pauset** (Mikkel 2026-06-25)
- NJCAA/NAIA-skoler uden website: lav dansk-densitet, uændret udskudt
- **Games-streaming: umuligt juridisk** (rettigheder) — men "Sådan ser du kampen"-modul (links til officielle gratis D2/D3-streams) er lovligt og værdifuldt; idé-parkeret til sæsonen
