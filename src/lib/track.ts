/**
 * Klient-side beacon-helper. Sender en hændelse til /api/track.
 * Bruger sendBeacon (overlever sidenavigation), falder tilbage til fetch keepalive.
 * Fejler aldrig synligt — analytics må aldrig påvirke brugeroplevelsen.
 */

export type TrackPayload =
  | { type: "pageview"; path: string; referrer?: string; source?: string }
  | { type: "click"; path: string; clickKind: string; clickTarget?: string };

export function track(payload: TrackPayload): void {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/track", blob)) return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignorér
  }
}
