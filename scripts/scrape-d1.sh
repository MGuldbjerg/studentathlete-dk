#!/bin/bash
# Scrape NCAA D1 rosters lokalt
# Brug: bash scripts/scrape-d1.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Scraper NCAA D1 rosters ==="
npx tsx pipeline/scrape/scrape-rosters.ts --division D1 --limit 500 --max-age-days 30
echo ""
echo "=== Færdig ==="
