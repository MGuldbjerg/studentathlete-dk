#!/usr/bin/env bash
# Deploy the Discord-bot worker AND (re)register its slash commands.
# Run this after changing the WORKFLOWS map (index.ts) or the command list
# (register-commands.ts) — e.g. when adding a new manual /command.
#
# Both steps are needed for a new command to work:
#   1. wrangler deploy      -> the worker learns the new command→workflow mapping
#   2. register-commands.ts -> Discord shows the new /command in the picker
# Existing worker secrets (DISCORD_PUBLIC_KEY, GITHUB_PAT, …) persist across deploys.
#
# Requires in env:
#   DISCORD_APP_ID, DISCORD_BOT_TOKEN   (Discord application creds — for step 2)
#   CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID, or `wrangler login` (for step 1)
set -euo pipefail
cd "$(dirname "$0")"

echo "==> [1/2] Deploying worker (studentathlete-discord-bot)…"
npx wrangler deploy

echo "==> [2/2] Registering slash commands…"
npx tsx register-commands.ts

echo "✅ Done — /catalogue is now callable from Discord."
