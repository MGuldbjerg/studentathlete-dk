# Plan: fuller articles without more hallucination (agreed with Mikkel 2026-10-07)

**Principle:** articles get longer from more *verified* facts, never from more words per fact.
Rule 2 in the writer prompts already forbids padding, so length follows the fact sheet. Every
new fact is either verbatim from the source (and checked by `verify-factsheet.ts`) or computed
in code from our own data. The model only phrases it. Phrasing stays objective: a ranking or
a record is stated, never characterised («efficient», «dominant»).

## Order

### 1. Richer fact sheets — DONE (PR #11, 2026-10-07)
- `source-window.ts`: the model reads a chosen 8000 characters, not the first 8000 (box-score
  tables hid the athlete in 53 of 200 stories).
- `context` field: team result/record/standing, rankings, season and career totals, programme
  records, team-mates' awards. Grounded, kept apart from the athlete's `stats`.
- Measured on 50 stories: 9.4 → 13.1 facts per sheet. Known gap: the attribution check drops
  true tennis bracket results (Billson, #8143) — removal-only, fix with step 2.

### 2. Same athlete, same event: one article (DONE — 2c dropped)
Measured 2026-10-07: of 317 articles in 45 days, 28 pairs were the same athlete on the same
site within 4 days.
- **2b DONE (#13, live 2026-10-07): single matches are never held.** Weekly awards are on a
  set schedule (83 % published Monday or Tuesday), but that is 2–3 days after a weekend match.
  `award-section.ts` + `src/lib/article-addition.ts`, migration 064.
  - Award arrives while the recap is an unpublished draft → appended to the draft.
  - Recap already live → a pending `addition` row in the draft queue; publishing it appends
    «Update, 7 October: …» to the article and removes the row.
  - The award's source must name the recap's opponent/tournament; no match → own article.
  - Backtest: 23 of 157 weekly awards in 45 days attach, all checked by hand.
  - No second social post for an added section (Mikkel, 2026-10-07: «just leave that»).
- **2a DONE (#12, 2026-10-07): multi-day tournaments (golf, tennis) are held up to 48 hours**:
  day reports and the final become one recap when the final arrives, or after 48 hours.
  `tournament-hold.ts`, migration 063 (`stories.merged_into`).
- **Never two matches in one article** (risk of cross-attributed numbers with free models).
- **2c DROPPED (tested 2026-10-07): preseason teams and watch lists as one article per list.**
  Mikkel's bar was «if the free LLMs can't handle those, drop them» and «one wrong pairing and
  the format is dropped». On the 57 list stories of 60 days (5 groups with two or more of a
  site's athletes):
  - Gemini 2.5 Flash put praise in 3 of 5 intros despite an explicit ban («prestigious»,
    «exceptional talent», «prestigefyldte»); ministral-8b invented a list name («2027 Walker
    Cup roster» for the Haskins Award watch list).
  - One release often names players to SEVERAL lists (UAH: Orzechowski and Wright to the
    preseason All-GSC team, Rigby and McCabe to the Newcomers to Watch list). Code can tell a
    player is on *a* list in the release, not reliably on *which* — the wrong pairing that was
    the bar.
  - Small gain: lists come in two or three waves a year.
  List stories stay one article each, through the normal checks. Do not retry without a way
  to attribute each player to a list.
- Rejected: weekly round-ups (Mikkel).

### 3. Facts from our own database, computed in code — DONE (#14, live 2026-10-07)
`records.ts`; the sheet's `records` field, labelled as ours; the writer may use 1-2 sentences.
- Our earlier articles: up to three of our own published headlines about the athlete since
  July, with the event date from their sheets.
- The national angle: «one of 4 British players on Fort Lewis College's men's soccer roster
  (as of …)» — active athletes of that nationality, school, sport and gender; two upwards.
  Spot-checked by name on live data (LMU golf 9, Princeton FH 8, UAH soccer 8).
- NOT built: «the third British player to win an RMAC weekly award this season» —
  athlete_events stores award categories without the conference.
- Previous school (transfers) is Mikkel's call: not house practice yet.

### 4. (merged into 5)

### 5. Season and league statistics from stats pages
Same machinery for all three: fetch a table, stamp the date, match names exactly or skip.
1. **DONE (#15, 2026-10-07)** National team rankings from NCAA.com. `pipeline/stats/ncaa-rankings.ts`
   daily in `stats-daily.yml`, table `team_rankings` (migration 065). Soccer, field hockey,
   basketball when in season; volleyball left out (tables count sets). Dated by the table's
   «through games» date; tables older than 10 days are out of season (basketball on 7 Oct
   was last April's). Exact school match after «St.»/«U.» expansion only.
2. **DONE (#16, 2026-10-08)** The athlete's season statistics from the school's own stats
   page. `pipeline/stats/season-stats.ts`, fetched once per soccer/field hockey article at
   generation (next to the roster URL we already scrape). Both Sidearm layouts; tables found
   by their columns; exact full-name match or nothing. Checked on live pages against the
   sources (Deighan 6, Cotton 5, Picksley 5, Sykes 4 + team lead, Mujica 4 shutouts).
3. **ASSESSED, NOT BUILT (2026-10-08)** Conference standings from conference sites. Probed six
   of the largest: every site has its own columns (Ivy «CPts», Sun Belt «Conf. Points», NE10
   «Points»), Conference Carolinas splits into divisions, the GSC standings URL lands on the
   front page, G-MAC did not answer. It would need a hand-checked setup per conference for 97
   conferences (top 25 = 66 % of our soccer/FH athletes), and step 1's `context` already
   carries standings whenever the source states them («second in the CCAA, two points
   behind…»). Build for the largest conferences only if Mikkel asks for it.

Rules: clear rankings only (outright or tied first, top 3 in conference, top 10 nationally,
after ≥ 4 matches); always dated («as of 6 October», «before Saturday's match»); team sports
first (soccer, field hockey, volleyball, lacrosse); NCAA only.

Each step is measured before and after on the same stories (facts per sheet, article length,
what the draft review flags).

## Cloudflare costs (Mikkel, 2026-10-07 — standing rule for all of this)

D1 bills rows *scanned*; Workers bill requests and CPU; Browser Rendering bills hours.
- **All extra work runs in the pipeline (GitHub Actions), never on a reader's page view.**
  Merged sections, context lines and rankings are stored once in the article text; the
  reader pages stay exactly as cheap as now and behind the edge cache.
- **Every new lookup goes through an index.** Step 2 looks up articles and stories by
  athlete: `idx_articles_athlete`, `idx_stories_athlete`, `idx_athlete_events_athlete`
  already exist (checked 2026-10-07). Query by `athlete_id IN (…)` once per run, not one
  correlated subquery per story. No `COUNT(*)` over whole tables.
- **New tables get their index in the same additive migration** (e.g. pending added sections:
  index on `(status)` and `(article_id)`).
- **No Browser Rendering for any of it.** NCAA.com and Sidearm stats pages are server-rendered:
  plain `fetch` from Actions. One fetch per table per day, snapshot kept, never per article.
- **Estimate before shipping:** rows read × runs/day for every new query; check
  `wrangler d1 insights studentathlete-dk --sort-type sum --sort-by reads --timePeriod 1d`
  after each step goes live.
- Step 1 cost nothing on Cloudflare: the model calls go to Mistral, and the fact sheet is the
  same one-row write as before (a little more JSON).
