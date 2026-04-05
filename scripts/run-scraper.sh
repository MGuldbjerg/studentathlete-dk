#!/bin/bash
# Kør roster-scraper lokalt med D1 API-adgang.
# Brug: bash scripts/run-scraper.sh [--division D1] [--limit 50]
#
# KRÆVER: CLOUDFLARE_API_TOKEN sat som miljøvariabel.
# Find det i GitHub repo Settings → Secrets → CLOUDFLARE_API_TOKEN,
# eller opret et nyt i Cloudflare Dashboard → API Tokens.

set -e
cd "$(dirname "$0")/.."

export CLOUDFLARE_ACCOUNT_ID="a7b8096f10c258f5f7c3906772178796"
export CLOUDFLARE_D1_DATABASE_ID="5332ad3b-d908-4e39-b863-22a2cf0e82a0"

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "FEJL: CLOUDFLARE_API_TOKEN er ikke sat."
  echo ""
  echo "Sæt den først:"
  echo "  export CLOUDFLARE_API_TOKEN='dit-token-her'"
  echo "  bash scripts/run-scraper.sh $*"
  exit 1
fi

echo "Starter roster-scraper..."
echo "Start: $(date)"
echo ""

npx tsx pipeline/scrape/scrape-rosters.ts "$@"

echo ""
echo "Slut: $(date)"
