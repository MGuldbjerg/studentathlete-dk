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
 * FØRSTE FORSØG VAR FORKERT (2026-08-04): knappen blev vist så snart
 * `googlefc.callbackQueue` fandtes. Det objekt oprettes af AdSense-scriptet
 * ALTID — også når der ikke er nogen samtykkebesked at genåbne — så knappen
 * kunne stå der og ikke gøre noget ved klik.
 *
 * Googles egen dokumenterede fremgangsmåde er at spørge TCF-API'et, om GDPR
 * overhovedet gælder for den her besøgende, og først da vise linket
 * (developers.google.com/funding-choices/fc-api-docs). Det er dét vi gør nu:
 *   1. vent på `CONSENT_API_READY`
 *   2. lyt på `__tcfapi` og vis kun knappen når `gdprApplies` er sand.
 *
 * Konsekvens: ingen knap uden for EU/EØS/UK/CH, og ingen knap hvis Googles
 * besked ikke er publiceret i AdSense → Privacy & messaging. Mangler knappen
 * helt, er årsagen altså AdSense-opsætningen — ikke denne kode.
 */

interface GoogleFc {
  callbackQueue?: { push: (value: unknown) => void };
  showRevocationMessage?: () => void;
}

interface TcData {
  gdprApplies?: boolean;
}

type TcfApi = (
  command: string,
  version: number,
  callback: (tcData: TcData | null, success: boolean) => void,
) => void;

function fc(): GoogleFc | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { googlefc?: GoogleFc }).googlefc;
}

function tcfapi(): TcfApi | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __tcfapi?: TcfApi }).__tcfapi;
}

export function ConsentSettingsLink({ enabled }: { enabled: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    // Scriptet er asynkront; prøv indtil køen findes, og giv så op i stilhed.
    function subscribe(): boolean {
      const queue = fc()?.callbackQueue;
      if (!queue) return false;
      queue.push({
        CONSENT_API_READY: () => {
          // Version 2 = TCF v2-API'et (kravet Google stiller er TCF v2.2).
          tcfapi()?.("addEventListener", 2, (tcData, success) => {
            if (cancelled) return;
            setShow(Boolean(success && tcData?.gdprApplies));
          });
        },
      });
      return true;
    }

    if (subscribe()) return () => { cancelled = true; };

    let tries = 0;
    const timer = setInterval(() => {
      if (subscribe() || ++tries >= 20) clearInterval(timer);
    }, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  // Leverer sit eget <li>, så footeren ikke står tilbage med et tomt
  // listepunkt (og et hul i linklisten) når knappen ikke skal vises.
  if (!enabled || !show) return null;

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          const g = fc();
          // Googles anbefalede kald for netop revocation-linket:
          // support.google.com/adsense/answer/10959060
          if (g?.callbackQueue && g.showRevocationMessage) {
            g.callbackQueue.push(g.showRevocationMessage);
          }
        }}
        className="text-white/60 text-sm hover:text-white transition-colors text-left"
      >
        Cookieindstillinger
      </button>
    </li>
  );
}
