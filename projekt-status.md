# StudentAthlete — status

**Updated 2026-10-28.** This file holds what is true NOW and what is open — nothing else.
Done work lives in `git log` / the PRs; procedures and traps in `docs/RUNBOOK.md`; rules in
`CLAUDE.md`. **CI fails above 250 lines** (`ci.yml`): when it does, delete what is done
instead of raising the limit. The long history before this rewrite: `git show
2135676:projekt-status.md` (3,841 lines, narrative from June to 28 Oct 2026).

Start a session with the ops MCP server's `status` tool (`SETUP-ops-mcp.md`); before saying «we can't reach X» run its `access_check`. Work in
your own worktree (`bash scripts/worktree.sh <name>`), never in the shared checkout.

---


## 🧩 UK profiles approved on the template level (2026-11-04) — LIVE

Mikkel: «I want the UK profiles to be approved on a template level.» An audit of all 2,908 UK
template texts found raw codes as roles («as a UT», «She/Her»), seed-cut school names («Hinds
Community»), «Washington, Washington D.C.», «runs as a distance runner», «as an epee», and
«Lake Wales Fla.» / «Grimsby, ON» filed as UK. All fixed, with tests.
- `apply-template-profiles.ts` publishes the template where no person wrote the text; switch
  `profileTemplateApproved` (UK on, DK off). Holds: hometown not UK, school changed without a
  transfer. Runs in profile-drafts.yml (Sun) + quality-sweep.yml (Mon), before queue-stale.
- `athletes.profile_by_template` (migration 084 applied; backfill-084 marked 2,675): 1 = the
  template's text; admin approval sets 0; NULL = unknown, treated as a person's.
- First run 2026-11-04 (deploy 21db8ffd): 342 published (151 new, 191 corrected), 2 held
  (16229 Grimsby ON, 1470 Lake Wales Fla. — decide whether they belong on the UK site).
- **Still in /admin/profiler: ~80 UK drafts** whose live text is a person's or of unknown origin —
  incl. 6 school changes without a recorded transfer (Cody Read Fairfield→Winthrop, Georgia Bell
  Colorado→SMU, …), renames (Ben→Benjamin), and hand-edits. Approving one there sets 0.
- A change to `profile-baseline-en.ts` now publishes on the next Sunday/Monday run: dry-run
  `apply-template-profiles.ts` and read the output before pushing.
- Not fixed: athlete 1697 «Lake Wales» (no state) is probably Floridian; 2 athletes have sport key `polo`.

## 📈 Growth plan (Mikkel, 2026-11-03)

