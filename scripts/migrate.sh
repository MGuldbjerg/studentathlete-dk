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
  db/migration-012-factsheet.sql
  db/migration-013-bio-url.sql
  db/migration-014-pages-published.sql
  db/migration-015-school-colors.sql
  db/migration-016-photo-suggestions.sql
  db/migration-017-learning.sql
  db/migration-018-social-queue.sql
  db/migration-019-events.sql
  db/migration-020-guides.sql
  db/migration-021-site-content.sql
  db/migration-022-featured.sql
  db/migration-023-athlete-events.sql
  db/migration-024-sensitive.sql
  db/migration-025-author-role.sql
  db/migration-026-corrections.sql
  db/migration-027-review-log.sql
  db/migration-028-leads.sql
  db/migration-029-card-blobs.sql
  db/migration-030-international-catalogue.sql
  db/migration-031-profile-draft.sql
  db/migration-032-roster-identity.sql
  # 033 (unikt indeks på roster_key) fejler bevidst hvis der stadig findes
  # dubletter — kør backfill-roster-keys.ts + dedup-athletes.ts --apply først.
  db/migration-033-roster-key-unique.sql
  db/migration-034-country.sql
  db/migration-035-canonical-sport-keys.sql
  db/migration-036-event-source.sql
  db/migration-037-site-content-country.sql
  db/migration-038-pages-country.sql
  db/migration-039-athlete-gender.sql
  db/migration-040-social-deleted.sql
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
