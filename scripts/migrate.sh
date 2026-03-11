#!/bin/bash
# Kør database-migrering mod Cloudflare D1
# Brug: bash scripts/migrate.sh

set -e
cd "$(dirname "$0")/.."

echo "Kører migration-001-pipeline.sql mod D1..."
wrangler d1 execute studentathlete-dk --file=db/migration-001-pipeline.sql --remote

echo "Migration gennemført."
