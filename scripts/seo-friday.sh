#!/usr/bin/env bash
# ============================================================================
# FREDAGSGENNEMGANGEN — statiske sider der ligger lige under top 3.
#
# Mikkels arbejdsgang (2026-08-21): «hver fredag, gå de statiske sider igennem
# (ikke artikler) og find søgeord hvor siden ligger 5-15. Vurdér om siden ville
# have gavn af at arbejde med dem for at komme i top 3.»
#
# To halvdele:
#   1. DATA — `search-console.ts --opportunities`. Gratis, deterministisk.
#   2. VURDERING — Claude læser kandidaterne OG siderne, og skriver et FORSLAG.
#      Bruger din Claude Code-adgang (samme mønster som review-drafts.sh).
#
# Den retter ALDRIG noget. Reglen står i CLAUDE.md: SEO-arbejde kræver en plan,
# du har godkendt. Kørslen afleverer altså et oplæg til den plan — ikke andet.
#
# Cron (fredag 01:15; er maskinen slukket, springes ugen over):
#   15 1 * * 5  cd ~/projekter/studentathlete-dk && ./scripts/seo-friday.sh >> logs/seo-friday.log 2>&1
#
# Kør den gerne i hånden når som helst:  ./scripts/seo-friday.sh
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Cron sourcer ikke ~/.bashrc (den returnerer tidligt i ikke-interaktive
# shells), så nøglerne plukkes eksplicit. Er de sat i forvejen, røres de ikke.
if [ -z "${GOOGLE_SEARCH_CONSOLE_KEY:-}" ] && [ -f "$HOME/.bashrc" ]; then
  eval "$(grep -E '^export (GOOGLE_SEARCH_CONSOLE_KEY(_JSON)?|DISCORD_WEBHOOK_URL)=' "$HOME/.bashrc")"
fi

if ! command -v npx >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do
    [ -d "$d" ] && PATH="$d:$PATH"
  done
  export PATH
fi

DATE=$(date +%F)
OUT_DIR="logs/seo"
DATA="$OUT_DIR/kandidater-$DATE.txt"
PROPOSAL="$OUT_DIR/forslag-$DATE.md"
mkdir -p "$OUT_DIR"

echo "=== $(date '+%Y-%m-%d %H:%M') fredagsgennemgang"

if [ -z "${GOOGLE_SEARCH_CONSOLE_KEY:-}${GOOGLE_SEARCH_CONSOLE_KEY_JSON:-}" ]; then
  echo "! Ingen Search Console-nøgle — se SETUP-search-console.md. Afbryder."
  exit 1
fi

# ── 1. Data (begge sites; UK melder bare «ingen data» indtil det har trafik) ─
npx tsx pipeline/report/search-console.ts --opportunities --limit=10 > "$DATA" 2>&1
DATA_STATUS=$?
cat "$DATA"

if [ "$DATA_STATUS" != "0" ]; then
  echo "! Datahentningen fejlede — springer vurderingen over."
  exit 1
fi

# Ingen kandidater = ingen vurdering. Gennemgangen skal koste nul i en stille uge.
if ! grep -q "visninger i båndet" "$DATA"; then
  echo "  Ingen sider i position 5-15 i denne uge. Ingen vurdering nødvendig."
  exit 0
fi

# ── 2. Vurdering ────────────────────────────────────────────────────────────
if ! command -v claude >/dev/null 2>&1; then
  echo "  ! claude-CLI ikke fundet — kandidaterne ligger i $DATA."
  exit 0
fi

PROMPT="Du er SEO-rådgiver for to nyhedssites om student athletes i USA:
StudentAthlete.dk (dansk) og Student-Athlete.co.uk (britisk).

Nedenfor er ugens kandidater fra Search Console: STATISKE sider (forside,
arkiv, sportslandingssider, guider, redaktionelle sider — ALDRIG artikler)
med søgeord i position 5-15.

MIKKELS REGLER, som du skal arbejde inden for:
1. INDHOLDET BESTEMMER. Giver et søgeord mening teknisk, men ikke for det
   siden faktisk handler om, så drop det — også når volumen er fristende.
   Hans eget eksempel: for «Temple University» peger relaterede søgeord på
   templer og religiøse templer, men siden handler om universitetet.
2. Du foreslår. Du ændrer ALDRIG noget, og du beder ikke om at måtte.
   Ændringer kræver en plan Mikkel har godkendt.

Hent gerne siden selv (URL'erne står i data) for at se hvad den faktisk
indeholder, før du vurderer.

Skriv et kort notat på DANSK, maks 400 ord:
- For hver kandidat-side: ét afsnit med din anbefaling — ARBEJD MED DET,
  DROP DET, eller VENT (for lidt data) — og hvorfor.
- Vær konkret om hvad der i givet fald skulle ændres (titel, indledning, et
  afsnit der mangler, intern linkning), og hvad det ville koste læseren.
- Sig det tydeligt hvis der intet er værd at gøre. En uge uden anbefaling er
  et gyldigt resultat.

DATA:
$(cat "$DATA")"

echo "  → sender kandidaterne til vurdering"
# Ingen værktøjer ud over web-opslag: vurderingen må læse sider, ikke ændre dem.
if claude -p "$PROMPT" --allowed-tools "WebFetch" > "$PROPOSAL" 2>"$OUT_DIR/fejl-$DATE.txt"; then
  echo "  Forslag skrevet: $PROPOSAL"
  cat "$PROPOSAL"
else
  echo "  ! vurderingen fejlede (se $OUT_DIR/fejl-$DATE.txt)"
  exit 1
fi

# ── 3. Ping ─────────────────────────────────────────────────────────────────
if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
  SUMMARY=$(head -c 1500 "$PROPOSAL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  curl -s -X POST "$DISCORD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"embeds\":[{\"title\":\"🔎 Fredagens SEO-gennemgang\",\"description\":$SUMMARY,\"color\":3447003,\"footer\":{\"text\":\"Forslag — kræver din godkendelse før noget ændres\"}}]}" \
    >/dev/null || echo "  (Discord-ping fejlede)"
fi

echo "=== færdig"
