/**
 * Google Analytics 4, behind consent.
 *
 * Why GA4 now (Mikkel, 2026-10-07): the sites stopped being cookieless when the
 * AdSense script went live — it brings Google's certified consent banner (IAB
 * TCF) — so GA4 costs no new banner. Mediavine's Journey programme evaluates
 * traffic through GA4. Our own first-party analytics (components/Analytics)
 * stays the record of readership; GA4 undercounts UK/EEA visitors who decline.
 *
 * Consent mode v2: every storage type starts DENIED for visitors in the EEA,
 * the UK and Switzerland — the regions where Google's banner is shown — and
 * Google's banner grants them when the visitor accepts. Elsewhere Google's
 * defaults apply. The defaults must run before any Google tag, which is why
 * this is an inline snippet placed first in <head>.
 */

/** EU + Iceland, Liechtenstein, Norway (EEA), the UK and Switzerland. */
export const CONSENT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

/**
 * The measurement ID as GA4 shows it ("G-XXXXXXXXXX"), or null.
 * Pasted with spaces or in lower case is fine; anything else is refused —
 * a wrong ID would load Google's script and measure nothing.
 */
export function ga4Id(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim().toUpperCase();
  return /^G-[A-Z0-9]{6,14}$/.test(v) ? v : null;
}

/** localStorage key that marks a browser as ours (Mikkel's), for GA4's internal-traffic filter. */
export const INTERNAL_FLAG = "sa_internal";

/**
 * The inline snippet: consent defaults first, then the GA4 config.
 *
 * `send_page_view: false` — page views come from components/Analytics, which
 * sends one per path with the page type and sport attached (and the
 * enhanced-measurement "page changes" option is off in both properties, or
 * every client navigation would count twice).
 *
 * A browser that has opened /admin, or any page with `?internal=1`, is marked
 * as internal traffic, and GA4's "Internal Traffic" filter drops it.
 */
export function ga4Snippet(id: string): string {
  const regions = JSON.stringify(CONSENT_REGIONS);
  return [
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}",
    `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:${regions},wait_for_update:500});`,
    `try{if(/[?&]internal=1(&|$)/.test(location.search))localStorage.setItem('${INTERNAL_FLAG}','1');if(localStorage.getItem('${INTERNAL_FLAG}')==='1')gtag('set',{traffic_type:'internal'});}catch(e){}`,
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(id)},{send_page_view:false});`,
  ].join("");
}

/** Our own social channel names (social_posts.channel, the Instagram bio's "ig"). */
const SOCIAL = /^(ig|instagram|facebook|fb|threads|bluesky|bsky|x|twitter|linkedin|tiktok|youtube)(_[a-z]+)?$/;

/**
 * Our `?source=` / `?kilde=` tag as GA4 campaign fields. GA4 only reads
 * `utm_*`, so without this every tagged social visit landed in "Direct" —
 * the links stay as they are and the tag is translated here.
 */
export function campaignFromSource(source: string | null): { campaign_source: string; campaign_medium: string } | null {
  if (!source) return null;
  return { campaign_source: source, campaign_medium: SOCIAL.test(source) ? "social" : "referral" };
}

/** GA4 event names for our tracked click kinds (data-track="…"). Key events in both properties. */
export const GA4_CLICK_EVENTS: Record<string, string> = {
  bio_out: "bio_click",
  fanatics: "affiliate_click",
};
