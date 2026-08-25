#!/bin/bash
# Kør ÉN migration mod produktions-D1 — og kun hvis den er ufarlig.
# Brug: bash scripts/migrate-live.sh migration-046-photo-checked.sql
#
# Dette script må køres uden at spørge (se «Claudes grænse mod live» i
# CLAUDE.md). Det er kun forsvarligt fordi det nægter alt andet end
# TILFØJELSER. Løsn aldrig de tre spærrer nedenfor for at få en enkelt
# migration igennem — så flytter grænsen sig i tavshed. Skal der slettes
# eller opdateres data, er det en samtale med Mikkel, ikke et flag her.

set -e
cd "$(dirname "$0")/.."

FILE="$1"
if [ -z "$FILE" ]; then
  echo "AFBRUDT: angiv en migration, fx: bash scripts/migrate-live.sh migration-046-photo-checked.sql"
  exit 1
fi

PATH_SQL="db/$FILE"

# 1. Filen skal findes OG være committet. En migration, ingen har kunnet
#    læse i et diff, må ikke ramme produktion.
if [ ! -f "$PATH_SQL" ]; then
  echo "AFBRUDT: $PATH_SQL findes ikke."
  exit 1
fi
if ! git ls-files --error-unmatch "$PATH_SQL" >/dev/null 2>&1; then
  echo "AFBRUDT: $PATH_SQL er ikke sporet af git. Commit den først."
  exit 1
fi
if [ -n "$(git status --porcelain "$PATH_SQL")" ]; then
  echo "AFBRUDT: $PATH_SQL har ucommitede ændringer."
  exit 1
fi

# 2. KUN tilføjelser. Kommentarlinjer tælles ikke med — migrationerne her
#    forklarer sig selv i prosa, og ordet «slette» i en kommentar er ikke
#    en sletning.
BODY=$(grep -v '^[[:space:]]*--' "$PATH_SQL" || true)
if echo "$BODY" | grep -qiE '(^|[^a-z])(drop|delete|truncate|update)([^a-z]|$)'; then
  echo "AFBRUDT: $FILE indeholder destruktiv SQL (drop/delete/truncate/update)."
  echo "Dette script kører kun tilføjelser. Kør den manuelt efter aftale med Mikkel:"
  echo "$BODY" | grep -inE '(^|[^a-z])(drop|delete|truncate|update)([^a-z]|$)'
  exit 1
fi

# 3. Vis præcis hvad der køres. Et migrationsscript uden fremvist SQL er
#    en tillidserklæring, ikke en handling man kan efterprøve.
echo "── Migration: $FILE"
echo "$BODY" | grep -v '^[[:space:]]*$' | sed 's/^/    /'
echo

npx wrangler d1 execute studentathlete-dk --remote --file="$PATH_SQL"

echo
echo "Kørt: $FILE"
