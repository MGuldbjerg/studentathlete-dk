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
- [ ] 2. Precise news matching (word-boundary + corroborating token) — extract-story.ts matchAthletes()
- [ ] 3. Danish hometown detection via city list — danish-cities.ts isDanishHometown()
- [ ] 4. Re-add free news source (Google News RSS) with precise matching
- [ ] 5. LLM disambiguation/verification layer — free chain now, Claude-ready ($15 credit later)
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
