# StudentAthlete — Claude Code guidelines

Two sites, one engine: **studentathlete.dk** (Danish athletes, Danish) and
**student-athlete.co.uk** (British athletes, English). Current state and open
items: `projekt-status.md` (newest sections at the top). Audited 2026-09-30.

## Language

- **Code, comments, commit messages, docs and status files: English.** Older files
  are in Danish; new text is English, and a file being Danish is not a reason to
  continue in Danish.
- **Reader-facing text belongs to the SITE**: Danish on .dk, British English on
  .co.uk, through the language packs (`src/lib/i18n/da.ts`, `en.ts`). Sentence
  case in headlines on both.
- **Admin is Danish on purpose** (`ADMIN_LANG`), not by fallback.

## Sites are separate, only the engine is shared (Mikkel, 2026-08-21)

Everything a reader sees — text, URLs, dates, metadata, share cards, feeds —
belongs to the site. Only discovery, scraping and the core are shared.
- Language is a **required** parameter, never `lang?`: a forgotten argument must
  be a type error. `src/lib/_no-danish-default-test.ts` enforces it.
- Site differences are fields on the country profile (`src/lib/countries/`), and
  new fields are **required**, so a new country must decide rather than inherit
  (e.g. `hasPrivacyPage`, `darkLaunch`).
- Section paths and the fixed pages (/about, /contact, /privacy …) are
  `RouteKey`s: the middleware rewrites the site's own slug to the physical
  (Danish) route or `pages` storage slug, and 308s the other language's slug.

## Collecting countries (2026-09-30)

Australia, Germany, Sweden and Spain are **collecting**: `src/lib/countries/collecting.ts`, no
domain, no site. Their athletes are classified by the roster scrapers (`classifierCountries()`),
their stories attached by discovery, their awards recorded by the honours scraper — so the history
exists at launch. Anything that writes for readers or spends the LLM chain (fact sheets, article
generation, profile drafts, Instagram and photo queues) filters on `siteCountrySql()`. They are not
in `COUNTRIES`, so no host, sitemap, stats or social exists. The legal basis is a draft addition to
`UDKAST-LIA-interesseafvejning.md` (section D) awaiting Mikkel.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (`@theme` in
  `globals.css`); design system in **DESIGN.md**.
