# Editorial control plan — StudentAthlete.dk

**Goal:** Mikkel can edit *everything* on the site himself, from `/admin`, on
mobile, without depending on an AI session (rate limits must never block edits).

## Core principle: code-default + D1-override
Every editable element reads from D1 with an **in-code default fallback**:
- Row present → use DB value (Mikkel's edit).
- Row absent → use hardcoded default → nothing ever breaks.

Consequences:
1. Migration is incremental and crash-safe.
2. Once an element is "wired for editing," content changes need **no code and no
   deploy** — only a *new type* of element needs a code change.

Rejected: a headless CMS (Sanity/Decap) — extra logins/infra/build steps, slower
on mobile, no upside over the existing in-app D1 admin.

## Storage primitives (2) + admin hub (1)
- **A. `pages` table (+ `kind`, `category`)** — all long-form markdown prose
  (rendered by `ArticleBody`): `kind='page'` (om/kontakt/ai-brug),
  `'guide'` (viden/*), `'sport'` (sport pillars). Edited in the "Sider" screen.
- **B. `site_content` key-value table** — small strings: hero copy, section
  titles, footer blurb, meta defaults, disclaimer texts, ad toggles. One
  "Tekster & indstillinger" admin screen; code reads via `getSetting(key, default)`.
- **C. `/admin` "Indhold" hub** — index linking every editable type (token auth).

Structured lists (nav, footer links, featured carousel) → small tables or
JSON-in-KV with a repeater UI (Phase 3).

## What's editable today vs hardcoded
- **Editable (admin):** articles, athletes, schools, photos, style guide,
  static pages (om/kontakt/ai-brug).
- **Hardcoded:** viden guides (`viden-content.ts`), sport pillars
  (`sport-content.ts`), homepage/footer copy, header/category/footer nav,
  meta defaults, disclaimer texts, ad on/off.

## Phased roadmap
- **Phase 1 — long-form prose (highest value, lowest risk):**
  - 1a. Guides → `pages(kind='guide')` + `/viden/[slug]` & hub & sitemap read D1
    with code fallback. *(in progress)*
  - 1b. Sport pillars → `pages(kind='sport')` + sport landing reads DB pillar
    with code fallback.
- **Phase 2 — site text & settings:** `site_content` KV + admin screen
  (homepage copy, footer blurb, meta defaults, AI-disclaimer + Fanatics
  disclosure, ad toggles).
- **Phase 3 — lists & navigation:** footer links, header/category nav, featured
  carousel selection.
- **Phase 4 — polish:** edit-pencil on each page (when logged in) → its admin
  editor; markdown cheatsheet; image picker.

Each phase ships in **small, independently-deployable increments** so a rate
limit can never leave the site half-migrated.

## Implementation notes
- `ArticleBody` already renders `##`/`###`/`>`/ordered+bullet lists/`[text](url)`
  /`**bold**`/`*italic*` — so guide & sport prose convert to markdown cleanly.
- `upsertPage` ON CONFLICT does NOT overwrite `kind`/`category`, so editing a
  guide/sport page in admin preserves its type automatically.
- Flat `/[slug]` route must serve only `kind='page'` (so guides/sport bodies
  don't duplicate at the root).
- Migration order to avoid duplicate-URL windows: **migration → deploy code →
  seed rows.**