Baseline: ~20 real visitors/day per site (events after the bot filter); search clicks 90 d UK
785, DK 420, almost all athlete-name searches; ~1,670 automated social posts → ~100 followers
in total (IG DK 62, Bsky UK 17, IG UK 15, Threads 0). Audiences: fans of each sport's British/
Danish pipeline (athletics, field hockey, basketball …); for soccer the academy→college pathway.
**Decided, in order:**
1. **Share buttons** on articles and profiles (WhatsApp, Facebook, copy, native share), tagged
   `?source=share_*`, click kind `share` — **live 2026-11-03 (#101)**.
2. **Per-sport email digest** via Brevo: subscriber picks sports, gets only those sections,
   double opt-in. **Built, switched OFF** (`emailDigest` on the country profile; table
   `digest_subscribers`, migration 083; `/api/digest/*`; `pipeline/digest/send-digest.ts`;
   `email-digest.yml` Mondays 07:10 UTC = dry run unless repo variable `DIGEST_SEND=1`).
   **Launch checklist (Mikkel):** (a) .co.uk DNS for Brevo — 2 DKIM CNAMEs, brevo-code TXT,
   `include:spf.brevo.com` in SPF, replace the dead `_dmarc` CNAME (dmarc.simply.com) with
   Brevo's `p=none` TXT; domain registered in Brevo 2026-11-03, not yet authenticated.
   (b) own Brevo key → `wrangler secret put BREVO_API_KEY_WEB` (sign-up mails) and repo secret
   `BREVO_API_KEY` (weekly send). (c) ✅ privacy pages DK+UK published 2026-11-03 (Mikkel's call, ahead of
   launch): digest section, Brevo as processor, retention 7 d unconfirmed / 30 d after
   unsubscribe. Migration 083 applied live 2026-11-03. Then `emailDigest: true` per site +
   deploy. (d) `DIGEST_SEND=1` after a preview.
   Brevo free plan: 300 mails/day, shared with Fantasy Challenge/GFC; the script caps at 250.
3. **Local news after big honours** (All-Conference, titles, records, Team of the Year — not a
   single goal): link the athlete page or article. A map of local outlets only once enough
   athletes have answered. Photos: papers take them from the school, never from us.
4. **Athlete contact on an honour — either/or:** a background form for a better profile, OR a
   one-line DM («Congrats — if you'd like, a written or voice reaction for the article»).
5. **Experiments:** tag youth clubs and the US school on posts. Social posting is NOT paused
   (there is an audience). No mention bot (resources).
Every experiment: own `?source=` tag, ≥ 4 weeks, one metric fixed in advance.

## 📡 Feeds that never showed whole sports or the athletics site (2026-11-02)

- **Curated main feeds:** Illinois's `/rss` carries ~10 football/basketball/volleyball stories;
  XC, track and golf only in sport feeds (`?path=mcross` …). Frank Buchanan's Second-Team
  All-Big Ten (30/10) was never seen. New table `school_feeds` (migration 082): extra feeds per
  school, read after the main feed by `check-sources.ts`, body-pass share per school. Illinois
  has 5 (m/w XC, m/w track, m golf). Run once → 18 stories, Buchanan = story 18549.
  Other `/rss` feeds sampled (8) carry mixed sports — curation looked Illinois-only; no
  general detector yet (a school with stories in some sports passes every check).
- **Feeds on the college site, not athletics:** 134 of 638 site schools had 0 feed stories in
  30 days. 33 of them (125 UK/DK athletes) pointed at the college's general news; replaced
  with the athletics site's `/rss` (host taken from the athletes' `bio_url`, feed verified
  ≥3 items, newest < 21 days). Old → new in `logs/feed-fix-2026-11-02.tsv` (WSL only, gitignored).
  Belmont Abbey (20 athletes) → 5 stories on the first run. The other 98 zero-story schools
  already read their athletics site: quiet, or dead (`repair-feeds.ts`: 42 still dead, 21 of
  them HTTP 403). repair-feeds' 3 proposed swaps (Marymount, Alice Lloyd, Brescia) NOT applied —
  college `/rss`, content unverified.

## 🔎 Body-pass starvation fixed (2026-10-31, ef6f1d9)

- Discovery's body pass (opening feed articles to find names below the headline) used its 600 pages in a fixed order and ran out around school 150 of 200. **174 of 638 schools with UK/DK athletes (750 athletes) had never had an article opened**; those athletes only got stories when named in a headline or summary.
- Fix (`pipeline/discover/body-budget.ts`): site schools first within a run, an even share of the remaining pages per school, items newest first. `check-sources.ts --school <id>` checks one school now.
- Found by Josh Lane (RMU, UK): program record of 18 career shutouts, in the body of "RMU Earns a Point … at Cleveland State". Run once for RMU → story 16848 (also 16845 Abdul Kamara UK, 16846 Filip Jeppesen DK). Desk picks it up at its next run.
- To check: `SELECT count(*) FROM feed_items_seen WHERE school_id=…` should be > 0 for most site schools within a few days.

## 🤖 Bot traffic + desk source cut (2026-10-30)

- **Audit 2026-10-29** (`logs/ga4-bot-check.ts`, read-only, 1-28/10): GA4 UK ~85% of 2,370 sessions
  from data centres — Meta's link checkers (Prineville, Luleå, Forest City, Dublin, Fort Worth,
  Altoona, Gallatin: «Organic Social», ~10 s, 2000×2000, a third even count as engaged), AWS
  Boardman, a Chinese wave (Urumqi). DK ~40%. Our own `events` had the same (isbot passes them):
  UK 3,323 views, 2,019 with a Facebook referrer. **Social page views were mostly Meta, not people.**
  Trustworthy: Search Console clicks ≈ our Google referrals (UK 304 vs 376); GA4 sees ~half (consent).
- **#95 live (b4ffeff deploy):** `/api/track` drops visits from data-centre ASNs (`isDatacenterAsn`
  in `src/lib/analytics.ts`: Meta, AWS, Google Cloud, Azure, Oracle, DO/OVH/Hetzner/Linode/Vultr,
  Alibaba, Tencent, Huawei; privacy relays kept). Events before 30/10 are unfiltered — compare
  social numbers only from 31/10. GA4 can't be fixed at source (no ASN).
- **#96:** the desk saw only 2,500 chars; John Hollis's Mercy program record (14 assists) sat at
  ~2,800 → wrong angle. `sourceText()` adds up to 1,200 chars of later sentences naming the
  athlete. Story 16018's decision corrected by hand (Mikkel's OK): priority 4, record angle.

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
watch. #77 (28/10) cut D1 reads (list queries without bodies, indexes) but **not CPU**: still
~1.5M CPU-ms/day (≈46M/month vs 30M included) on 4 Nov. Measured 4 Nov: a Next render costs
300–600 ms CPU; ~30 % of Worker calls were uncached 404s (scanners, Googlebot on removed
profiles); 5-min edge TTL gave ~5 % hits; `/api/track` 180 ms per beacon through Next.
**CPU cut live 5/11 07:37 UTC (#106, deploy 63ae14e7):** `workers/entry.ts` answers probes (`isProbe`: dot-paths, .php/.env/
.json…, unknown `/api/*`) with a plain 404 and the beacon itself (`src/lib/track-ingest.ts`);
404s cached 1 h; article pages (`/<sport>/<slug>`) 1 h edge TTL (middleware), so an article
correction can take up to an hour to show. Expected ~0.6–0.9M CPU-ms/day. 403s on `/.env` etc.
come from Cloudflare's WAF and never reach the Worker.

