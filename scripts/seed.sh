#!/bin/bash
# Seed atletdatabasen med kendte danske atleter
# Brug: bash scripts/seed.sh

set -e
cd "$(dirname "$0")/.."

echo "Seeder atletdatabasen fra pipeline/seed/seed-data.json..."
npx tsx pipeline/seed/seed-athletes.ts

echo "Seed gennemført."
