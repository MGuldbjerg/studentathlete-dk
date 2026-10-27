/**
 * Impact (impact.com) — the affiliate network behind the Fanatics programme.
 * ===========================================================================
 *
 * Mikkel, 2026-10-27: adding student-athlete.co.uk as a website in Impact,
 * which verifies ownership by finding its tracking script («UTT») in <head>.
 *
 * The script sets tracking cookies, rewrites links and records impressions, and
 * Impact itself warns that the data «may be shared with advertisers». On a UK
 * site that is marketing tracking: it needs consent. So the tag is in <head>
 * as `type="text/plain"` — present for the verification, inert for the browser
 * — and a loader runs it only for a visitor whose `sa_consent` cookie says
 * marketing: true (src/components/CookieConsent.tsx). Without a consent banner
 * on the site it never runs, and the site stays cookie-free.
 *
 * Commissions do not need this script: Fanatics links go through Impact's own
 * tracking links (src/lib/fanatics.ts), which count on Impact's side.
 */

/** Impact's Universal Tracking Tag for student-athlete.co.uk, exactly as Impact issued it. */
export const IMPACT_UTT_UK =
  "(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('https://utt.impactcdn.com/P-A7428477-9f6d-486c-a3ff-a0aed88dd2ea1.js','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');";

/** Runs the inert tag above only with marketing consent. Inline, so it needs no bundle. */
export const IMPACT_CONSENT_LOADER =
  "(function(){var s=document.getElementById('impact-utt');if(!s)return;var m=document.cookie.match(/(?:^|; )sa_consent=([^;]+)/);var ok=false;try{ok=!!(m&&JSON.parse(decodeURIComponent(m[1])).marketing)}catch(e){}if(!ok)return;var x=document.createElement('script');x.text=s.textContent;document.head.appendChild(x);})();";
