# Runbook — procedures and traps that stay true

Durable how-tos and lessons. Not state (that is `projekt-status.md`) and not rules
(that is `CLAUDE.md`). Add an entry when something cost real time and will happen
again; delete it when the code makes it impossible.

## Access map — what we can reach, and with what

Check here before saying «we can't see X». Names only; values live where the table says
and are never written into the repo or chat. An access is real only once it has been
used (the «Verified» column). Inventory 2026-10-29: `~/.bashrc` exports, `gh secret list`,
`wrangler secret list`, `~/.config/gcloud/`. Update the table when a credential is added
or dies.

| Service | Credential (where) | Reaches | Read-only way in | Verified |
|---|---|---|---|---|
| D1 + Workers | `CLOUDFLARE_API_TOKEN`, `_ACCOUNT_ID`, `_D1_DATABASE_ID` (`~/.bashrc` + repo secrets) | D1 read/write, Worker deploy, analytics (`wrangler d1 insights`, `platform-limits.ts`) | ops MCP `d1_query` / `d1_top_reads` | 2026-10-28 |
| Cloudflare zones | same token | **not** zone bot settings (auth error 2026-10-27); cache purge unverified | — | partly |
| GA4 (.dk 370967469, .co.uk 557937554) | service account, key `~/.config/gcloud/sa-searchconsole.json` (`GOOGLE_SEARCH_CONSOLE_KEY`) — Editor on both properties | Admin API (`scripts/ga4-admin.ts`) **and Data API** (reports) | `pipeline/report/social-retention.ts` | 2026-10-29 |
| Search Console | same service account | both sites' search data | `scripts/search-console.sh`, `pipeline/report/search-console.ts` | weekly via seo-friday |
| AdSense | OAuth as Mikkel (`~/.config/gcloud/adsense-client.json` + `adsense-token.json`) — the AdSense API refuses service accounts | reports | `scripts/adsense-report.ts` (`adsense-auth.ts` to renew) | — |
| GitHub | `gh` logged in (repo, workflow) on the PC; `GH_SECRETS_PAT` (repo secret, renews IG tokens) | PRs, runs, secrets/variables | ops MCP `ci_runs` / `ci_failure`, `status` | 2026-10-29 |
| Claude | `CLAUDE_CODE_OAUTH_TOKEN` + `_FALLBACK` (repo secrets); the PC's own CLI login | subscription calls in CI / locally | ops MCP `claude_usage`, `claude_quota` | 2026-10-28 |
| Free LLM chain | `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY` (bashrc + secrets), `OPENROUTER_API_KEY` (bashrc only) | drafting fallback, checks | `pipeline/checks/llm-health.ts` (llm-check.yml) | llm-check failing 4/8 |
| Bluesky | `BLUESKY_HANDLE`/`_APP_PASSWORD` (DK), `BLUESKY_UK_*` (repo secrets) | posting | — | social-post runs |
| Instagram / Facebook / Threads | `IG_*`, `IG_UK_*`, `FB_*`, `FB_UK_*`, `FB_APP_*`, `THREADS_UK_*` (repo secrets) | posting (FB disabled: Meta ad restriction) | `meta-check.yml` (token check) | daily |
| Discord | `DISCORD_WEBHOOK_URL` (alerts), `DISCORD_BOT_TOKEN`/`_APP_ID` (repo secrets) | alerts, bot commands | — | alerts fire |
| Worker secrets | `ADMIN_TOKEN`, `ANALYTICS_SALT`, `ANALYTICS_EXCLUDE_IPS`, `GITHUB_TOKEN` (`wrangler secret`) | /admin, analytics hashing, admin-triggered workflows | — | — |
| Worker MCP (Claude Desktop / claude.ai) | `MCP_TOKEN` (`wrangler secret`, set 2026-10-29; the value is only in Mikkel's password manager) | drafts and pages on the live site; writes need `confirm: true` | `SETUP-mcp-desktop.md` | 401 without token, 2026-10-29 |
| Brevo (email) | `BREVO_API_KEY` (`~/.bashrc` only, set 2026-10-29; v3 keys are unscoped — can do anything in the account) | transactional send for photo-permission mails; free plan, 300/day | `GET /v3/account` (read-only) | 2026-10-29 |

**Referenced but not set (2026-10-29)** — the step that uses it falls back or stays inert:
`THREADS_DK_*` (no DK Threads
profile), `X_*` (no X account), `ANTHROPIC_API_KEY` (API drafting not used — subscription
instead), `DISCORD_WEBHOOK_DK`/`_UK` (alerts fall back to `DISCORD_WEBHOOK_URL`).
`CLOUDFLARE_EMAIL_TOKEN` and `VERCEL_TOKEN` in `~/.bashrc` are not used by this repo.

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
The Discord alert already names the failed step (`.github/actions/notify-failure` — every
workflow's `if: failure()` step uses it; add it the same way to new workflows). For the log,
use the ops MCP server (`SETUP-ops-mcp.md`): `ci_runs failed_only` → `ci_failure <id>`.
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

- **Facial recognition — NEVER, in any form** (Mikkel, 2026-10-29: «Under no circumstances
  facial recognition — ever»). Not to match photos to athletes, not to sort, not as a
  «helper». It is biometric data (GDPR Art. 9) about named young people, and it is a no
  regardless of tooling or cost. Identity of a person in a photo comes from the school's
  own text (below), never from the face.

## Standing decisions worth knowing

- **Sourced table facts may publish straight to profiles** (Mikkel, 17 Sep 2026: «This
  is table data, not prose, and directly from official sources»). The no-auto-publish
  rule governs PROSE about named people.
- **Which athlete is in a photo** (Mikkel, 2026-10-29). Roster headshots come from the
  athlete's own roster page — the right person by construction. An ARTICLE photo may be
  used for our athlete only when the image's caption or alt text names the athlete by full
  name (first + last, diacritics folded); several players in the photo is fine. A caption's
  «Photo by …» names the photographer, not the motif. Photos that don't match go to a review
  queue (Mikkel accepts the delay, to fill articles with real photos rather than template
  graphics); the queue drops photos for articles too old to use. Surname-only matches never
  count. Image hunting runs ONLY for stories the assignment desk decided as an ARTICLE — not
  lines, folds, skips or holds: no fetching, queueing or review effort for a story that will
  never get a page.
