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
# --------------------------------------------------------------------------
# MED `--fix`: ret og afvis også (2026-09-10, bedt om af Mikkel)
# --------------------------------------------------------------------------
# «check and correct each unchecked draft … so I only need to focus on what
# works». Efter gennemgangen kommer derfor to skridt mere:
#
#   4. Dom `fix`    → Claude skriver kladden om mod sin egen kilde. Kladden
#                     bliver IKKE udgivet; den venter stadig på dig i /admin.
#   5. Dom `reject` → kladden afvises: teksten gemmes i `review_log`, artiklen
#                     slettes, og Discord får besked. Det er den ENESTE
#                     uigenkaldelige handling i kørslen — derfor siges den højt.
#
# ÉN maskinrettelse pr. genereret kladde (spærren ligger i `fix-pack.ts`).
# Rettelsen ændrer indholdet, så næste kørsel gennemgår den rettede tekst — men
# retter den ikke igen. Er den stadig gal, er fundene dine.
#
# `--fix` kører kun fra natjobbet. Dagens kørsler er læse-kørsler: du skal kunne
# åbne /admin midt på dagen og se den kladde du så i morges.
#
# Cron / Task Scheduler:
#   0 7,10,13,16,19 * * *  ./scripts/review-drafts.sh              (kun tjek)
#   01:00 dagligt          ./scripts/review-drafts.sh --fix        (tjek + ret)
#
# Miljø: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID
# (og DISCORD_WEBHOOK_URL hvis du vil have pinget). Kør uden argumenter, eller
# med --dry-run for at se hvad der ville blive gennemgået og rettet.
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
DO_FIX=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --fix)     DO_FIX=1 ;;
    *) echo "! ukendt argument: $arg (brug --fix og/eller --dry-run)"; exit 1 ;;
  esac
done

mkdir -p logs/review

echo "=== $(date '+%Y-%m-%d %H:%M') kvalitetstjek af kladder$([ "$DO_FIX" = 1 ] && echo ' (med rettelse)')"

# ── 1. Mekanisk ─────────────────────────────────────────────────────────────
npx tsx pipeline/generate/check-drafts.ts --notify || echo "  ! mekanisk tjek fejlede"

# ── 2. Claude ───────────────────────────────────────────────────────────────
IDS=$(npx tsx pipeline/generate/draft-pack.ts --list 2>/dev/null | tr -d '\r' | grep -E '^[0-9]+$' || true)

if [ -z "$IDS" ]; then
  echo "  Ingen kladder mangler en gennemgang."
else
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
fi

# ── 4-5. Ret og afvis ───────────────────────────────────────────────────────
# Kun med --fix, og kun på kladder hvor gennemgangen handler om PRÆCIS det
# indhold de har nu (spærren ligger i fix-pack.ts, ikke her).
if [ "$DO_FIX" = "1" ]; then
  # Stderr gemmes IKKE væk her. Fejler listen (fx fordi migration 051 ikke er
  # kørt, og kolonnen claude_fixed_content ikke findes), bliver den tom — og en
  # tom liste ser præcis ud som «ingen kladder skal rettes». Den forskel skal i
  # loggen, ellers kan natten se ud som om alt var i orden.
  LISTERR="logs/review/ret-liste-fejl.txt"
  TODO=$(npx tsx pipeline/generate/fix-pack.ts --list 2>"$LISTERR" | tr -d '\r' | grep -E '^[0-9]+' || true)
  if [ -s "$LISTERR" ]; then
    echo "  ! kunne ikke finde kladder til rettelse:"
    sed 's/^/    /' "$LISTERR" | head -5
  fi

  if [ -z "$TODO" ]; then
    echo "  Ingen kladder skal rettes eller afvises."
  elif ! command -v claude >/dev/null 2>&1; then
    echo "  ! claude-CLI ikke fundet — springer rettelserne over."
  else
    echo "$TODO" | while IFS=$'\t' read -r id action; do
      [ -n "$id" ] || continue

      if [ "$action" = "reject" ]; then
        if [ "$DRY_RUN" = "1" ]; then
          echo "  [dry-run] ville AFVISE kladde #$id"
        else
          npx tsx pipeline/generate/apply-draft-fix.ts --reject "$id" \
            || echo "  ! kunne ikke afvise #$id"
        fi
        continue
      fi

      FPACK="logs/review/ret-$id.md"
      FOUT="logs/review/ret-svar-$id.json"

      npx tsx pipeline/generate/fix-pack.ts --article "$id" > "$FPACK" \
        || { echo "  ! rette-pakke #$id fejlede"; continue; }

      if [ "$DRY_RUN" = "1" ]; then
        echo "  [dry-run] ville RETTE kladde #$id ($(wc -c < "$FPACK") tegn)"
        continue
      fi

      echo "  → retter #$id"
      # Igen uden værktøjer: modellen skal svare med den rettede tekst, ikke
      # selv skrive i basen. Skrivningen sker ét sted — apply-draft-fix.ts.
      # Pakken kommer på STDIN, ikke som argument. Det er den form der er
      # prøvet igennem på kladde #245 (2026-09-10), og den holder uanset hvor
      # lang pakken bliver — en rette-pakke er større end en gennemgangspakke,
      # fordi fundene er med.
      if claude -p --allowed-tools "" < "$FPACK" > "$FOUT" 2>logs/review/ret-fejl-$id.txt; then
        npx tsx pipeline/generate/apply-draft-fix.ts --article "$id" --file "$FOUT" \
          || echo "  ! rettelsen af #$id blev IKKE gemt (se $FOUT)"
      else
        echo "  ! claude fejlede på rettelsen af #$id (se logs/review/ret-fejl-$id.txt)"
      fi
    done

    # Rettede kladder har nyt indhold, og badgen i /admin læser det mekaniske
    # resultat. Kør tjekket igen, så badgen passer til den tekst der nu ligger.
    if [ "$DRY_RUN" != "1" ]; then
      npx tsx pipeline/generate/check-drafts.ts >/dev/null || echo "  ! eftertjek fejlede"
    fi
  fi
fi

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
