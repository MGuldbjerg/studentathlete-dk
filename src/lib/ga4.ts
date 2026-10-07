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

/** The inline snippet: consent defaults first, then the GA4 config. */
export function ga4Snippet(id: string): string {
  const regions = JSON.stringify(CONSENT_REGIONS);
  return [
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}",
    `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:${regions},wait_for_update:500});`,
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(id)});`,
  ].join("");
}
