# Article-generation accuracy — findings & plan (June 2026)

Research into reducing fabrication/hallucination in generated articles. **Not yet implemented** — this is the backlog.

## Root problem
Most stories reach the generator with only a `headline` + RSS `summary` (1–3 sentences); `content_raw` is NULL for the majority (JS pages block plain HTTP). The prompts then demand 300–1200 words → the model fills the gap with invented stats/scores/quotes/dates.

## Critical risks (file:line)
- `generate-articles.ts:57` — content fed to model is `content_raw ?? summary ?? ""`; often effectively the headline.
- `system.ts:17` — rules forbid fabricated *quotes* (rule 4) and say "be accurate" (rule 7), but **never forbid inventing statistics, scores, dates, team names**.
- All four prompts (`news.ts:33`, `feature.ts:26`, `season-update.ts:22`, `recruiting.ts:22`) say "include relevant statistics from the source" — when content is empty, "from the source" is silently ignored.
- `season-update.ts:23` — "compare with previous season if data is available" = open invitation to invent history.
- `recruiting.ts:22` — "describe the university and their program" = pulled from (stale) training data, not the source.
- `generate-articles.ts:30` — `selectArticleType` can route a headline-only story to `feature`/`season_update` (longest, riskiest formats).
- English source → Danish article: translation laundering hides invented facts from editors.

## Plan (cheapest first)
**Step 1 — Prompt hardening (zero cost):**
1. Add grounding rule to `system.ts`: only use stats/scores/dates/names explicitly in the KILDEINDHOLD block; never invent — if the source has none, write shorter.
2. Each prompt: when content is empty, instruct a short 150–200 word headline-only article (no stats/quotes/background).
3. Remove the season-comparison line in `season-update.ts`; restrict the university-description line in `recruiting.ts`.

**Step 2 — Content-tier-aware generation (low effort):**
4. Add a `contentTier` (full / summary / headline_only) to `ArticleContext`; scale word-count floor per tier (headline_only → max 200).
5. `selectArticleType`: require rich content before allowing `feature`/`season_update`.
6. Pass already-trusted DB facts into prompts: `position`, `division`, `class_year`, `expected_graduation` (the JOIN already fetches the athlete).

**Step 3 — Post-gen self-check (small, free):**
7. After generation, one cheap structured-JSON call (mirror `verify-story.ts`): `{fabrication_risk, flags}`. Store `articles.fabrication_risk` (new migration); flag high-risk drafts for editor review.
8. `parse-output.ts`: warn when parsed body < 150 chars (format failure).

**Step 4 — Fix grounding at the root (medium):**
9. In `backfill-content.ts`, when plain `fetchStoryContent` returns null, fall back to `renderPage()` (CF Browser Rendering, already added) — prioritized by `relevance_score DESC` within the ~10 min/day quota. This is the real fix for thin input.

**Step 5 — Spend the $15 Claude credit where it counts (once ANTHROPIC_API_KEY set):**
10. Route `feature`/`season_update` (longest, riskiest) to Claude first via a `preferProvider` arg on `ProviderChain.generate()`; keep short news on the free chain.
11. Optionally route the Step-3 fact-check pass to Claude (more reliable JSON).
- Budget math: ~30 articles/mo → features+checks on Claude Haiku ≈ **$0.08/mo** (Sonnet for features ≈ $0.50/mo). The $15 credit is far more than enough; the only discipline needed is *not* routing everything to Claude.

Steps 1–2 give the biggest accuracy gain at zero cost and no schema change.
