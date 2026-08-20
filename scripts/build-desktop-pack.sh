#!/usr/bin/env bash
# ============================================================================
# Bygger kontekstpakken til Claude Desktop.
#
#   desktop-pakke/StudentAthlete-til-Claude-Desktop.md
#
# Den fil lægges i Claude Desktop under "Projektviden" — så kender Desktop-Claude
# projektet uden repo- eller databaseadgang. Kør igen når taksonomien, kladdekøen
# eller statussen har flyttet sig.
#
# Prosaen redigeres i desktop-pakke/_brief-skabelon.md; tallene hentes fra koden
# og D1 af pipeline/report/build-desktop-pack.ts.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# Cron/ikke-interaktiv shell læser ikke ~/.bashrc — pluk credentials derfra.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -f "$HOME/.bashrc" ]; then
  eval "$(grep -E '^export CLOUDFLARE_(API_TOKEN|ACCOUNT_ID|D1_DATABASE_ID)=' "$HOME/.bashrc")"
fi

if ! command -v npx >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do
    [ -d "$d" ] && PATH="$d:$PATH"
  done
  export PATH
fi

npx tsx pipeline/report/build-desktop-pack.ts
