#!/bin/bash
# Kør pipeline-trin lokalt
# Brug: bash scripts/pipeline-local.sh [seed|import-schools|detect|scrape|discover|generate|report|all]

set -e
cd "$(dirname "$0")/.."

STEP="${1:-all}"

case "$STEP" in
  seed)
    echo "=== Seeder atletdatabasen ==="
    npx tsx pipeline/seed/seed-athletes.ts
    ;;
  import-schools)
    echo "=== Importerer skoler fra CSV ==="
    npx tsx pipeline/seed/import-schools-csv.ts
    ;;
  detect)
    echo "=== Detekterer platforme ==="
    npx tsx pipeline/scrape/detect-platforms.ts "${@:2}"
    ;;
  scrape)
    echo "=== Scraper rosters ==="
    npx tsx pipeline/scrape/scrape-rosters.ts "${@:2}"
    ;;
  scrape-js)
    echo "=== Scraper JS-renderede rosters ==="
    npx tsx pipeline/scrape/scrape-js-rosters.ts "${@:2}"
    ;;
  discover-feeds)
    echo "=== Opdager nyhedsfeeds for skoler ==="
    npx tsx pipeline/discover/discover-feeds.ts "${@:2}"
    ;;
  discover)
    echo "=== Tjekker kilder for historier ==="
    npx tsx pipeline/discover/check-sources.ts "${@:2}"
    ;;
  generate)
    echo "=== Genererer artikeludkast ==="
    npx tsx pipeline/generate/generate-articles.ts
    ;;
  report)
    echo "=== Dækningsrapport ==="
    npx tsx pipeline/report/coverage-report.ts
    ;;
  all)
    echo "=== Kører fuld pipeline ==="
    echo ""
    echo "--- Trin 1: Seed ---"
    npx tsx pipeline/seed/seed-athletes.ts
    echo ""
    echo "--- Trin 2: Scrape ---"
    npx tsx pipeline/scrape/scrape-rosters.ts "${@:2}"
    echo ""
    echo "--- Trin 3a: Discover feeds ---"
    npx tsx pipeline/discover/discover-feeds.ts
    echo ""
    echo "--- Trin 3b: Check sources ---"
    npx tsx pipeline/discover/check-sources.ts
    echo ""
    echo "--- Trin 4: Generate ---"
    npx tsx pipeline/generate/generate-articles.ts
    echo ""
    echo "--- Rapport ---"
    npx tsx pipeline/report/coverage-report.ts
    echo ""
    echo "=== Pipeline færdig ==="
    ;;
  *)
    echo "Brug: bash scripts/pipeline-local.sh [seed|import-schools|detect|scrape|scrape-js|discover-feeds|discover|generate|report|all]"
    exit 1
    ;;
esac
