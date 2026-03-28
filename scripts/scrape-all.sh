#!/bin/bash
# Scrape alle divisioner sekventielt
# Brug: bash scripts/scrape-all.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Scraper alle divisioner ==="

for DIV in D1 D2 D3; do
  echo ""
  echo "--- NCAA ${DIV} ---"
  npx tsx pipeline/scrape/scrape-rosters.ts --division "$DIV" --limit 500 --max-age-days 30
done

echo ""
echo "--- NAIA ---"
npx tsx pipeline/scrape/scrape-rosters.ts --division NAIA --limit 200 --max-age-days 30 || true

echo ""
echo "=== Alle divisioner færdige ==="
