# Artikelkø — StudentAthlete.dk

## Mål
Generér feature-artikler for alle bekræftede atleter. Artikler gemmes som JSON i `pipeline/generate/output/` og importeres senere til D1.

## Output-mappe
`pipeline/generate/output/` — opret mappen hvis den ikke findes.

## Atleter der mangler artikler

| # | Navn | Sport | Universitet | Artikeltype | Status |
|---|------|-------|-------------|-------------|--------|
| 1 | Anders Haas | Football (Kicker) | University of Nebraska | feature | Afventer |
| 2 | Magnus Møller | Football (OL) | University of Illinois | feature | Afventer |
| 3 | Will Arnesen | Soccer (Forward) | Ohio State University | feature | Afventer |
| 4 | Jeppe Runge | Soccer (Attacker) | Penn State University | feature | Afventer |

## Kildekrav

Hver artikel SKAL referere til mindst én verificeret kilde fra `pipeline/seed/research-progress.md`. Opfind ALDRIG statistikker eller citater.

## Artikelformat

Se `CLAUDE.md` for designsystem og toneretning. Nøglepunkter:
- Dansk, editorial tone (The Athletic-stil)
- 600-1200 ord for features
- Inkludér: baggrund, sport, præstationer, universitet, fremtidsudsigter
- Kildesektion i bunden
