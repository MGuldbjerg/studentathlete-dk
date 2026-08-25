#!/bin/bash
# Deploy KODE til produktion (studentathlete.dk + student-athlete.co.uk).
# Brug: bash scripts/deploy-live.sh
#
# Dette er den ENESTE live-handling Claude kører uden at spørge først
# (se «Claudes grænse mod live» i CLAUDE.md). Skriv ALDRIG d1-skrivninger,
# workflow-dispatch eller udgivelse ind i dette script — så flytter grænsen
# sig i tavshed, og tilladelsen i settings.json kommer til at dække mere,
# end Mikkel sagde ja til.

set -e
cd "$(dirname "$0")/.."

# 1. Kun main. Kun rent arbejdstræ. Live skal altid kunne besvares med et SHA.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "AFBRUDT: står på '$BRANCH', ikke main."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "AFBRUDT: ucommitede ændringer — live kunne så ikke spores til en commit."
  git status --short
  exit 1
fi

# 2. HEAD skal være pushet. Deploy afhænger ikke af push, så uden dette tjek
#    kan der ligge kode live, som hverken CI eller GitHub har set.
git fetch --quiet origin main
if [ -n "$(git rev-list origin/main..HEAD)" ]; then
  echo "AFBRUDT: HEAD er ikke pushet til origin/main. Push først — så ser CI koden."
  exit 1
fi

# 3. Typecheck før build. CI kører den også, men CI kører efter push,
#    og et deploy skal ikke kunne overhale sit eget sikkerhedsnet.
echo "── Typecheck (src)…"
npx tsc --noEmit
echo "── Typecheck (pipeline)…"
npx tsc -p pipeline/tsconfig.json --noEmit

# 4. Byg + deploy
echo "── Bygger worker…"
npm run build:worker
echo "── Deployer…"
wrangler deploy

echo
echo "Live: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
