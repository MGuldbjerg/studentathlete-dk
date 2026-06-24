"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAME = "sa_consent";

function readConsent(): { marketing: boolean } | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )sa_consent=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

function writeConsent(marketing: boolean) {
  const v = encodeURIComponent(JSON.stringify({ necessary: true, marketing, ts: Date.now() }));
  // 180 dage. Selve samtykke-cookien er strengt nødvendig (lovligt uden samtykke).
  document.cookie = `${NAME}=${v}; path=/; max-age=15552000; samesite=lax`;
}

/**
 * GDPR-samtykkeboks. Vises KUN når `enabled` (admin → Tekster → consent.enabled)
 * og brugeren ikke har truffet et valg endnu. Sitet er ellers cookieløst, så
 * banneret holdes slukket indtil annoncer/tracking aktiveres. "Kun nødvendige"
 * er ligestillet med "Accepter alle" (forudgående, frit, lige let at afvise).
 * Fremtidige ad-scripts skal læse `sa_consent`.marketing før de loades.
 */
export function CookieConsent({ enabled }: { enabled: boolean }) {
  const [show, setShow] = useState(false);
  // Start "ubesluttet" → SSR renderer intet; useEffect afgør ud fra cookien
  // (undgår et glimt af gen-åbn-knappen før vi har tjekket samtykke).
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const c = readConsent();
    setDecided(!!c);
    if (!c) setShow(true);
  }, [enabled]);

  if (!enabled) return null;

  function choose(marketing: boolean) {
    writeConsent(marketing);
    setDecided(true);
    setShow(false);
  }

  if (!show) {
    return decided ? (
      <button
        onClick={() => setShow(true)}
        className="fixed bottom-3 left-3 z-40 text-xs px-3 py-1.5 rounded-full bg-paper border border-border text-muted hover:text-ink shadow-sm"
      >
        Cookieindstillinger
      </button>
    ) : null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-paper border-t border-border shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center gap-3">
        <p className="text-sm text-ink leading-relaxed flex-1">
          Vi bruger nødvendige cookies, for at sitet fungerer. Med din accept bruger vi også cookies
          til annoncer. Læs mere i vores{" "}
          <Link href="/cookies" className="underline" style={{ color: "#BF0A30" }}>
            cookiepolitik
          </Link>
          .
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => choose(false)}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-border bg-paper text-ink"
          >
            Kun nødvendige
          </button>
          <button
            onClick={() => choose(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white"
            style={{ backgroundColor: "#00205B" }}
          >
            Accepter alle
          </button>
        </div>
      </div>
    </div>
  );
}
