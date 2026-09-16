# Static pages — what to expand, and what not to build

**Researched 2026-09-15.** The brief was "new or expanded static pages". Mikkel's
own steer mid-research was to deepen the **sport landing pages** with
college-specific material: conference alignment, independents, the flow of the
season, number of games, the road to pro. The measurements below back that steer
and sharpen it — the gap is bigger and more specific than it looks from the page.

Nothing here is an approved change. SEO-touching edits need a plan you have seen
and said yes to (CLAUDE.md); this is that plan, offered for approval.

---

## 0. Conclusion first

**The sport pages are the right target, and the highest-value missing material is
not the flow of the season — it is the money.** Across 33 Danish and 33 English
sport pillars:

| Topic | Danish pages covering it | English |
|---|---|---|
| Scholarship type (headcount vs. equivalency) | **2 / 33** | 3 / 33 |
| Independent schools | **0 / 33** | 0 / 33 |
| Transfer portal (a guide we already have) | **0 / 33** | 0 / 33 |
| NIL / the House settlement | 3 / 33 | 2 / 33 |
| Number of games in a season | 5 / 33 | 2 / 33 |
| The road to pro | 9 / 33 | 7 / 33 |
| Conference structure | 12 / 33 | 9 / 33 |
| Divisions (D1/D2/D3) | 22 / 33 | — |

The pillars are short — 1.5–3.4 KB of prose, one `##` intro plus three or four
`###` sections. There is room to roughly double them without the page becoming a
wall.

**Headcount vs. equivalency is the single most consequential per-sport fact for a
Danish or British reader, it is set per sport by NCAA rule, and it is missing from
31 of 33 pages.** A reader asking "can I get a full ride in tennis?" gets a
different answer than in swimming, and the page does not tell them.

---

## 1. What exists today (so we expand rather than duplicate)

- **33 sport landing pages per language**, at `/{sport}`. Full parity: every
  sport with athletes in the database has a page in both languages. There is no
  missing sport page — that was checked key by key, not assumed.
- Shape is `SportContent { title, intro, metaDescription, pillar }` in
  `src/lib/sport-content.ts` / `-en.ts`. `pillar` is one markdown blob rendered
  at the bottom by `ArticleBody`.
- **The pillar is already admin-editable**: `resolveSportContent()` in
  `[...segments]/page.tsx` reads `pages(kind='sport')` from D1 over the code
  default. New prose sections need **no code change and no deploy**.
- 13 `/viden` guides per language, 3 markdown pages (om/kontakt/ai-brug) plus
  presseetik and cookies, A–Z athlete letter pages, `/skoler` grouped by division,
  `/artikler`, `/atleter`.
- `/spil-i-usa` is parked by your decision (2026-07-03) and stays parked. Nothing
  below depends on reopening it.

**Section headings are drifting.** 22 different `###` headings do the work of about
five ideas — "Sådan afgøres en kamp", "…en holdkamp", "…et mesterskab", "…et
stævne", "…et løb", "…en dyst", "…en konkurrence" are one section with seven names.
Worth settling while we are in there anyway.

---

## 2. Proposal A — a standard section schema for the sport pillar

Same six sections on every sport page, in the same order, in both languages.
Two are new, one is renamed, three already exist under drifting names.

1. **Intro** (`##`) — unchanged: why this sport is a Danish/British route.
2. **The season** — exists on 31/33. Add the thing that is usually missing: **how
   many games**, and the shape of the calendar (autumn/spring/both, championship
   window). Five pages state a number today.
3. **How it is decided** — exists under seven names; settle on one per language.
   Dual match, meet, regatta, bracket — the format a European reader does not know.
4. **Scholarships and squad limits** — ⭐ **new on ~31 pages.** Headcount or
   equivalency, how many scholarships the sport gets per division, what the House
   settlement's roster limits did to it. This is the section that answers the
   question people actually arrive with.
