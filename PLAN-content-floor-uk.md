# Plan: a 200-word floor for indexable .co.uk pages (2026-10-26, approved by Mikkel the same day)

AdSense rejected .co.uk twice for «low value content» (2026-10-09, 2026-10-22). Mikkel set a
floor of 200 words for indexable pages (Yoast suggests 300 for posts). This plan says how to
reach it with **data we hold or can fetch**, not with filler.

## Where we stand (site-check 2026-10-26, `logs/site-check-uk-2026-10-26.json`)

| Page type | Indexable | Under 200 words | Median words |
|---|---|---|---|
| Athlete profiles | 949 | 859 (91 %) | 125 (p10 99, p90 198) |
| School pages | 104 | 104 (100 %) | 106 (p10 73, p90 160) |
| Articles (all sports) | ~500 | ~60 | — |
| Letter pages, /athletes, /articles, a few hubs | ~35 | ~14 | — |
| **All** | **1,633** | **1,030 (63 %)** | 157 |

The 908 profiles with stats are 820 football + 88 field hockey; 694 are returning players and
214 enrolled in 2026. 867 already have an approved two-sentence summary (~25 words); 292 have
honours or milestones; 69 have a previous school.

## The rule for every added word

Word count is a proxy. Google publishes no minimum, and AdSense's «low value content» and
Search's «scaled content abuse» are both about pages that add nothing, whatever their length. One
sentence pattern copied onto 900 pages with only the name changed makes this worse. So:

- Every block adds a **fact the page did not have**: a number, a date, a comparison. The model
  is sports-reference/Transfermarkt: tables plus a few generated sentences that differ because
  the numbers differ.
- A block with nothing to say is left out, never filled with a «no data yet» line (site-check
  already flags empty-state sentences).
- No school text is copied. Bio pages give facts for a table (Mikkel, 2026-09-17).
- Pages that still miss the floor after this are **noindex and leave the sitemap and listings
  automatically** (step 7), so the reviewer cannot reach a thin page by clicking around.

## Profiles (859 under 200)

| # | Block | Source | Coverage | Est. words |
|---|---|---|---|---|
| P1 | **Career by season**: a table of every earlier season plus one line («14 goals in 51 games over three seasons; this season's 6 already beats his 2025 total of 4») | the school's stats archive: `statsUrl(roster, 2025/2024/2023)`, same parser as the daily fill (Furman `/stats/2025` and `/2024` checked: 200, player rows, Total and Opponents rows) | ~694 returning players | +40–70 |
| P2 | **Team context**: team record, the athlete's share of team goals, minutes and starts, rank on the team | the Total/Opponents rows on the stats page the fill **already reads daily**; nothing new to fetch | 908 | +30–40 |
| P3 | **Where they stand**: rank in the national and division tables, «among UK players with stats on file» | `stats_cache` 'leaderboard', already computed | players who appear in a table | +15–25 |
| P4 | **Background facts** (table): high school or club, previous college, shirt number and position by year | the bio page `scrape-honors.ts` already fetches (Furman sample: «Epsom H.S.», four years of roster history) | to be measured on 50 bios | +15–30 |
| P5 | **Longer summary**: the rule-based baseline (`profile-baseline-en.ts`) rebuilt with P1–P4 facts, ~60–80 words | own data | 908 | +35–55 over today |

Estimated outcome: a returning player goes from ~125 to ~260–300 words. A 2026 freshman gets
to ~220–250 without P1. A freshman with 1–3 games stays under the floor and is caught by step 7.
**Measure on 30 real profiles before building everything.** These are estimates.

## School pages (all 104 under 200)

| # | Block | Source | Est. words |
|---|---|---|---|
| S1 | A stats table of the school's UK players this season, one row each, linking public profiles | `athlete_season_stats` | +40–80 |
| S2 | School facts (city, nickname, conference, division with one line on what it means) and UK players by sport and by enrolment year | `schools`, `athletes` | +30–50 |
| S3 | This season's results for the teams with UK players (record, conference standing if on the page) | P2 data | +20–40 |
| S4 | **Fix (technical, no plan needed):** sport labels show as «tennis» and «soccer» on .co.uk school pages (seen on /schools/baylor, /schools/drexel); should be «Tennis» and «Football» | i18n | — |

## Navigation pages and short articles

- **Letter pages `/athletes/a–z`**: navigation, not content → `noindex, follow`. No text written to inflate them.
- **/athletes, /articles**: one short hand-written intro each, Mikkel reads it first (`pages` has no draft state).
- **~60 older articles under 200 words**: run `enrich.ts` over them (up to 4 computed lines each). Any still under 200 → noindex. Do not republish or rewrite them.

## Step 7: the floor in code

At build time each profile and school page gets an `indexable` flag from its blocks (e.g. P1 or
P2 present and the estimated words ≥ 200). Below the floor: noindex, left out of the sitemap,
/athletes, letter pages and school rosters. Those keep the count line («and 8 more UK players»).
`scripts/site-check.ts --min-words 200` becomes the gate before any AdSense request.

## Cost (Cloudflare and fetches)

- P1 is a one-time backfill of ~460 teams × 2–3 seasons ≈ 1,400 fetches, `robotsAllows()` on
  each, spread over a few nights. After that, one archive fetch per team per season change.
- P2/P3/S1/S3 are computed in the daily fill into existing tables or `stats_cache`. Each page reads
  O(1) rows per block, keyed on primary keys. Nothing is counted per request.
- P4 adds parsing to a fetch that already happens. No new requests.

## Order

1. S4 fix + P2 (data already fetched). Measure the effect with site-check.
2. P1 backfill (biggest gain). Dry run on 20 teams first.
3. P3 and S1–S3.
4. P4 on a 50-bio sample, then all.
5. P5: regenerate summaries → approval in /admin/profiler.
6. Step 7 gate + navigation pages + enrich old short articles.
7. Site-check: ≥ 95 % of indexable pages at 200+ words. Wait ~2 weeks for recrawl, then one review request.

## Decisions (Mikkel, 2026-10-26)

1. **What counts:** table cells with a few words do not; prose inside a table does. Rule (Claude's
   choice, Mikkel left it open): a `td`/`th`/`dt`/`dd` counts only with at least 5 words ending in
   `. ! ?`, or at least 10 words. The facts list is a `<dl>`, so its labels and values do not count
   either. Everything outside cells counts. Implemented in `scripts/site-check.ts` (default
   `--min-words 200`; `rawWords` keeps the old count).
   Re-measured 2026-10-26 by this rule: **1,117 of 1,632 indexable pages under 200** — profiles
   936/949 (median 77), schools 104/104 (median 95), statistics 6/6, articles ~57, letter pages 7.
   One 502 on a field-hockey article during the crawl (transient or not: check).
   Consequence for design: P1–P4 tables add little by this count. Each table needs its computed
   sentence(s) beside it, and that prose carries the floor.
2. **P5: rule-based summaries publish without approval.** This applies only to text built by code from
   our own fields (`profile-baseline-en.ts` + P1–P4 data). LLM-written profile text still goes
   through /admin/profiler. This changes the «profile_summary is never written automatically» rule
   in `AthleteProfilePage.tsx`; update that comment when building.
3. **Below the floor: noindex, out of sitemap and listings** (recommended, accepted).
4. **Letter pages: noindex, follow** (recommended, accepted).
