#!/usr/bin/env bash
# ============================================================================
# Kvalitetstjek af kladder — mekanisk først, derefter Claude.
#
# Mikkel bad om at hver kladde bliver gennemgået, så læringen går hurtigere.
# Kørslen er bygget til cron og gør ingenting (og koster ingenting) når køen er
# tom, så den kan køre ofte:
#
#   1. Mekanisk tjek af alle kladder — gratis, deterministisk, altid.
#   2. Claude læser hver kladde der ikke allerede er gennemgået i den form den
#      har nu. Bruger din Claude Code-adgang, ikke en API-nøgle, så $0-princippet
#      holder.
#   3. Discord-ping med de kladder der har fund.
#
# Kladder gennemgås igen når indholdet ÆNDRES (content_hash), ikke pr. kørsel.
#
# Cron (hver 3. time i dagtimerne):
#   0 7,10,13,16,19 * * *  cd ~/projekter/studentathlete-dk && ./scripts/review-drafts.sh >> logs/review-drafts.log 2>&1
#
# Miljø: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID
# (og DISCORD_WEBHOOK_URL hvis du vil have pinget). Kør uden argumenter, eller
# med --dry-run for at se hvad der ville blive gennemgået.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Cron kører en IKKE-interaktiv shell, og ~/.bashrc returnerer med vilje med det
# samme i den situation ("If not running interactively, don't do anything", linje
# 5-8). At source den ville altså ikke sætte noget. Derfor plukkes præcis de
# export-linjer vi har brug for. Er variablerne allerede sat (kørsel i din egen
# terminal), rører vi ikke ved dem.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -f "$HOME/.bashrc" ]; then
  eval "$(grep -E '^export (CLOUDFLARE_(API_TOKEN|ACCOUNT_ID|D1_DATABASE_ID)|DISCORD_WEBHOOK_URL)=' "$HOME/.bashrc")"
fi

# Cron har en minimal PATH (typisk /usr/bin:/bin), og node ligger under nvm — så
# hverken npx eller claude findes. Læg node-bin foran, hvis npx ikke kan ses.
if ! command -v npx >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do
    [ -d "$d" ] && PATH="$d:$PATH"
  done
  export PATH
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "! CLOUDFLARE_API_TOKEN mangler — kan ikke læse kladderne. Afbryder."
  exit 1
fi

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

mkdir -p logs/review

echo "=== $(date '+%Y-%m-%d %H:%M') kvalitetstjek af kladder"

# ── 1. Mekanisk ─────────────────────────────────────────────────────────────
npx tsx pipeline/generate/check-drafts.ts --notify || echo "  ! mekanisk tjek fejlede"

# ── 2. Claude ───────────────────────────────────────────────────────────────
IDS=$(npx tsx pipeline/generate/draft-pack.ts --list 2>/dev/null | tr -d '\r' | grep -E '^[0-9]+$' || true)

if [ -z "$IDS" ]; then
  echo "  Ingen kladder mangler en gennemgang."
  exit 0
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "  ! claude-CLI ikke fundet — springer Claude-gennemgangen over."
  exit 0
fi

for id in $IDS; do
  PACK="logs/review/pack-$id.md"
  OUT="logs/review/svar-$id.json"

  npx tsx pipeline/generate/draft-pack.ts --article "$id" > "$PACK" || { echo "  ! pakke #$id fejlede"; continue; }

  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry-run] ville sende kladde #$id til gennemgang ($(wc -c < "$PACK") tegn)"
    continue
  fi

  echo "  → gennemgår #$id"
  # Ingen værktøjer: pakken indeholder alt, og en gennemgang må ikke kunne
  # ændre noget i repoet eller i basen.
  if claude -p "$(cat "$PACK")" --allowed-tools "" > "$OUT" 2>logs/review/fejl-$id.txt; then
    npx tsx pipeline/generate/save-review.ts --article "$id" --file "$OUT" \
      || echo "  ! kunne ikke gemme gennemgang af #$id (se $OUT)"
  else
    echo "  ! claude fejlede på #$id (se logs/review/fejl-$id.txt)"
  fi
done

# ── 3. Ping ─────────────────────────────────────────────────────────────────
# Kun hvis webhooken findes lokalt. Gør den ikke det, sender workflowet
# «Kvalitetstjek af kladder» beskeden i stedet — gennemgangen ligger i D1, så
# pinget behøver ikke komme fra samme maskine som gennemgangen.
if [ "$DRY_RUN" != "1" ] && [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
  npx tsx pipeline/generate/notify-reviews.ts || true
else
  echo "  (ingen lokal DISCORD_WEBHOOK_URL — workflowet pinger)"
fi

echo "=== færdig"
