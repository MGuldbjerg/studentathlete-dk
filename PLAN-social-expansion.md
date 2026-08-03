# Plan — Social autoposting expansion

_Written 2026-07-06. Concerns `pipeline/social/`._

## TL;DR

- We already **built the "code from scratch" option and it works at $0**: a `SocialChannel`
  interface (`isConfigured()` / `post()`), a D1 queue (`social_posts`), adaptive pacing,
  hourly GitHub Actions cron, 3-retry + 48h expiry, Discord failure alerts. Adding a platform
  = one ~40-line adapter file + secrets. This already contains everything Make/n8n would sell us.
- **Recommendation: extend the existing pattern** (Option A). Reach for an external tool only
  for platforms whose OAuth is genuinely painful (LinkedIn, later TikTok) — and then only as
  *one more channel adapter*, not a rewrite.
- **X/Twitter: the adapter is finished and just commented out.** The only blocker is money —
  X killed its free tier (Feb 2026, now pay-per-use). Enabling it is a budget decision, not a
  dev task. See cost math below.
- **Biggest cheap wins next: Threads, Mastodon, Discord** — all near-zero effort.
- **Missing from the original list: LinkedIn** — highest professional-audience fit, but hardest
  API access. The named list also missed YouTube / WhatsApp Channels / Pinterest (all minor).

## Current state (`pipeline/social/`)

| Piece | File | Status |
|---|---|---|
| Channel interface | `types.ts` (`SocialChannel`) | — |
| Queue + pacing + drain | `post-social.ts`, `pacing.ts` | live |
| Copy builder | `copy.ts` | live |
| **Bluesky** | `channels/bluesky.ts` | ✅ live |
| **Facebook** | `channels/facebook.ts` | ⏳ underway (token) |
| **Instagram** | (planned) | ⏳ underway |
| **X/Twitter** | `channels/x.ts` | 🟡 built, commented out (cost) |
| Cron | `.github/workflows/social-post.yml` | hourly, $0 |

The abstraction is the important asset: enqueue-on-publish → paced drain → per-channel adapter.
A new platform never touches the queue/pacing logic; it just implements `post()`.

## Platform-by-platform assessment

Ordered by recommendation. "Effort" assumes reuse of the existing queue/pacing.

| Platform | Official post API? | Cost | Audience fit | Effort | Verdict |
|---|---|---|---|---|---|
| Bluesky | Yes (AT Proto) | Free | Good (growing DK/sports) | done | ✅ **Live** |
| Facebook Page | Yes (Graph) | Free | Good (parents, DK) | done | ⏳ **Finish** |
| Instagram | Yes (Graph, Business) | Free | Good (athletes) | in progress | ⏳ **Finish** |
| **Threads** | Yes (Graph, via IG) | **Free**, 250/day | Good, same crowd as IG/X | **~1h** | ✅ **Add next** — rides on the IG Business token we're already wiring; two-step container/publish, ~50-line adapter |
| **Mastodon** | Yes | Free | Low but real (fediverse, backlinks) | **~1h** | ✅ **Add** — single `POST /api/v1/statuses` + bearer token; effort so low it pays for itself |
| **Discord** | Yes (webhook) | Free | Depends on having a server | **~30min** | ✅ **Add** — we already hold a Discord webhook (failure alerts); an announcements channel for new articles is one `fetch` |
| **Telegram** | Yes (Bot API) | Free | Low (DK sports ~minimal) | ~1h | 🟡 **Gated** — trivial to build, but only worth it once a channel/community exists |
| **LinkedIn** | Yes (Community Mgmt / `w_organization_social`) | Free API | **High** (education, recruiting, parents, DK pros) | High (app review) | 🟡 **Pursue, gated** — org-page posting needs LinkedIn app approval (slow, often refused for small apps). Best via an aggregator adapter if approval stalls |
| **X / Twitter** | Yes (API v2) | **Paid** (pay-per-use since Feb 2026) | Good | done | 🅿️ **Park** — adapter finished; enable only with paid credit (math below) |
| **Reddit** | Yes (free, 100 QPM) | Free | High *if done right* | — | ❌ **Not for automation** — auto self-promo breaks most subreddit rules → removals/shadowban. Manual/curated only |
| **TikTok** | Content Posting API | Free | Video crowd | High | ❌ **Out for article posts** — video-only, requires app audit, unaudited apps post private-only. Revisit only with a video track |
| **YouTube** | Shorts/Community | Free | Video crowd | High | ❌ **Out** — video-only / channel-threshold gated. Video track only |
| **WhatsApp Channels** | Emerging (Meta) | Free | Low in DK vs Messenger | Med | 🅿️ **Park** — API still rolling out; revisit later |
| **Pinterest** | Yes (Pins) | Free | Weak for sports news | Med | 🅿️ **Low priority** — evergreen image-card backlinks only |
| **Snapchat** | **No organic post API** | — | — | — | ❌ **Not feasible** — only Ads/Marketing + in-app Creative Kit share. Drop |
| Nostr / Tumblr / Lemmy | Yes / Yes / Yes | Free | Negligible | Low | ❌ **Skip** — tiny audience, overlaps Bluesky/Mastodon |