- Cloudflare Workers via `@opennextjs/cloudflare`, entry `workers/entry.ts`
  (an edge cache in front of OpenNext; a page's own `s-maxage` wins if longer).
- **Workers Paid since 2026-09-30** ($5/month): 30 s CPU per request (ours
  capped at **5 s**, `[limits] cpu_ms` in `wrangler.toml`), D1 25B reads / 50M
  writes a month, 10M requests + 30M CPU-ms a month, Browser Rendering 10 h/month
  then $0.09/h. Overage is billed, not blocked. R2 is still not enabled.
- D1 (SQLite), binding `DB`. The schema is the migrations in `db/`
  (`migration-NNN-*.sql`); do not trust any table list in a doc.

## Sports

The list lives in code: `SPORT_KEYS` in `src/lib/sports.ts`. A new sport needs a
key in every place — name and slug in both language packs, colour/emoji/icon in
`sports.ts`, icon path in `CategoryNav.tsx`, position codes in `positions.ts`,
pillar text in `sport-content.ts` + `sport-content-en.ts`. The type system fails
if one is missing.

## Claude's boundary towards live (agreed with Mikkel 2026-08-25, updated 2026-09-30)

Claude already holds everything needed to change the live sites
(`CLOUDFLARE_API_TOKEN` in `~/.bashrc`, a `gh` login with `repo` and `workflow`).
The boundary is agreed, not technical, and written here so a new session
inherits it instead of rediscovering the keys.

**Without asking — code:**
- change code, run typecheck and tests, commit and push to `main`
- deploy with `bash scripts/deploy-live.sh` — and only through that script
- `bash scripts/migrate-live.sh <file>` for **additive** migrations (it refuses
  anything else)

**Ask first — anything that touches data or readers:**
- other D1 writes (`wrangler d1 execute --remote`, seeds, data fixes)
- `gh workflow run` — several workflows generate and post by themselves
- `pages` and `site_content`: there is NO draft state; an edit is public the
  moment it is saved
- anything that publishes: draft → `published`, social posts, sends

The line is not big vs. small but **what can be undone**. A code deploy rolls
back with another deploy; a publication cannot — it has been read, and the
sites write about named people.

**Publishing on instruction (practice since 2026-09-29):** when Mikkel says so
("publish the good ones, reject the bad ones"), Claude checks each draft against
its FULL source, corrects what the source supports, and publishes through
`pipeline/fix/apply-draft-decisions.ts` — which spaces publishes **17–23 minutes**
apart (Mikkel, 2026-09-24: a batch going live at once looks spammy). Run it
detached, give the expected end time, and never publish without that instruction.

### The standing exception: the 01:00 correction run (agreed 2026-09-10)

The Windows task `StudentAthlete-kladderettelse` runs
`scripts/review-drafts.sh --fix` nightly and writes to D1 **without asking**:
verdict `fix` → corrected text into an **unpublished** draft
(`articles.content` + `claude_fixed_content`; never `published` or
`original_content`); verdict `reject` → save to `review_log` and delete. It does
not publish and does not touch `pages`/`site_content`. Daytime runs catch up if
more than 20 h have passed (`logs/review/.sidste-rettelse`). Switch off with
`Unregister-ScheduledTask -TaskName StudentAthlete-kladderettelse`.

### The cloud review (2026-09-28): review only

`.github/workflows/review-drafts.yml` runs `review-drafts.sh --review-only` every
3 hours on Mikkel's subscription token (`CLAUDE_CODE_OAUTH_TOKEN`), writes
verdicts to `draft_reviews` and pings Discord. It never corrects, rejects or
publishes. **The repo is public, so its Actions logs are too**:
`REVIEW_PUBLIC_LOG=1` keeps draft titles and summaries out, and no workflow may
upload draft text as an artifact.

Mikkel checks drafts in **`/admin/tjek/<id>`**: draft and full source as plain
text, numbers and names looked up in the source (green in source, blue our DB,
amber number not verbatim, red name not in source).

## Editorial rules

- **What the sites promise** (public pages, 2026-09-30): on .co.uk every article is
  checked against its source and *usually* read by a person; the per-article AI
  disclaimer says "checked against its sources before publication". **The .dk
  pages still promise that a person reads every article** — keep practice and
  promise aligned, or change the promise.
- **Writing prompts** (`pipeline/generate/prompts/`): `en.ts` and `system.ts` (DA)
  are one contract in two languages — change a rule in both. Length follows the
  facts (80–200 words for a result or award), no evaluative filler, nothing about
  the person beyond the source, the article may go live days later, hometown is
  not a birthplace. Gemini 2.5 Flash writes the articles; Mistral does fact
  sheets and checks. Subheadings under 350 words are stripped in code.
- **Hometowns and classes from our own records are house practice**; a review
  finding that only objects to a DB hometown is not an error.
- **Scripts before LLMs**: a rule a model keeps breaking is enforced in code
  (e.g. `stripShortArticleHeadings`), not repeated louder in a prompt.

## Data rules

- **Removing a false match** (not our nationality, broken row): `active = 0` is
  NOT removal — inactive athletes show as "Former athlete". Clear `home_country`
  too; `pipeline/report/cleanup-false-positives.ts --apply` does both. Then fix
  the classifier (`src/lib/hometown.ts`, the country profile's
  `falsePositivePatterns`) so the match can't return.
- **Roster scraping: ask the school, don't guess.** The team list is data:
  `pipeline/scrape/sport-inventory.ts` finds a school's real teams;
  `roster_checks.sponsored = 0` is the negative register; new Sidearm (Nuxt)
  rosters come from `/api/v2/rosters`; unknown sport slugs go to `other` via
  `SOURCE_ALIASES`, never a wrong label; every fetch goes through
  `robotsAllows()`. `not_found`/`robots_denied` are permanent; 429/403/5xx/
  timeouts are transient and MUST be retried.
- **Browser Rendering** (JS-rendered rosters, box scores): every render goes
  through `renderPage` in `pipeline/lib/browser-render.ts`, which enforces the
  shared budget in `pipeline/lib/browser-budget.ts` — 900 min/month read from
  Cloudflare's own usage, paced per day, max 60 min/day. Nightly scrapers set
  `BROWSER_RUN_SHARE=0.5`. Avoid the CF JSON format (it spends Workers AI).

## SEO: plan first, content decides (Mikkel, 2026-08-21)

1. **Never SEO work without a plan Mikkel has seen and explicitly approved.**
2. With an approved plan, small changes may be made independently — large ones never.
3. **Content is the frame**: a keyword that makes technical sense but not for the
   page's actual content loses (Temple University is not about temples).

Technical faults are not SEO work and may be fixed without a plan: 404s, dead
sitemaps, wrong canonicals, missing hreflang, language/country leaks. Text and
structure changes with a search purpose (titles, meta descriptions, headings,
internal linking, URL structure, new pages aimed at a keyword) need the plan.
Numbers: `./scripts/search-console.sh`. Deliver findings as proposals.

## Monitoring

- `pipeline/checks/platform-limits.ts` (daily workflow; `health-check.ts` runs
  it): month-to-date usage projected to month end, overage priced, 1102 share.
- `pipeline/checks/quality-sweep.ts` (Mondays): run it FIRST when asked what to
  work on.
- Stats page numbers: `pipeline/report/build-stats.ts` (daily) → `site_stats`.

## Scripts

| Script | Purpose |
|--------|---------|
| `bash scripts/deploy-live.sh` | The only way to deploy (main, clean tree, pushed, typecheck) |
| `bash scripts/migrate-live.sh <file>` | Additive migrations only |
| `npm run dev` | Local dev server |
| `./scripts/build-desktop-pack.sh` | Context pack for Claude Desktop (`desktop-pakke/`) |

## Design changes

Start the dev server, change the code, screenshot at desktop and 390 px width
(Playwright MCP, or headless Edge from WSL when Linux Chromium lacks libraries),
adjust, repeat.
