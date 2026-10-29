"use client";

import { useEffect, useState } from "react";

/**
 * A slim band for readers who came from a social post (`?source=` on .co.uk,
 * `?kilde=` on .dk — taggedArticleUrl in pipeline/social/): one line to the
 * article's sport, one to the athletes overview.
 *
 * Client-only on purpose. The server renders nothing and fetches nothing, so
 * the page and its edge cache are the same for every visitor; the band
 * appears only after mount, and only when the URL carries the parameter.
 * Ordinary visitors never get it, so their layout never shifts.
 *
 * All text arrives rendered in the site's language from the server.
 */
export function SocialBand({ params, sportHref, sportText, athletesHref, athletesText }: {
  /** Query parameter names that mark a social visit (every language's). */
  params: string[];
  sportHref: string | null;
  sportText: string | null;
  athletesHref: string;
  athletesText: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once after mount
    if (params.some((p) => q.has(p))) setShow(true);
  }, [params]);
  if (!show) return null;

  return (
    <div className="border-b border-border bg-surface">
      <div className="max-w-4xl mx-auto px-5 md:px-0 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs">
        {sportHref && sportText && (
          <a href={sportHref} className="font-semibold text-ink hover:underline decoration-flag-red">
            {sportText}
          </a>
        )}
        <a href={athletesHref} className="font-semibold hover:underline" style={{ color: "#BF0A30" }}>
          {athletesText}
        </a>
      </div>
    </div>
  );
}
