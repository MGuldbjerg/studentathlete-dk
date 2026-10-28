# Runbook — procedures and traps that stay true

Durable how-tos and lessons. Not state (that is `projekt-status.md`) and not rules
(that is `CLAUDE.md`). Add an entry when something cost real time and will happen
again; delete it when the code makes it impossible.

## Procedures

### Fix a published card (three steps, in this order)
The card URL is versioned (`/og/cards/card-<id>-v9.webp`) and never changes, so
re-rendering alone does not reach readers.
1. `render-cards.ts --article N --force` (both formats, if an `ig-` card exists).
2. `bash scripts/deploy-live.sh` — the deploy copies `card_blobs` to static files;
   a deploy before step 1 ships the old card.
3. Purge the URLs in Cloudflare (by URL, with and without the query string) — the
   edge answered `HIT` with the old file after step 2.
Posts already on Bluesky/Facebook/Instagram keep the old image.

### Find a school's staff email
The fetch tool returns empty shells on Sidearm athletics sites. Use
`curl -sL -A "Mozilla/5.0" https://<site>/staff-directory` and parse the raw HTML
(emails are built from JS `firstHalf`/`secondHalf` in the name's row). Harvard and
Yale keep emails out of the HTML. **Never infer an address from a pattern.**

### Diagnose a failed workflow
Use the ops MCP server (`SETUP-ops-mcp.md`): `ci_runs failed_only` → `ci_failure <id>`.
Claude-account failures («No Claude account answered») are the usage limit or a dead
token; the early switch in `pipeline/lib/claude-run.ts` moves runs to the fallback
account at 85 % (5 h) / 90 % (7 d).

## Traps

- **A social channel name is a database value.** `social_posts.channel` drives pacing,
  queue depth, «last posted» and dedup. Renaming a channel loses its history and
  requeues the whole archive. So `bluesky` (the DANISH account), `bluesky_uk`,
  `facebook`, `instagram` keep their names; new accounts are `<platform>_<country>`.
- **Editing a `.sh` through `\\wsl.localhost` drops its +x bit** in git. Check
  `git ls-files -s <file>` (100755) before committing.
- **CI typechecks `pipeline/` with its own tsconfig:** run
  `npx tsc -p pipeline/tsconfig.json --noEmit` as well as the root one.
- **Scheduled workflows run from `main`, not from the deploy.** A pipeline change is
  live at the next scheduled run after merge — no deploy needed, no deploy stops it.
- **GitHub Actions clock skew:** `run.created_at` is stamped ~200 ms before
  `triggeredAt` reaches the client — compare with a buffer.
- **satori / ImageResponse on Workers:** no default font (text vanishes silently),
  `inset` shorthand is ignored, alpha-hex in gradients fails silently. Ship TTF fonts
  explicitly (static weights, not variable), use explicit top/left/right/bottom and
  rgba(); the Worker can't fetch its own zone — inline assets as data URIs.
- **Google News** as a source needs exact whole-word name matching + LLM verification
  + a domain blocklist + an obituary filter; without them it brings namesakes and scam
  redirects (removed April 2026 for that, back since June with the fixes).

## Closed tracks — don't spend time on them again

- **Static pre-rendering:** `siteFromHost()` reads the Host header per request and
  falls back to Danish; a pre-rendered page is built without a request → Danish
  content on the UK domain, silently. Needs one build per host.
- **Netlify:** the free plan is credit-based (~20 production deploys/month) and traffic
  STOPS when credits run out; `DB` is a D1 binding that only exists on Cloudflare.
- **Separate Cloudflare accounts per site:** no capacity gain — the CPU limit is per
  call, not per account, and there is one Worker.

## Standing decisions worth knowing

- **Sourced table facts may publish straight to profiles** (Mikkel, 17 Sep 2026: «This
  is table data, not prose, and directly from official sources»). The no-auto-publish
  rule governs PROSE about named people.
