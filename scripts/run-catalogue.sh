#!/bin/bash
# Ekspansions-katalog i små, pålidelige skole-slices med retry.
#
# Hvorfor: den lange enkelt-proces-kørsel (alle ~1160 skoler i én tsx-proces)
# exit'er INTERMITTENT med kode 0 midt i en fetch (event-loop tømmes med et pending
# promise — ingen exception). Små slices fejler sjældent, og idempotent upsert
# (ON CONFLICT) betyder at retry blot gen-skriver samme rækker → konvergerer til
# fuld dækning. Bruges af catalogue-weekly.yml og kan køres manuelt.
#
# Env: CATALOGUE_STEP (skoler pr. slice, default 30), CATALOGUE_CONC (default 20),
#      CATALOGUE_MAX (øvre skole-loft, default 1400), CATALOGUE_RETRIES (default 4).
set -u
cd "$(dirname "$0")/.."

STEP="${CATALOGUE_STEP:-30}"
CONC="${CATALOGUE_CONC:-20}"
MAX_SCHOOLS="${CATALOGUE_MAX:-1400}"
RETRIES="${CATALOGUE_RETRIES:-4}"
DRY_FLAG=""
[ "${CATALOGUE_DRY:-0}" = "1" ] && DRY_FLAG="--dry-run"
LOG="$(mktemp)"

off=0
failed_slices=0
while [ "$off" -lt "$MAX_SCHOOLS" ]; do
  ok=0
  for try in $(seq 1 "$RETRIES"); do
    npx tsx pipeline/catalogue/catalogue-international.ts \
      --school-offset "$off" --school-limit "$STEP" --concurrency "$CONC" $DRY_FLAG > "$LOG" 2>&1
    if grep -q "Færdig:" "$LOG"; then ok=1; break; fi
    echo "  offset $off: forsøg $try fejlede (ingen Færdig) — prøver igen"
  done

  if [ "$ok" -ne 1 ]; then
    echo "ADVARSEL: offset $off fejlede efter $RETRIES forsøg — springer over"
    failed_slices=$((failed_slices + 1))
    off=$((off + STEP))
    continue
  fi

  if grep -q "Skoler: 0" "$LOG"; then
    echo "Ingen flere skoler ved offset $off — stopper."
    break
  fi

  echo "offset $off OK — $(grep -E 'Skoler:|atleter ·' "$LOG" | tr '\n' ' ')"
  off=$((off + STEP))
done

rm -f "$LOG"
echo "Runner færdig. Fejlede slices: $failed_slices"
[ "$failed_slices" -eq 0 ]
