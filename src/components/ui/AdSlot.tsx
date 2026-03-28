/**
 * Generisk annonceplads-komponent.
 * Renderer null når annoncer er slået fra (standard).
 * Aktiver med NEXT_PUBLIC_ADS_ENABLED=true i .env.
 */

type SlotId =
  | "header-leaderboard"
  | "after-carousel"
  | "in-article"
  | "article-footer"
  | "pre-footer"
  | "sidebar";

const SLOT_SIZES: Record<SlotId, { width: string; height: string; label: string }> = {
  "header-leaderboard": { width: "728px", height: "90px", label: "Leaderboard" },
  "after-carousel":     { width: "728px", height: "90px", label: "Efter karrusel" },
  "in-article":         { width: "300px", height: "250px", label: "In-article" },
  "article-footer":     { width: "728px", height: "90px", label: "Artikelbund" },
  "pre-footer":         { width: "728px", height: "90px", label: "Pre-footer" },
  sidebar:              { width: "300px", height: "600px", label: "Sidebar" },
};

interface AdSlotProps {
  slot: SlotId;
  className?: string;
}

export function AdSlot({ slot, className = "" }: AdSlotProps) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  if (!enabled) return null;

  const size = SLOT_SIZES[slot];

  return (
    <div
      data-ad-slot={slot}
      className={`flex items-center justify-center bg-surface/50 border border-dashed border-border text-muted text-xs mx-auto overflow-hidden ${className}`}
      style={{ maxWidth: size.width, height: size.height }}
      aria-hidden="true"
    >
      <span className="opacity-50">{size.label}</span>
    </div>
  );
}
