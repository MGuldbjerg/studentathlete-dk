#!/bin/bash
# Kør alle database-migreringer mod Cloudflare D1
# Brug: bash scripts/migrate.sh

set -e
cd "$(dirname "$0")/.."

MIGRATIONS=(
  db/schema.sql
  db/migration-001-pipeline.sql
  db/migration-002-fullscan.sql
  db/migration-003-url-probes.sql
  db/migration-004-pages.sql
  db/migration-005-school-feeds.sql
  db/migration-006-photo-credit.sql
  db/migration-007-class-year.sql
  db/migration-008-llm-usage.sql
  db/migration-009-preferred-name.sql
  db/migration-010-style-corrections.sql
  db/migration-011-analytics.sql
)

for f in "${MIGRATIONS[@]}"; do
  if [ -f "$f" ]; then
    echo "Kører $f..."
    wrangler d1 execute studentathlete-dk --file="$f" --remote
  else
    echo "ADVARSEL: $f findes ikke — springer over"
  fi
done

echo "Alle migrationer gennemført."
