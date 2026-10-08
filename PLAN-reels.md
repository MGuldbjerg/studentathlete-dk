# Plan: automatic text-only reels (drafted 2026-10-08, awaiting Mikkel's decisions)

**Why reels and not stories.** Stories reach followers only; we have 62 (IG DK) and 12 (IG UK)
on 2026-10-07, and they already see the feed post. Reels are recommended to non-followers,
which is where a small account grows. The API can publish reels but can't add story link
stickers, and reel captions can't hold a tappable link anyway, so no link is lost.

**Principle.** No new text is written for a reel. Every word on screen is either already
published (the article title Mikkel or the review approved) or comes from data with a source
and a date (DB fields, `records.ts` lines: season stats, NCAA rankings). No LLM in this step,
no photos (photo permission is not settled; see the GSC photo tracker).

## What a reel is

10–15 s, 1080×1920, 3–5 frames in the design of the photo-free story mockups:

| Frame | Content | Source |
|---|---|---|
| Hook | name · «Hometown → School» | `athletes` |
| Headline | the published article title | `articles.title` |
| Season (if any) | «6 goals in 11 games» + date | `seasonLine` (school stats page) |
| Team (if any) | «Joint 1st in Division II for goals per game» + date | `team_rankings` |
| End card | «Read the story on student-athlete.co.uk» | fixed |

Frames without data are left out; minimum is hook + headline + end card. Silent video with an
empty AAC track (licensed music can't be added through the API; a stock track risks the
copyright filter). Caption = the feed post's caption, from `copy.ts`.

## Steps

### 1. Frame renderer
`src/lib/reel-frames.ts` (element trees, shared design like `og-card.ts`) +
`pipeline/reels/render-reel.ts`: satori → resvg → PNG per frame, as `render-cards.ts` does.
`--article N --out dir --dry-run` for local inspection. Test: the Deighan and Sykes examples.

### 2. Video assembly
ffmpeg (preinstalled on `ubuntu-latest`): each frame 2.5–3.5 s, 0.3 s crossfade, H.264
yuv420p 30 fps, silent AAC. Text-only video should be ~1 MB, far under the 300 MB limit.

### 3. Hosting + one test post (needs Mikkel's go: it is a public post)
Meta fetches `video_url` itself, as with images. The UK account uses Instagram Login
(`IG_UK_LOGIN=instagram`), and Meta's docs tie resumable byte upload (`rupload`) to Facebook
Login, so the order is:
1. Try `upload_type=resumable` on the UK account. If it works, nothing is hosted.
2. Otherwise a public URL. R2 needs dashboard activation (error 10042, see `render-cards.ts`);
   that is Mikkel's click, free tier 10 GB. Fallback: a GitHub release asset on the public repo
   (Meta must accept the redirect, so test that).
Then publish one reel per account by hand from the workflow, and look at it in the app.

### 4. Selection + schedule
`reels-daily.yml`, once a day per site, fixed time. Picks one article published in the last
24 h, in this order: weekly award › has a season or ranking line › highest relevance. Never the
same athlete two days running. New table `reel_posts` (additive migration: article_id, site,
status, media_id, posted_at; unique on article_id) so a rerun never posts twice. Kill switch
`REELS_ENABLED_<CC>`.

### 5. Tagging the athlete
`user_tags` with `instagram_handle` only where `instagram_confidence='name_match'` and
`instagram_status!='rejected'`. In the last 30 days that covers 50 of 257 UK articles and 3 of
25 Danish. Tagging notifies the athlete and makes a share to their story likely, and their
followers are our audience. `collaborators` (up to 3) would put the reel on their profile too, but
it needs the athlete to accept an invite. Leave it out at first.

### 6. Measure after 4 weeks
Reel plays/reach against feed posts, plus `follower_counts`. Continue, change or stop.
Insights need the `instagram_business_manage_insights` scope; check the token before step 6.

## Cloudflare cost
Nothing is rendered in the Worker; rendering and ffmpeg run in GitHub Actions (public repo: free
minutes). D1: one indexed selection query and one `reel_posts` insert per site per day. No
Browser Rendering, no R2 unless step 3.1 fails.

## Open decisions for Mikkel
1. Both sites, or UK first (more articles, 50 handles a month against 3)?
2. Tag athletes (`user_tags`) from the start?
3. Time of day per site.
4. Silent, or a music track later?
