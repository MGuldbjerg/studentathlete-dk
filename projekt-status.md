# StudentAthlete — status

**Updated 2026-10-28.** This file holds what is true NOW and what is open — nothing else.
Done work lives in `git log` / the PRs; procedures and traps in `docs/RUNBOOK.md`; rules in
`CLAUDE.md`. **CI fails above 250 lines** (`ci.yml`): when it does, delete what is done
instead of raising the limit. The long history before this rewrite: `git show
2135676:projekt-status.md` (3,841 lines, narrative from June to 28 Oct 2026).

Start a session with the ops MCP server's `status` tool (`SETUP-ops-mcp.md`) and work in
your own worktree (`bash scripts/worktree.sh <name>`), never in the shared checkout.

---

## What runs (live)

**Story flow.** `discover-daily` every 2 h at :17 reads school feeds; each NEW feed item is
opened once (`feed_items_seen`) and matched on the school's own tags + full names in the body
(#53). Collecting countries' stories are stored as links only, capped 60/run (#54).
→ **Assignment desk** (`assignment-desk.yml`, every 4 h at :05, DESK_MODE=live since 27/10 #68)
decides each story: article (type, priority, angle) / line (profile timeline) / fold / skip /
hold. Rules in `pipeline/editor/brief.md` (Mikkel's answers to 24 hypotheticals at its bottom;
`applyRules` enforces length + freshness in code). Off switches: DESK_MODE=shadow, DESK_GATE=off.
→ **Drafting** (`generate-manual.yml`, 07:30/13:30/19:30 UTC) drafts ONLY live-desk articles
(DESK_GATE=1), Claude Haiku on the subscription (`LLM_CLAUDE_CLI=1`), cap `CLAUDE_DAILY_CAP`=150.
→ **Review**: `review-drafts.yml` every 3 h at :40 gives verdicts (skips when the queue is
empty). The PC runs the agreed nightly correction (CLAUDE.md «standing exception»): Windows
task `StudentAthlete-kladderettelse` (`--fix`: rewrite against source / reject) + crontab
7,10,13,16,19 that catches up a missed night. Reviews are per content hash, so the PC and
the cloud never review the same text twice.
→ **Opus editor (UK)** (`auto-editor-uk.yml`, midnight + midday windows) publishes / rejects /
holds finished UK drafts, max 12 per run, spaced 17–23 min. Runs **Sonnet, effort medium**
since #73. DK drafts are published by Mikkel (or on his instruction).

**Claude accounts.** `.github/actions/claude-account` picks the main token or
`CLAUDE_CODE_OAUTH_TOKEN_FALLBACK` (set 28/10, account mgj@groenagergaard.dk). In
`pipeline/lib/claude-run.ts` (desk + editor) a Haiku probe reads utilisation before the first
call and every 6 calls; at 85 % (5 h) / 90 % (7 d) the run moves to the fallback, which always
runs Sonnet/medium. Usage per job: `claude_calls` + `llm_usage` (`claude_usage` MCP tool).
Drafting is ~60–70 % of all Claude calls (33–108/day). review-drafts is not logged.

**UK content floor** (`PLAN-content-floor-uk.md`, steps 1–6 done #39–#48). Profiles carry team
context, earlier seasons, standing, bio facts, honours prose. `profile-prose.ts` is shared by the
page and `index-words.ts` (daily in stats-daily); under 200 words (UK) → noindex,follow + out of
sitemap, back automatically when the page grows. 26/10: 1,064 indexable pages, 14 under 200
(/statistics ×7, /guides ×4, /athletes, /articles, /editorial-standards).

**Stats.** `stats-daily` fills `athlete_season_stats` (football + field hockey; tennis OFF —
wrong-season pages) for site AND collecting countries, plus history, milestones, leaderboard
(`stats_cache`), awards. Weekly leaderboard page Mondays from 3 Nov. `award-roundup.yml` posts
on the 1st (first: 1 Nov). Earlier seasons (`backfill-career.ts`) and bio facts
(`bio-facts.ts --write`) are NOT scheduled — rerun by hand for new stats profiles.

**Markets.** Sites: DK (.dk), UK (.co.uk). Collecting (no site, athletes + stats gathered):
the 13 countries in `src/lib/countries/collecting.ts`.

**Social.** `social-post.yml` hourly (Bluesky DK `bluesky`, UK `bluesky_uk`; Instagram; reels
gated by `REELS_ENABLED_UK`). Facebook disabled (Meta ad restriction). Threads built, inert until
Mikkel creates the profiles and runs `setup-threads.bat`. Social links carry `?source=`.

**Platform.** Workers Paid. 27/10 (`platform-limits.ts`): D1 reads 0.7 %, writes 3.9 %, requests
3.6 % of the monthly allowance — **Worker CPU 151 %** (≈ $0.31 over). CPU, not D1, is the cost to
watch. **CPU pass live 28/10 (#77, migration 079, deploy dcd6653d):** list queries no longer
carry article bodies (`ARTICLE_LIST_SELECT`, `word_count` from SQL — the home page dropped
~170–190 KB of bodies per render); list/carousel/letter indexes; sport counts from the hourly
`stats_cache` row `sport_active_counts`. Expected D1 ~5.1M → ~0.35M rows/day on those queries.
`rsc` requests: 0 of 84 in a 10-min tail — `prefetch={false}` already covers it; nothing to cache.
Migration 047 had been only partly applied (its athletes index was missing live).

**Tooling.** Ops MCP server (`mcp/`, #74): `status` overview, CI runs/failures, Claude usage +
quota, guarded D1 reads, D1 top queries. Every workflow's failure alert goes through
`.github/actions/notify-failure` and names the failed step. CI runs every `_*-test.ts`. The Worker MCP (`/api/mcp`, `SETUP-mcp-desktop.md`) is Claude Desktop's
editing connector — a different thing.

---

## Waiting on Mikkel

1. **Photo-permission outreach** — built (`pipeline/photos/`, ledger migration 068), nothing
   sent. Waiting for Influxer's answer (emailed 27/10) on who handles photo rights. Then: approve
   wording + the 7 South Atlantic contacts (`contacts/south-atlantic-conference.csv`; Lincoln
   Memorial name/email mismatch), set `BREVO_API_KEY`, and check the site really shows the photo
   credit + source link the email promises.
2. **Influxer merch links** — 104 verified stores live on profiles (#70); ~17 probable
   (transfers) + ~80 namesakes need his choice. `merch-clicks.ts` for the pitch.
3. **Fanatics** — declined 28/10 (generic reasons). Appeal to partners@fanatics.com with traffic
   numbers, or drop. Impact's recommender returned no UK/DK programs.
4. **LIA section D** (`UDKAST-LIA-interesseafvejning.md`) — legal basis for the 13 collecting
   countries incl. a 12-month deletion limit. Collecting already runs.
5. **AdSense .co.uk** — reapply not before ~10 Nov and not before the 14 thin hub pages have
   prose (/athletes + /articles intros need his read).
6. **Threads** — create profiles + Threads use case, then `setup-threads.bat` per market.

## Schedule decisions 28/10 (PR #76)

- Drafting twice a day, 07:30 + 19:30 UTC. Saves a probe and a runner, not Claude calls —
  the lever for those is `CLAUDE_DAILY_CAP` (150).
- Catalogue (`international_athletes`, /admin/katalog) weekly, Saturday 21:00 UTC.
- weekly-scrape keeps its nightly 22:00 run so the 13 collecting countries get a full
  rotation. Go weekly when `SELECT home_country, COUNT(*) FROM athletes GROUP BY 1` stops growing.

## Next (Claude)

- **Health:** `daily-js-scrape` hit its 30-min timeout in 7 of 8 runs; `llm-check` failed 4 of 8.
- **Blyth transfer** (CBU → Nova Southeastern): scrapers don't move a transfer whose slug exists.
- **Enrich the 56 old short articles** (`enrich.ts`) so they can return to the index (optional).
- **Leaderboard follow-ups (agreed):** season update from ~29 Oct, monthly award tally, honours
  roundup on IG with athletes tagged, end-of-season honours list, «weekly check-in» candidates.
- **DFM Mimir** naturalness test on Mikkel's 59 edited Danish articles — proposed, not started.

## Check soon

- Collecting countries arrive: `SELECT home_country, COUNT(*) FROM athletes GROUP BY 1`.
- Discovery every 2 h (was 6): story volume, DK draft queue, D1 reads.
- First award roundup 1 Nov; first weekly leaderboard 3 Nov.
- **CPU after #77** (~30 Oct, a day or two of traffic): `npx tsx pipeline/checks/platform-limits.ts`
  (was 151 %) and `d1_top_reads` (the list queries should be gone from the top).

## Standing decisions

- .dk promises a person reads every article; the no-auto-publish rule governs PROSE about named
  people. Machine publishers that are approved: the Opus editor (UK drafts), desk lines, sourced
  table facts (honours, stats, leaderboards), rule-based profile refreshes that only ADD facts.
- Publishing by hand is spaced 17–23 min per site.
- Collecting countries' stories are links only until a site exists.