### X/Twitter cost math (since it's specifically wanted)

X now charges **per write**. Crucially, **posts containing a URL cost $0.20 each** (plain text is
$0.015). Our posts include the article link, so we hit the $0.20 tier:

- At the current pacing cap (24 posts/day): **≈ $4.80/day ≈ $144/mo**.
- Dialed down to ~3 posts/day: **≈ $18/mo**.

The code is done — this is purely "is X worth $18–144/mo to us." Given the **$0 principle**, park it
until there's a reason to pay. (Putting the link only in a reply to dodge URL pricing is possible but
kills the link preview and halves reach — not worth it.)

## Automation options — Make vs n8n vs code vs aggregator

| Option | Cost | Data egress | Reuses our queue/pacing? | When it wins |
|---|---|---|---|---|
| **A. Extend our pipeline** *(recommended)* | **$0** (GH Actions) | None | Yes | Platforms with simple HTTP APIs — Threads, Mastodon, Telegram, Discord, FB, IG all qualify |
| B. n8n (self-hosted) | ~$5/mo VPS + upkeep | Ours if self-hosted | No (rebuild) | A non-dev needs a visual editor; you want pre-built nodes |
| C. Make.com | Paid past small free tier | 3rd party | No | Zero-code + willing to pay; **violates $0 principle** |
| D. Aggregator (Ayrshare / Postiz / Mixpost) | Free-tier→paid, or self-host | 3rd party unless self-hosted | As one adapter | Offloads OAuth/token-refresh pain; unlocks LinkedIn/TikTok behind one integration |

**Why not Make/n8n as the backbone:** they exist to give you a queue, scheduling, retries, and
multi-platform fan-out — which we already have, at $0, inside our own infra with no data leaving it.
Adopting them means rebuilding solved logic, adding a moving part, and (Make) a recurring bill, while
*still* not bypassing X's per-post cost. They don't fix our actual friction.

**The real friction** is OAuth token management (Meta long-lived-token refresh; LinkedIn/TikTok
approval + refresh). That's exactly what an **aggregator (Option D)** solves. So:

> **Recommended shape: Option A as the backbone + one Option-D aggregator adapter for the
> hard platforms.** Keep our queue/pacing/alerts; write direct adapters for the easy APIs; add a
> single `SocialChannel` that calls a self-hosted **Postiz/Mixpost** (open-source, ~$0) or
> **Ayrshare** (free tier) only for LinkedIn and, later, TikTok.

## Roadmap

- **P0 — now:** finish **Facebook + Instagram** (already underway).
- **P1 — cheap, high leverage (each ~1h, $0):** **Threads** (IG token), **Mastodon**, **Discord** announcements.
- **P2 — audience/approval-gated:** **Telegram** (once a channel exists); **LinkedIn** (start org-page
  API approval now; fall back to an aggregator adapter if it stalls).
- **Park:** **X** (enable only with paid credit); **Reddit** (manual only);
  **TikTok / YouTube / Snapchat / WhatsApp / Pinterest** (out for article autoposting; revisit if a
  video track starts).

## Sources (API/pricing verified 2026-07)

- X API pay-per-use (no free tier, $0.015 text / $0.20 w/ URL): [docs.x.com pricing](https://docs.x.com/x-api/getting-started/pricing), [Postproxy 2026](https://postproxy.dev/blog/x-api-pricing-2026/)
- Threads API (free, 250 posts/day, via IG): [Postproxy Threads](https://postproxy.dev/blog/how-to-post-to-threads-via-api/), [Meta Postman collection](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api)
