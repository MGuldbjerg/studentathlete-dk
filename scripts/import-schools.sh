#!/bin/bash
# Importér alle skoler fra schools.csv til D1-databasen
# Brug: bash scripts/import-schools.sh [sti-til-csv]

set -e
cd "$(dirname "$0")/.."

echo "=== Importerer skoler fra CSV ==="
npx tsx pipeline/seed/import-schools-csv.ts "$@"
echo ""
echo "=== Færdig ==="