5. **The landscape: conferences, independents, where the level sits** — ⭐ **new or
   thin on ~21 pages.** Which conferences matter in *this* sport (they are not the
   football ones — the strong swimming, hockey and lacrosse conferences differ),
   and which schools play it as an independent. Independents are at 0/33 and are a
   real structural feature, especially in hockey, lacrosse and the emerging sports.
6. **The road to pro** — exists on 9/33. Draft or no draft, what "going pro" even
   means in this sport (rowing and fencing route to national teams and the
   Olympics, not a league), and how the graduation window we already model fits.
7. **Sources** — unchanged; the existing primary-source discipline is good and
   should extend to the new sections.

Plus: **every sport page should link the three guides it touches** — transfer
portal (0/33 today), redshirt/eligibility, divisions. That is internal linking we
already own and currently waste.

**Where it lives.** All of this is prose inside `pillar`, so it is written in
`/admin → Sider` with no deploy, and it stays editable. That is the cheap path and
I recommend it.

---

## 3. Proposal B — a per-sport fact box (small code change)

Sections 2 and 4 above contain hard numbers that readers scan for rather than
read: season window, number of games, scholarship model, scholarship count per
division, roster limit. Those want a box at the top, not a paragraph at the bottom.

That means an optional `facts` field on `SportContent` and a small component.
Honest trade-off, and it cuts against the editorial plan:

- ✅ Static, zero D1 reads, zero CPU — safe under the 10 ms Workers limit.
- ✅ Scannable, and the format search engines lift into answers.
- ❌ **Not admin-editable** unless we also extend `site_content` or the pages
  schema. Every correction becomes a deploy. The editorial plan's whole point is
  that you can fix text without a session.
- ❌ `ArticleBody` has no table renderer. A box is a component, or a definition
  list in markdown.

**Recommendation: do Proposal A first, in markdown, and only build the fact box if
the numbers turn out to be the part you keep wanting to correct.** If we do build
it, put the values in D1 with code defaults, like everything else.

---

## 4. Proposal C — the data block only we can write

We have the numbers no competitor has: **where our athletes actually are**. For
British footballers the answer is not the glamour leagues:

| Conference (soccer, active) | British athletes |
|---|---|
| Gulf South | 54 |
| Sunshine State | 46 |
| Great Midwest | 46 |
| Great Lakes Valley | 43 |
| Sun Belt | 40 |
| Mountain East | 37 |

Five of those six are **Division II**. "The British route into college soccer runs
through D2, and here are the six conferences it runs through" is a true,
checkable, editorially interesting statement about 917 athletes that exists
nowhere else. Soccer spans 380 schools; tennis 191, golf 175, track 157. The
smaller sports are genuinely small — volleyball 13 schools, ice hockey 14 — and
should get a sentence, not a table.

**Cost is the question, and it is already solved.** A conference rollup needs a
join from `athletes.university` to `schools.name`, which is exactly the kind of
scan that migration-049 was written for. `cachedStat()` exists, is proven, heals
itself on a stale read and needs no cron. A `sport_conferences` key per site is a
few rows read per render.

Two caveats to respect: **444 of 1,761 schools have no conference and 441 no
state**, so the block must state its own denominator rather than imply full coverage;
and the join is on a name string, which is the weak link — verify before trusting
it in prose.

---

## 5. Order of work

By our own athlete counts, not by how interesting the sport is.

| Priority | Sports | Why |
|---|---|---|
| 1 | soccer, track and field, golf, tennis, rowing | 917 / 315 / 278 / 261 / 204 British; soccer is also 128 of 267 Danish |
| 2 | swimming, field hockey, rugby, basketball, American football | 60–133 British each; football and basketball carry the Danish story |
| 3 | the remaining 23 | one pass for consistency; do not inflate a page about 2 athletes |

Danish and English are **separate writes, not translations** — the audiences are
separate and the facts differ (an academy release is a British story; the kicker
pipeline is a Danish one). That is 2 × 10 pages of real writing for priorities 1–2.

---

## 6. Other suggestions, outside the sport pages

