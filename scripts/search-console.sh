#!/usr/bin/env bash
# ============================================================================
# Search Console-rapport for BEGGE sites.
#
#   ./scripts/search-console.sh                 28 dage, top 10 søgninger
#   ./scripts/search-console.sh --site=uk --days=7
#   ./scripts/search-console.sh --sitemaps      er sitemappet hentet?
#   ./scripts/search-console.sh --submit-sitemap
#
# Nøglen læses fra GOOGLE_SEARCH_CONSOLE_KEY (sti til service-konto-JSON).
# Ligger den i ~/.bashrc, plukkes linjen her — cron sourcer ikke .bashrc.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

if [ -z "${GOOGLE_SEARCH_CONSOLE_KEY:-}" ] && [ -f "$HOME/.bashrc" ]; then
  eval "$(grep -E '^export GOOGLE_SEARCH_CONSOLE_KEY(_JSON)?=' "$HOME/.bashrc")"
fi

if ! command -v npx >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do
    [ -d "$d" ] && PATH="$d:$PATH"
  done
  export PATH
fi

npx tsx pipeline/report/search-console.ts "$@"
