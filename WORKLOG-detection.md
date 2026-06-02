# Worklog — detection improvements (June 2026)

Goal: cheap/free **automatic athlete detection + news detection**. Generation is already ~$0
(2 LLM calls/14d, free chain idle) — bottleneck is INPUT. Evergreen content is explicitly OUT of scope for now.

Baseline (2026-06-02, live D1):
- roster_checks: 66 success / 4533 empty / 8308 error / 113 js_required / 924 pending  → ~0.5% yield
- stories: 21 school_feed (with content) + 581 dead google_news (no content)
- athletes: 128 active (soccer-heavy)

## Tasks
- [x] 1. CF Browser Rendering for JS roster pages — `pipeline/lib/browser-render.ts` + scrape-rosters fallback
      ⚠ BLOCKED ON CONFIG: existing CLOUDFLARE_API_TOKEN lacks "Browser Rendering" permission (CF auth error 10000).
      Code degrades gracefully (logs once, stops render, continues plain scraping). To activate: add
      "Browser Rendering — Edit" permission to the token (or new token) → render fallback goes live automatically.
- [x] 2. Precise news matching — extract-story.ts matchAthletes() now Unicode word-boundary + corroboration
      (full name 90 / first+last 80 / +sport-context 60 / last-only 35; common surnames need first name).
      MIN_RELEVANCE=30 exported. check-sources.ts now selects sport. 9/9 assertions pass.
- [x] 3. Danish hometown detection via city list — isDanishHometown() now matches DANISH_CITIES as a
      second signal (whole-word, Unicode) on top of the country marker; US-state guard moved to module
      scope and applied first so "Copenhagen, NY"/"Viborg, SD" still rejected. 13/13 assertions pass.
- [x] 4. Free news source: pipeline/discover/google-news.ts + google-news-daily.yml (05:30 UTC).
      Quoted full-name search (targeted query killed recall — verified empirically). Requires name in
      snippet (matchAthletes) + isBlockedDomain on <source> URL + obituary-title filter + ALWAYS LLM-verify
      (open web = doppelgängers). source_type='google_news_rss' (distinct from old dead 'google_news').
      Verified end-to-end: namesakes rejected (librarian/obituary), real tennis news kept.
- [x] 5. LLM verification: pipeline/discover/verify-story.ts — verifyStory(candidate, athlete, chain?)
      → {isAboutAthlete, confidence, reason}. Strict JSON prompt, fences stripped, fail-open. Runs on free
      ProviderChain now; uses Anthropic automatically once ANTHROPIC_API_KEY ($15 credit) is set. 14/14 tests.
      Wired into google-news.ts. (_verify-test.ts kept as a co-located test.)
- [ ] 6. Prioritize roster scraping from intl report (high-yield schools first)
- [ ] 7. Archive dead google_news rows (reversible UPDATE, not DELETE)

## Key facts for resuming
- CF /content: POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/browser-rendering/content
  Body {url, gotoOptions:{waitUntil:"networkidle0"}, waitForSelector?}. Auth: Bearer CLOUDFLARE_API_TOKEN.
  Returns fully-rendered HTML. Free tier render=true: ~10 min browser-time/day → use sparingly, only as fallback.
- Local env has: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, MISTRAL/GEMINI/GROQ keys. NO ANTHROPIC key yet (credit "coming shortly").
- parseRoster(html) in pipeline/scrape/parsers/index.ts feeds rendered HTML directly (sidearm/generic).
- D1 name: studentathlete-dk. Query via: npx wrangler d1 execute studentathlete-dk --remote --command "..."
- Commit after each task so progress survives. Push to main is safe (workflows are schedule/dispatch only, no push trigger).

## Progress log
(append as tasks complete)
