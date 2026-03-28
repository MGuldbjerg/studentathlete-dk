#!/bin/bash
# Detektér platformtyper for alle skoler med website
# Brug: bash scripts/detect-platforms.sh [--limit N]

set -e
cd "$(dirname "$0")/.."

echo "=== Platform-detektion ==="
npx tsx pipeline/scrape/detect-platforms.ts "$@"
echo ""
echo "=== Færdig ==="
