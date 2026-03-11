#!/bin/bash
# Kør pipeline-trin lokalt
# Brug: bash scripts/pipeline-local.sh [seed|scrape|discover|generate|all]

set -e
cd "$(dirname "$0")/.."

STEP="${1:-all}"

case "$STEP" in
  seed)
    echo "=== Seeder atletdatabasen ==="
    npx tsx pipeline/seed/seed-athletes.ts
    ;;
  scrape)
    echo "=== Scraper rosters ==="
    npx tsx pipeline/scrape/scrape-rosters.ts
    ;;
  discover)
    echo "=== Tjekker kilder for historier ==="
    npx tsx pipeline/discover/check-sources.ts
    ;;
  generate)
    echo "=== Genererer artikeludkast ==="
    npx tsx pipeline/generate/generate-articles.ts
    ;;
  all)
    echo "=== Kører fuld pipeline ==="
    echo ""
    echo "--- Trin 1: Seed ---"
    npx tsx pipeline/seed/seed-athletes.ts
    echo ""
    echo "--- Trin 2: Scrape ---"
    npx tsx pipeline/scrape/scrape-rosters.ts
    echo ""
    echo "--- Trin 3: Discover ---"
    npx tsx pipeline/discover/check-sources.ts
    echo ""
    echo "--- Trin 4: Generate ---"
    npx tsx pipeline/generate/generate-articles.ts
    echo ""
    echo "=== Pipeline færdig ==="
    ;;
  *)
    echo "Brug: bash scripts/pipeline-local.sh [seed|scrape|discover|generate|all]"
    exit 1
    ;;
esac