**Tooling.** Ops MCP server (`mcp/`, #74): `status` overview, CI runs/failures, Claude usage +
quota, guarded D1 reads, D1 top queries. Every workflow's failure alert goes through
`.github/actions/notify-failure` and names the failed step. CI runs every `_*-test.ts`. The Worker MCP (`/api/mcp`, `SETUP-mcp-desktop.md`) is Claude Desktop's
editing connector — a different thing.

---

## Waiting on Mikkel

1. **Photo-permission outreach** — built (`pipeline/photos/`, ledger migration 068).
   **First batch sent 2026-11-02:** all 7 South Atlantic Conference schools (Anderson, Catawba,
   Lenoir–Rhyne, Lincoln Memorial, Newberry, UVA Wise, Wingate), 11:46–12:29 UTC, all `sent` in
   `photo_events` (Anderson also has one `failed` row from a first run without `BREVO_API_KEY` in
   that shell). Influxer never answered (emailed 27/10), so we went ahead. Lincoln Memorial went
   to christopher.haley@ with an extra line apologising for a possible mix-up with an Adam Haley
   (`SCHOOL_NOTES` in `request-permission.ts`). Open: replies — record each with `--respond`
   (granted/conditional/declined/forwarded/bounced/do-not-contact); no automatic follow-ups.
   **First answer 2026-11-02: Newberry — granted** (Christopher Williams, Asst AD Communications:
   «Yes you have permission to use our material», no conditions); recorded with `--respond`. Delivery is unconfirmed (Brevo accepted ≠ delivered): watch
   info@studentathlete.dk for bounces. Next conference needs Mikkel's contact approval. `--pause
   min-max` (minutes, default 8-15) shortens the gap between mails for small batches.
   `BREVO_API_KEY` is set (2026-10-29, verified read-only); in a plain shell it can be missing —
   run via `bash -ic`.
   **Credits live since 29/10 (#86, migration 080 + backfill: 2,905 photos got a source
   link):** «Foto/Photo: {School} Athletics · Kilde/Source» on profiles, «Fotos/Photos: …» under
   school rosters; schools with `declined`/`do_not_contact` show no photo anywhere (read-time
   gate, `src/lib/photo-permission.ts`); «Fjern foto» in admin removes at once. Grants so far:
   Newberry, Hofstra (+ Fresno 2023). From 5/11 the email asks for photos on the athletics WEBSITE
   (articles + roster profile pages; article photo first, profile as backup). Newberry/Hofstra said
   yes to the old article-only wording: ARTICLE PHOTOS ONLY there (Mikkel 5/11: no follow-up).
2. **Influxer merch links** — 104 verified stores live on profiles (#70); ~17 probable
   (transfers) + ~80 namesakes need his choice. `merch-clicks.ts` for the pitch.
3. **Fanatics** — declined 28/10 (generic reasons). Appeal to partners@fanatics.com with traffic
   numbers, or drop. Impact's recommender returned no UK/DK programs.
4. **LIA section D** (`UDKAST-LIA-interesseafvejning.md`) — legal basis for the 13 collecting
   countries incl. a 12-month deletion limit. Collecting already runs.
5. **AdSense .co.uk** — reapply ~16–20 Nov. Live 2026-11-02 (6680336): the AdSense script is
   only on INDEXABLE pages (`src/components/AdsenseScript.tsx`; layout keeps only the
   verification meta). Why: the AdSense crawler reads every page with the ad tag and ignores
   noindex, so the 569 UK profiles under the 200-word floor were still in its review. Google
   says AdSense's own index takes 1–2 weeks to reflect changes. GSC (2/11): ~82% of the 1,276
   removed profiles still indexed in Search, last crawled Sept — that is Search, not AdSense.
   Crawl 2/11: no indexed UK page under 200 words except the /athletes hub (167, nav page).
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
- **CPU after the cpu-cut deploy** (a day of traffic): `npx tsx pipeline/checks/platform-limits.ts`
  — daily CPU should fall from ~1.5M to under 1M CPU-ms. If not, `wrangler tail --format json`
  carries `cpuTime` per request.
- **Social retention after #80 — check from ~5 Nov, ideally 12 Nov.** Live since
  **2026-10-29 07:42 UTC** (deploy 271865f0, commit 1770fe8): read next that never runs dry
  (athlete → sport → school → country), athlete card, clickable tags, band for `?source=`/`?kilde=`
  visitors. Before: «related» was empty under 47 % UK / 36 % DK of articles. Run
  `npx tsx pipeline/report/social-retention.ts` (GA4 Data API, read-only; equal windows around
  29 Oct). Baseline 15–28 Oct, social sessions: UK 1,156 (2× the fortnight before), 29 % engaged,
  1.01 views/session, 2 s engaged time; DK 14. Reminder task fires 5 Nov 09:00. Small numbers —
  read the direction, not the decimals.

## Standing decisions

- .dk promises a person reads every article; the no-auto-publish rule governs PROSE about named
  people. Machine publishers that are approved: the Opus editor (UK drafts), desk lines, sourced
  table facts (honours, stats, leaderboards), rule-based profile refreshes that only ADD facts.
- Publishing by hand is spaced 17–23 min per site.
- Collecting countries' stories are links only until a site exists.
