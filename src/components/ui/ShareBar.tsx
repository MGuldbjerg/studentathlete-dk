"use client";

import { useEffect, useState } from "react";

/**
 * Share row for articles and athlete profiles (growth plan, Mikkel 2026-11-03):
 * family and club news travels through WhatsApp and Messenger, not public feeds.
 *
 * Every shared link carries the site's own source parameter (`?source=` /
 * `?kilde=`) as `share_<channel>`, so a visit that arrives through a share is
 * counted as such; the click itself is tracked as kind 'share' (Analytics.tsx).
 * The URL is built on click from the current page, never at render time, so
 * the server HTML stays the same for every visitor and the edge cache holds.
 * The native share sheet button appears only where the browser offers one.
 *
 * All text arrives rendered in the site's language from the server.
 */
export function ShareBar({ title, sourceParam, labels, className = "" }: {
  /** Text that goes with the link (the article title or the athlete's name). */
  title: string;
  /** The site's own source parameter name (`source` on .co.uk, `kilde` on .dk). */
  sourceParam: string;
  labels: { heading: string; native: string; copy: string; copied: string };
  className?: string;
}) {
  const [canNative, setCanNative] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a browser capability once after mount
    setCanNative(typeof navigator.share === "function");
  }, []);

  function urlFor(channel: string): string {
    const u = new URL(window.location.pathname, window.location.origin);
    u.searchParams.set(sourceParam, `share_${channel}`);
    return u.toString();
  }

  function openWindow(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    const url = urlFor("copy");
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard access (permission, old browser): show the link to copy by hand.
      try { window.prompt(labels.copy, url); } catch { /* no dialogs either (embedded views) */ }
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function native() {
    try {
      await navigator.share({ title, url: urlFor("native") });
    } catch {
      /* cancelled by the reader */
    }
  }

  const btn = "text-xs px-3 py-1 border border-border text-ink hover:border-flag-red hover:text-flag-red transition-colors tracking-wide";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[10px] font-black tracking-[0.2em] uppercase text-muted mr-1">{labels.heading}</span>
      {canNative && (
        <button type="button" className={btn} onClick={native} data-track="share" data-track-target="native">
          {labels.native}
        </button>
      )}
      <button type="button" className={btn} data-track="share" data-track-target="whatsapp"
        onClick={() => openWindow(`https://wa.me/?text=${encodeURIComponent(`${title} ${urlFor("whatsapp")}`)}`)}>
        WhatsApp
      </button>
      <button type="button" className={btn} data-track="share" data-track-target="facebook"
        onClick={() => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlFor("facebook"))}`)}>
        Facebook
      </button>
      <button type="button" className={btn} onClick={copy} data-track="share" data-track-target="copy" aria-live="polite">
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
