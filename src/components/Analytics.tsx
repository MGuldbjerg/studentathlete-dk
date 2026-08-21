"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";
// Kilde-parameteren hedder ?kilde= på .dk og ?source= på .co.uk. Klienten tager
// imod begge, så et delt link ikke mister sin kilde på det andet site.
import { sourceParamAliases } from "@/lib/routes";

/**
 * First-party analytics-beacon. Renderes én gang i layout.
 * - Sidevisning ved mount og ved hver klient-navigation (usePathname).
 * - Delegeret klik-lytter: eksplicit data-track vinder, ellers auto-detekteres
 *   eksterne links som 'outbound'. Interne navigationsklik ignoreres (de fanges
 *   som efterfølgende sidevisning).
 */
export function Analytics() {
  const pathname = usePathname();

  // Sidevisning pr. sti.
  // Kilden (?kilde=ig fra fx Instagram-bio'en, eller utm_source fra en
  // kampagne) sendes med den sidevisning hvor parameteren rent faktisk står i
  // URL'en — altså landingen. Efterfølgende klik rundt på sitet er "direkte",
  // og det er med vilje: vi tæller ankomster, ikke sessioner.
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let source: string | undefined;
    try {
      const qs = new URLSearchParams(window.location.search);
      source = sourceParamAliases().map((n) => qs.get(n)).find(Boolean) ?? qs.get("utm_source") ?? undefined;
    } catch {
      /* ignorér */
    }
    track({
      type: "pageview",
      path: pathname,
      referrer: document.referrer || undefined,
      source,
    });
  }, [pathname]);

  // Klik-tracking (delegeret, monteres én gang)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;

      // 1) Eksplicit annotering: nærmeste [data-track]-forfader
      const tagged = target.closest<HTMLElement>("[data-track]");
      if (tagged) {
        const kind = tagged.dataset.track || "internal";
        const t =
          tagged.dataset.trackTarget ??
          (tagged instanceof HTMLAnchorElement ? tagged.getAttribute("href") ?? undefined : undefined);
        track({ type: "click", path: location.pathname, clickKind: kind, clickTarget: t ?? undefined });
        return;
      }

      // 2) Auto: eksterne links → 'outbound'
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (anchor) {
        try {
          const url = new URL(anchor.href, location.href);
          if (url.hostname && url.hostname !== location.hostname) {
            track({
              type: "click",
              path: location.pathname,
              clickKind: "outbound",
              clickTarget: url.href,
            });
          }
        } catch {
          /* ignorér */
        }
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
