#!/bin/bash
# Kør komplet international atlet-analyse
# Brug: bash scripts/run-full-analysis.sh [--limit-per-div 50]
# Uden --limit-per-div: ALLE skoler (~2-4 timer)
# Med --limit-per-div 50: 200 skoler (~30 min)

set -e
cd "$(dirname "$0")/.."

export CLOUDFLARE_ACCOUNT_ID="a7b8096f10c258f5f7c3906772178796"
export CLOUDFLARE_D1_DATABASE_ID="5332ad3b-d908-4e39-b863-22a2cf0e82a0"

echo "Starter komplet international analyse..."
echo "Start: $(date)"
echo ""

npx tsx pipeline/report/full-international-analysis.ts "$@"

echo ""
echo "Slut: $(date)"