**Guides worth adding** (13 exist; these are the gaps a reader actually hits):

1. **⭐ Eligibility after playing senior or academy football.** The biggest cohort
   on both sites is footballers, and the first question a released academy player
   asks is whether they have already spent their eligibility. We have no page.
   High value, genuinely under-served in Danish and British.
2. **⭐ Scholarships and what it costs.** Headcount vs. equivalency, the full-ride
   myth, cost of attendance, what a "50 % scholarship" leaves you paying. Pairs
   with section 4 of every sport page.
3. **F-1 visa, the I-20 and what you may earn.** Unique to international athletes,
   evergreen, and NIL income on an F-1 is a real question with a real answer.
4. **NIL and the House settlement.** Referenced in passing on three sport pages
   and inside the NCAA guide; the topic has outgrown a paragraph.
5. The NCAA Eligibility Center: registration and credential evaluation for
   non-US qualifications.

**Structural pages.** The known problem is that Google had never crawled the
`.co.uk` profiles — a discovery problem, and PLAN-indeksering says internal linking
and the sitemap are the only lever for Google. **Conference hub pages** would create
exactly those paths: 1,317 schools have a conference, our athletes sit in 621
schools. It is a real option, but it is a *new page type* with a real CPU and D1
cost, and it duplicates part of `/skoler`. **I would not build it until the sport
pages are done** — they are cheaper, they are already indexed, and adding the
conference and guide links from section 5 gets some of the same crawl benefit for
free.

---

## 7. What I would not do

- **Do not chase keywords the pages do not deserve.** This week's note dropped
  "ncaa" on `/viden/hvad-er-ncaa` for exactly the right reason, and nothing here
  changes that. All the clicks on both sites are name searches. These pages are
  worth writing because the reader needs them, not because they will rank.
- **Do not build state, division or class-year index pages.** Thin, duplicative of
  `/skoler` and the A–Z letter pages, and the same trap as `/ig`: a second surface
  that drifts from the one that already works.
- **Do not inflate the 23 small sports to match the big ones.** A page about two
  athletes should read like a page about two athletes.

---

## 8. Decision needed

1. Proposal A (section schema, markdown, admin-editable) — yes or no.
2. Proposal B (fact box, code) — now, later, or never.
3. Proposal C (conference data block via `cachedStat`) — yes or no.
4. Of the five guides in section 6, which ones.

---

## 9. Status: Proposal A is built (2026-09-15)

Approved and implemented. B and C are on hold at Mikkel's instruction.

**All 66 pillars (33 sports × 2 languages) now carry the same seven sections**,
in the same order: intro → season → format → scholarships and squad size →
conferences and independents → the road to pro → worth knowing → sources.

| | Before | After |
|---|---|---|
| Distinct `###` headings | 22 (DA) / 19 (EN) | **7 / 7** |
| Pages naming the scholarship model | 2 / 3 | **32 / 32** (+ the catch-all) |
| Pages covering conferences & independents | 12 / 9 | **32 / 32** |
| Pages covering the road to pro | 9 / 7 | **32 / 32** |
| Pages linking the guides | 1 / 0 | **33 / 33** |
| Median pillar length | ~2,200 | **~3,800 chars** |

`andet` / `other` is deliberately left partial — it is the catch-all bucket, not
a sport, and its scholarship section instead teaches the one question that
settles the money: is this an NCAA sport or not.

**Facts were verified against primary sources, not written from memory.** The
House settlement's squad limits apply *only* to Division I schools that opted
in; the old scholarship caps still govern everyone else, Division II keeps
equivalency, Division III awards nothing. Every sport page now says so in its
own terms. Sport-specific numbers used: football 105, rowing (W) 68, acrobatics
55, athletics 45, lacrosse 48/38, baseball 34, wrestling 30, swimming 30, soccer
28, field hockey 27, ice hockey 26, softball 25, flag football 25, fencing 24,
water polo 24, gymnastics 20, volleyball 18, skiing 16, basketball 15, bowling
11, tennis 10, golf 9, cross country 17. Sports outside the NCAA — squash,
sailing, cycling, ultimate, polo, archery, esports, men's rowing, men's rugby —
say so plainly, because that is the fact that decides the money.

