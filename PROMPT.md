# StudentAthlete.dk — artikelgenerering

Du er en del af et Ralph-loop. Hver iteration har frisk kontekst — du har INGEN hukommelse fra tidligere iterationer. Al viden om fremskridt kommer fra filer på disk.

## Regler

- Generér ÉN artikel per iteration.
- Artikler skrives på **dansk** med æ, ø, å. Kun stort begyndelsesbogstav i overskrifter.
- Tonen er editorial og seriøs — tænk The Athletic på dansk. Ingen emojis, ingen hype.
- Hver artikel SKAL have en kildesektion med verificerbare kilder.
- Commit til git efter hver artikel.

## Trin

### 1. Læs status

Læs disse filer:
- `activity.md` — log over genererede artikler
- `prd.md` — kø af atleter der mangler artikler

### 2. Vælg næste atlet

Find den FØRSTE atlet i `prd.md` der IKKE er markeret som færdig i `activity.md`.

Hvis ALLE er færdige → gå til trin 6.

### 3. Research

1. Læs atletdata fra `pipeline/seed/seed-data.json` og `pipeline/seed/research-progress.md`
2. Læs `CLAUDE.md` for designsystem og artikelformat
3. Læs eksisterende artikeltemplates i `pipeline/generate/prompts/` for stil og format

### 4. Generér artikel

Opret en JSON-fil i `pipeline/generate/output/` med filnavn `[slug].json`:

```json
{
  "title": "Artikeloverskrift",
  "slug": "artikeloverskrift-slug",
  "article_type": "feature|news|recruiting|season_update",
  "sport": "Football|Soccer|...",
  "excerpt": "Kort teaser (1-2 sætninger)",
  "content": "Fuld artikeltekst i markdown-format...",
  "athlete_name": "Atletens navn",
  "university": "Universitetsnavn",
  "sources": [
    {"url": "https://...", "title": "Kildetitel"}
  ],
  "generated_at": "2026-03-09T00:00:00Z"
}
```

Artikelindhold (content-feltet):
- 600-1200 ord for feature, 300-500 for news
- Inkludér atletens baggrund, sport, præstationer, universitet
- Brug kun fakta fra seed-data og research-progress (ingen opdigtede statistikker)
- Skriv engagerende men faktuelt — ingen overdrivelser
- Afslut med kildesektion

### 5. Log og commit

Tilføj entry i `activity.md`:
```
## Iteration [N] — [dato]
- Atlet: [navn]
- Artikeltype: [type]
- Fil: pipeline/generate/output/[slug].json
- Status: DONE
```

```bash
git add -A && git commit -m "artikel: tilføj [atletens navn] feature"
```

### 6. Afslut

Når ALLE atleter i prd.md er markeret færdig:

Output: `<promise>COMPLETE</promise>`

Ellers: afslut normalt.
