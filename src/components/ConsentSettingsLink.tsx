"use client";

import { useEffect, useState } from "react";

/**
 * "Cookieindstillinger" — genåbner GOOGLES samtykkeboks.
 *
 * GDPR kræver at et samtykke kan trækkes tilbage lige så let som det blev
 * givet. Samtykket ejes af Googles CMP (vores egen boks er slået fra), så
 * tilbagetrækningen skal gå gennem Googles API — vi kan ikke selv slette et
 * valg der ikke ligger hos os.
 *
 * Googles anbefalede kald er `googlefc.callbackQueue.push(googlefc.showRevocationMessage)`
 * (support.google.com/adsense/answer/10959060). Vi bruger en <button> frem for
 * Googles `href="javascript:…"`-variant: samme kald, men uden en javascript-URL
 * og med rigtig tastaturbetjening.
 *
 * Knappen vises FØRST når `googlefc` faktisk findes. Objektet kommer med
 * AdSense-scriptet, som er asynkront og kan være blokeret af en annonceblokker
 * — og en synlig knap, der intet gør, er værre end ingen knap. Derfor pollet
 * opstart og stille opgivelse efter ~10 sekunder. Cookiepolitikken nævner
 * begge veje: linket her, og at rydde browserens cookies hvis det mangler.
 */

interface GoogleFc {
  callbackQueue?: { push: (cb: unknown) => void };
  showRevocationMessage?: () => void;
}

function getFc(): GoogleFc | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { googlefc?: GoogleFc }).googlefc;
}

export function ConsentSettingsLink({ enabled }: { enabled: boolean }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (getFc()?.callbackQueue) {
      setReady(true);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      if (getFc()?.callbackQueue) {
        setReady(true);
        clearInterval(timer);
      } else if (++tries >= 20) {
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [enabled]);

  // Komponenten leverer sit eget <li>, så footeren ikke står tilbage med et
  // tomt listepunkt (og dermed et hul i linklisten) hos læsere uden Googles
  // script — fx annonceblokkere og besøgende uden for EU/EØS/UK/CH.
  if (!enabled || !ready) return null;

  return (
    <li>
    <button
      type="button"
      onClick={() => {
        const fc = getFc();
        if (fc?.callbackQueue && fc.showRevocationMessage) {
          fc.callbackQueue.push(fc.showRevocationMessage);
        }
      }}
      className="text-white/60 text-sm hover:text-white transition-colors text-left"
    >
      Cookieindstillinger
    </button>
    </li>
  );
}