Two corrections found on the way: acrobatics and tumbling was elevated to NCAA
championship status at the **January 2026** convention with a first championship
projected for **spring 2027** (not already contested), and the CHL eligibility
change of 1 August 2025 does not extend to Division III.

### ⚠️ The Danish site will not show any of this until D1 is updated

`resolveSportContent()` reads the D1 row over the code default
(`pillar: db.content || base.pillar`). **All 33 Danish sport pages have a
published row** in `pages(kind='sport', country='DK')`, seeded from the old code
default. The UK site has **no rows at all**.

Consequence: deploying the code publishes the English rewrite immediately and
changes **nothing** on studentathlete.dk.

The sync is prepared but **not run** — it is a production write of reader-facing
text, so it is Mikkel's call:

```
npx wrangler d1 execute studentathlete-dk --remote --file db/update-sport-pages-2026-09-15.sql
```

Checked before writing that file: all 33 D1 rows were **byte-identical** to the
pre-edit code default (git HEAD `132159e`), so there are no hand-edits to lose.
The file was then dry-run against an in-memory copy of the real rows — 33 rows
updated, 0 mismatches against the new code defaults. Only `content` and
`updated_at` are touched.

### Verified

`npx tsc --noEmit` clean, all 23 `src/lib/_*-test.ts` suites pass, eslint clean
on both files, and every one of the internal guide links in the pillars resolves
to a real guide slug in its own language (no `/viden/` link on an English page
or the reverse).

---

## 10. hreflang on the sport pages? Proposal: no, not yet (2026-09-15)

Asked while reviewing the drafts. Not implemented — SEO changes need an approved
plan, and this one argues against itself.

**There is already a decision on record.** `seo.ts` (2026-09-14) says it plainly:
the two sites are *siblings, not translations* — DK covers Danish athletes, UK
covers British ones, and the 2,879 athletes split disjointly between them. Hence
no hreflang and no shared `Organization`. That reasoning is correct for athlete,
school and article pages, which is most of both sites.

**The sport and guide pages are the honest exception.** 33 sport pages and 13
guides per language are the same subject in two languages — the textbook case for
hreflang. So the blanket rule is slightly too broad. Three things still argue
against acting on it:

1. **There is no problem to solve.** Every click on both sites is a name search
   (126 and 42 in the last 28 days), and the names are disjoint. The sites are in
   different languages, so they do not compete on the same results page. hreflang
   resolves competition between near-duplicates; we have none to resolve.
2. **This revision made the pages *less* alike, deliberately.** The Danish soccer
   page now says seven in ten Danes are at Division I; the English one says close
   to six in ten Britons are at Division II or III, and leads on academy releases.
   That is the right editorial call and it weakens the hreflang claim — Google
   ignores annotations between pages it does not judge equivalent.
3. **hreflang is not an indexing lever.** It tells Google *which* version to show
   someone who already found us; it does not help discovery. The UK discovery
   problem is a crawl problem, and `PLAN-indeksering.md` already names the only
   levers for it: internal linking and the sitemap. Section 2's guide links do
   more for that than hreflang would.

**Cost, if we ever do it.** Sports are cheap: the canonical-key ↔ per-language
slug map already exists in `i18n` (`sportSlugFor` / `keyFromSlug`) and pairs all
33 correctly. Guides are not: the two guide arrays are independent, with no shared
key joining `hvad-er-ncaa` to `what-is-the-ncaa`, so that mapping would have to be
built and maintained. Both sides need the annotation, including a self-reference,
or Google drops it.

**Revisit when** Search Console shows both properties taking impressions on the
same query — that is the signal that they have begun to compete. Until then the
existing decision stands, narrowed to: *no hreflang, because the pages that could
carry it have nothing to gain from it yet.*
