/**
 * Generisk annonceplads-komponent.
 * Renderer null når annoncer er slået fra (standard).
 * Aktiver med NEXT_PUBLIC_ADS_ENABLED=true i .env.
 */

type SlotId =
  | "header-leaderboard"
  | "after-lead"
  | "mid-feed"
  | "in-article"
  | "article-footer"
  | "pre-footer"
  | "sidebar";

const SLOT_SIZES: Record<SlotId, { width: string; height: string; label: string }> = {
  "header-leaderboard": { width: "728px", height: "90px", label: "Leaderboard" },
  "after-lead":         { width: "728px", height: "90px", label: "Efter lead" },
  "mid-feed":           { width: "728px", height: "90px", label: "Midt i strømmen" },
  "in-article":         { width: "300px", height: "250px", label: "In-article" },
  "article-footer":     { width: "728px", height: "90px", label: "Artikelbund" },
  "pre-footer":         { width: "728px", height: "90px", label: "Pre-footer" },
  sidebar:              { width: "300px", height: "600px", label: "Sidebar" },
};

interface AdSlotProps {
  slot: SlotId;
  className?: string;
  /**
   * Læg annoncen i et fuldbredde-bånd med baggrund og kantlinje (forsidens
   * rytme). Båndet er en del af komponenten og ikke en wrapper udenom, så det
   * forsvinder sammen med annoncen når annoncer er slået fra — ellers ville
   * forsiden vise to tomme, indrammede striber.
   */
  band?: boolean;
}

export function AdSlot({ slot, className = "", band = false }: AdSlotProps) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  if (!enabled) return null;

  const size = SLOT_SIZES[slot];

  const unit = (
    <div
      data-ad-slot={slot}
      data-track="ad"
      data-track-target={slot}
      className={`flex items-center justify-center bg-surface/50 border border-dashed border-border text-muted text-xs mx-auto overflow-hidden ${className}`}
      style={{ maxWidth: size.width, height: size.height }}
      aria-hidden="true"
    >
      <span className="opacity-50">{size.label}</span>
    </div>
  );

  if (!band) return unit;

  return <div className="px-4 md:px-8 py-6 bg-surface border-b border-border">{unit}</div>;
}
