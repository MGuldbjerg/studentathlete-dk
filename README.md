# StudentAthlete

Two sites, one engine: **studentathlete.dk** (Danish athletes) and **student-athlete.co.uk**
(British athletes) — Next.js on Cloudflare Workers + D1, fed by a TypeScript pipeline under
`pipeline/` that GitHub Actions runs on a schedule.

- `CLAUDE.md` — rules for working in this repo (read first)
- `projekt-status.md` — what runs now and what is open
- `docs/RUNBOOK.md` — procedures and traps; `docs/ARCHIVE.md` — removed docs
- `ARKITEKTUR-motor.md` — the core / language / country layers
- `SETUP-ops-mcp.md` — read-only ops tools for Claude Code

New session: `bash scripts/worktree.sh <name>`, then work in `../studentathlete-<name>`.
