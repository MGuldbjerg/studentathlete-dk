import type { ReactNode } from "react";
import { getSiteSettings } from "@/lib/admin";
import { adsenseIds } from "@/lib/site-content";

/**
 * The AdSense script — rendered by each INDEXABLE page, not by the layout
 * (2026-11-02, Mikkel: «yes»).
 *
 * The AdSense crawler reads only pages that carry the ad tag, and it ignores
 * noindex: that hides a page from Search, not from AdSense. With the script in
 * the layout, the 569 UK profiles under the 200-word floor still carried it, so
 * the AdSense review could judge the site by them after the floor had taken them
 * out of Search. A page that is noindex now leaves the script out.
 *
 * One tag gives auto ads, Google's certified CMP (the consent box is served by
 * the auto-ads script) and ownership verification; the verification meta tag
 * stays in the layout. React hoists the async script into <head>.
 * Controlled by admin → Tekster (`adsense.enabled`).
 */
export async function AdsenseScript() {
  const settings = await getSiteSettings();
  const adsense = adsenseIds(settings["adsense.publisher_id"]);
  if (!adsense || settings["adsense.enabled"] !== "true") return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.account}`}
      crossOrigin="anonymous"
    />
  );
}

/** A page that is always indexable: the page plus the AdSense script. */
export function withAds<P extends object>(Page: (props: P) => ReactNode | Promise<ReactNode>) {
  return function PageWithAds(props: P) {
    return (
      <>
        <Page {...props} />
        <AdsenseScript />
      </>
    );
  };
}
