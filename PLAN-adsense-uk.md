# Plan: get student-athlete.co.uk through AdSense (drafted 2026-10-12, awaiting Mikkel's decisions)

## Where we stand (measured 2026-10-12)

- AdSense: studentathlete.dk READY (auto ads on). student-athlete.co.uk NEEDS_ATTENTION,
  rejected for **low value content** on 2026-10-09 (`scripts/adsense-report.ts`).
- What the UK site shows a visitor:
  | Surface | Public | With substance |
  |---|---|---|
  | Athlete profiles | 2,833 | 252 have ≥1 article, 63 have ≥2, 19 have ≥3 |
  | School pages | 636 linked from /schools | 161 have an athlete with an article |
  | Articles | 342 | average 169 words; 72 % under 200; 6 over 350 |
  | Fixed pages + guides | 6 + 13 | (.dk, approved: 52 pages) |
- The 2026-10-09 fix (e9ca9d7) noindexes profiles/schools without an article and drops them
  from the sitemap. That hides them from Google Search, **not from the AdSense reviewer**, who
  browses: /schools links 636 schools, and e.g. /schools/adelphi links 11 athletes of whom 8
  are noindex shells (name, school, sport, nothing else).
- The richer-articles work has not moved length yet: UK articles since 2026-10-08 average
  170 words (71 % under 200). The sources are short; there are only so many verified facts.

So roughly nine in ten pages a reviewer can click are templates with a name in them. That is
the textbook «low value content» pattern, and it outweighs the articles.

## Steps

### 1. Depublish what has nothing to say (Mikkel's proposal: yes)
- **Profile public only with ≥1 published article.** 0 articles → 410 Gone (drops out of
  Google fast), and gone from /athletes, school rosters, search, statistics lists, sitemap.
  Rows stay in D1; the pipeline keeps scraping, matching and writing as now. The day the first
  article is published, the profile appears.
- **Indexed only with ≥2 articles** (my recommendation): a 1-article profile mostly repeats its
  article, so it stays visible (bylines link to it) but noindex — as today. 0 / 1 / ≥2 =
  2,581 removed / 189 visible-noindex / 63 indexed.
- **School pages** public only with an athlete who has an article (161). The roster lists
  only public athletes, plus a count line without names: «and 8 more British players on the
  roster» — our own data, no thin links.
- **Per country, not global.** A country flag next to `indexThinProfiles`
  (`publishThinProfiles`, UK false, DK true): .dk is approved and is not touched.
- **Cloudflare cost:** don't count articles per request. An additive column
  `athletes.public_articles` (kept by publish/unpublish/reject in admin.ts and
  apply-draft-decisions) plus an index; listings filter on it. One write per publish.
- **Side benefit:** no public pages about ~2,600 people we have written nothing about —
  simpler UK legitimate-interest case (UDKAST-LIA).
- Public URLs on .co.uk: ~3,800 → ~800.

### 2. Make the pages that remain worth a visit
- **Profiles with ≥2 articles become hubs**, computed, not written: this season's line (school
  stats page, dated), our articles as a timeline, the roster angle, honours from
  `athlete_events`. Original compiled data is what a press-release rewrite lacks.
- **A floor for standalone UK articles** (decision): a weekly award or a single-line result
  with nothing else verified (under ~120 words after writing) is not published as its own page.
  It goes on the athlete's profile timeline instead (or onto the match report, as step 2b of
  PLAN-richer-articles already does). Fewer, fuller pages. Measured share to be taken from the
  next 50 drafts before the number is fixed.

### 3. Evergreen content the UK site lacks
- **Sport hubs from our own data** (/football, /golf …): British players by division and
  conference, schools with the most British players, the latest articles. Counts and links
  only to public profiles. Precomputed daily like `stats-daily`, so no per-request cost.
- **6–8 more UK guides**, written for British families and checked against sources: A-levels
  and NCAA eligibility, the UK school year against the US recruiting calendar, D1/D2/NAIA/JUCO,
  scholarships and costs in pounds, visas (F-1), what agencies do and charge. Draft by Claude
  with sources; Mikkel reads before publishing (as with the 13 existing guides).

### 4. Site check before reapplying
One pass over every UK template: no Danish strings, no empty «no articles yet» blocks, no
visible ad placeholders, working nav/search on mobile, /about /contact /privacy /cookies
reachable from every page, ads.txt correct. A short script that crawls the sitemap and
flags pages under N words or with errors, so the check can be rerun before every application.

### 5. Reapply once, not repeatedly
After 1–4 are live, wait for Google to recrawl (410s gone from Search Console, ~1–2 weeks),
then request review once. Status via `scripts/adsense-report.ts`. Repeated quick
reapplications only add rejections.

### 6. Rule for new markets (PLAYBOOK-nyt-land.md, step 10)
A new site launches with thin profiles unpublished, and applies to AdSense only when it has
~150 articles, the sport hubs and ~10 guides. The UK lesson costs nothing to apply up front.

## Decisions for Mikkel
1. Profiles: public at 1 article and indexed at 2 (recommended), or public only at 2?
2. A floor for standalone UK articles (award/one-liner → profile timeline instead)?
3. Will you read 6–8 new UK guides before they go out?
4. School rosters: show «and N more British players» without names?
