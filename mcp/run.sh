#!/bin/bash
# Launcher for the ops MCP server (mcp/ops-server.ts). Claude Code on Windows starts it with
#   wsl.exe -d Ubuntu-24.04 -- bash -c "exec bash ~/projekter/studentathlete-dk/mcp/run.sh"
# The ~ sits inside the quoted string so WSL's bash expands it: a bare ~ or /home/...
# argument gets rewritten to a Windows path when the command passes through Git Bash.
# stdout IS the MCP channel — nothing in here may print to it.
cd "$(dirname "$0")/.." || exit 1
# The same node as CI and ~/.bashrc: the global wrangler lives under v22.22.0.
export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v22.22.0/bin:$PATH"
# Only the three Cloudflare values it needs, not the whole interactive .bashrc.
eval "$(grep -E '^export CLOUDFLARE_(API_TOKEN|ACCOUNT_ID|D1_DATABASE_ID)=' ~/.bashrc)"
exec node_modules/.bin/tsx mcp/ops-server.ts
