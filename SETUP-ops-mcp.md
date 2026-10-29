# Ops MCP server — setup

`mcp/ops-server.ts` gives Claude Code read-only tools for running the site:

| Tool | What | Cost |
|---|---|---|
| `status` | **start here**: failed runs (24 h), open PRs, drafts waiting, Claude calls today, D1 budget | GitHub API + ~3 small D1 reads, cached 2 min |
| `ci_runs` | recent GitHub Actions runs, filter by workflow / failures | GitHub API, cached 1 min |
| `ci_failure` | failed steps + log tail of one run | GitHub API, cached 24 h |
| `claude_usage` | Claude calls per day/job/account (claude_calls + llm_usage) | ~100 D1 rows, cached 5 min |
| `claude_quota` | live 5-hour / 7-day utilisation of THIS PC's Claude login | **one tiny Haiku call**, cached 15 min |
| `access_check` | **which accesses work right now**: Cloudflare token/D1/R2/zones, GA4, Search Console, `gh` scopes, Brevo, Worker secret names | one GET per service, no D1 rows, cached 10 min |
| `d1_schema` | table names, or one table's CREATE + indexes | ~300 D1 rows, cached 1 h |
| `d1_query` | one SELECT on the live D1 | rows read, see below |
| `d1_top_reads` | the site's costliest D1 queries (`wrangler d1 insights`) | Cloudflare analytics, cached 30 min |

It never writes. Deploys and migrations stay with `scripts/deploy-live.sh` and
`scripts/migrate-live.sh`. It is not the Worker connector in `SETUP-mcp-desktop.md`:
that one runs on the site for Claude Desktop and edits drafts and pages.

## The D1 guard

D1 bills rows read. `d1_query`:

1. accepts one `SELECT` / `WITH … SELECT`, nothing else;
2. runs `EXPLAIN QUERY PLAN` first and refuses a full-table scan unless the call
   says `allow_scan: true` (cheap for a plain LIMIT, costly for an aggregate);
3. returns at most 200 rows (default 50) and caches identical queries for a minute;
4. stops for the day at **200,000 rows read** by this server (UTC day, counted in
   `~/.cache/studentathlete-ops-mcp/d1-rows.json`; override with
   `OPS_MCP_D1_DAILY_ROWS`). That caps what Claude adds, not the site's own reads.

The server uses the `CLOUDFLARE_API_TOKEN` from `~/.bashrc`, which can write. The
read-only rule is enforced in code. A separate token with D1 read permission only
would make it hold even if the code were wrong.

## Register it in Claude Code (once per PC)

From Windows (PowerShell or Git Bash):

```bash
claude mcp add studentathlete-ops --scope user -- wsl.exe -d Ubuntu-24.04 -- bash -c "exec bash ~/projekter/studentathlete-dk/mcp/run.sh"
```

The `~` has to stay inside the quotes, so WSL's bash expands it. Git Bash would
otherwise turn it into `C:/Users/...`. The launcher (`mcp/run.sh`) sets node
v22.22.0 and `~/.local/bin` (gh) on PATH and reads only the three `CLOUDFLARE_*`
exports from `~/.bashrc`. stdout is the MCP channel, so nothing may print to it.

## Test without Claude Code

```bash
cd ~/projekter/studentathlete-dk
npx tsx mcp/_ops-guards-test.ts
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bash mcp/run.sh
```
