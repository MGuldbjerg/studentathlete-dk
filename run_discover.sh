#!/usr/bin/env bash
# Token-fri discovery — tjekker kilder for nye historier.
# Kræver .env med Cloudflare credentials.

set -euo pipefail
cd "$(dirname "$0")"

# Load .env hvis den findes
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "=== StudentAthlete.dk — Discovery ==="
echo "Startet: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

npx tsx pipeline/discover/check-sources.ts 2>&1 | tee -a logs/discover.log

echo ""
echo "Færdig: $(date '+%Y-%m-%d %H:%M:%S')"
