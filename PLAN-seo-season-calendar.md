# Plan: SEO for the NCAA season calendar (approved by Mikkel 2026-11-26)

Mikkel's words: "Approved, add 1-5 to the PR". Applies to both sites: natural Danish on
.dk (`/ncaa-saesonkalender`), British English on .co.uk (`/ncaa-season-calendar`).

The page answers a real reader question — when is each college sport played, and when are
the championships — with data we hold (`src/lib/season-calendar.ts`, sourced from the NCAA
2026-27 championship manuals and NAIA coaches' manuals). Content is the frame: nothing on the
page is written for a keyword that the data does not support.

## 1. Key dates, server-rendered

A «Key dates 2026–27» / «Vigtige datoer 2026–27» section under the interactive calendar,
generated from the same data module: one table per season (autumn, winter, spring), a row per
sport (men/women where split), a column per division (Division I, II, III, NAIA) with the
national-championship final dates (≈ marks an estimate) and the venue, plus a source link per
sport. Plain HTML in the first server render, so it is crawlable; tables scroll inside their
own `overflow-x` container on phones.

## 2. Title, H1, meta, intro

- Title and H1: «NCAA season calendar 2026–27: when every college sport is played» /
  «NCAA sæsonkalender 2026–27: hvornår spilles hvad?».
- Meta descriptions: factual, ≤155 characters (checked in `_season-calendar-test.ts`).
- The year is in the title and H1 only, never in the URL, so the address survives seasons.
- Intro of 150–200 words per language: the three seasons, NCAA Divisions I–III and the NAIA,
  and why tennis (D1 singles/doubles now in November) and athletics (three seasons) differ.

## 3. FAQ

Four questions at the bottom, two or three sentences each, each linking to an existing guide:
when the season starts, when All-Americans are named, the difference between divisions, and
NCAA vs NAIA. No FAQPage JSON-LD (Google no longer shows FAQ rich results for sites like ours,
and the markup adds nothing for readers).

## 4. Internal links

- Each sport page shows its own calendar rows and links to the full calendar, deep-linked to
  the sport (`#tennis`).
- The season-calendar guide and the divisions guide each get one line linking to the calendar.
- One footer link next to Statistics / Statistik on both sites.

Note: on .dk the guides are served from the `pages` table, so the code edit only changes the
fallback. The two Danish guide lines need a `pages` edit, which is public on save — Mikkel's
call (CLAUDE.md, "ask first").

## 5. Freshness

- A visible «Updated 26 Nov 2026» / «Opdateret 26. nov. 2026», from `SEASON.updated`.
- Recurring: swap in the 2027–28 data each summer (July), before the season starts — change
  `SEASON` and the dates in `src/lib/season-calendar.ts`, re-check against the new manuals.

## 6. Follow-up in Search Console

6–8 weeks after launch, check `/ncaa-season-calendar` and `/ncaa-saesonkalender` in Google
Search Console (`./scripts/search-console.sh`): impressions, clicks and position for queries
such as «ncaa calendar», «ncaa championship dates 2027» and «when does college soccer start».
Report findings to Mikkel as proposals.
