/**
 * The generic OG design (athlete without photo, sport page, guide), shared by
 * the Worker's on-the-fly fallback in /api/og (scale 0.5 → 600×315, the most
 * the free-plan CPU budget allows) and the deploy-time export
 * (pipeline/render/export-og-assets.ts, scale 1 → 1200×630, no CPU limit).
 *
 * Moved here unchanged from src/app/api/og/route.tsx so the two cannot drift —
 * the same reason og-card.ts exists for the match card. JSX rather than plain
 * objects because both satori and next/og accept React elements, and this
 * design was already JSX.
 */
import { getSportColorSafe } from "./og-card";

export interface GenericOgInput {
  title: string;
  subtitle: string;
  sport: string | null;
  type: string;
}

/** Canvas size at scale 1. */
export const GENERIC_OG_SIZE = { width: 1200, height: 630 } as const;

export function buildGenericElement(
  { title, subtitle, sport, type }: GenericOgInput,
  logoDataUri: string,
  scale: 0.5 | 1,
) {
  const color = getSportColorSafe(sport);
  const sportLabel = sport
    ? sport.charAt(0).toUpperCase() + sport.slice(1)
    : null;

  const initials =
    type === "athlete"
      ? title
          .split(" ")
          .map((w) => w[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : null;

  const titleSize = type === "sport" ? 56 : title.length > 40 ? 38 : 48;

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        ...(scale === 0.5 ? { transform: "scale(0.5)", transformOrigin: "top left" } : {}),
        display: "flex",
        position: "relative",
        fontFamily: "'Playfair Display', serif",
        overflow: "hidden",
      }}
    >
      {/* Baggrund — solid farve + rgba-overlay (alpha-hex i gradients fejler i satori) */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: color }} />
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Streg-mønster */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          opacity: 0.06,
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 0, transparent 16px)",
        }}
      />

      {/* Dekorativ cirkel */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: 250,
          background: "rgba(255,255,255,0.05)",
          right: -100,
          top: -100,
        }}
      />

      {/* Rød venstre streg */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          background: "#BF0A30",
        }}
      />

      {/* Indhold */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Sport-tag */}
        {sportLabel && (
          <div style={{ display: "flex", marginBottom: 20 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: 4,
                padding: "6px 16px",
                color: "white",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 2,
                fontFamily: "'Noto Sans', sans-serif",
              }}
            >
              {sportLabel.toUpperCase()}
            </div>
          </div>
        )}

        {/* Initialer-cirkel */}
        {initials && (
          <div style={{ display: "flex", marginBottom: 16 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 900,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'Noto Sans', sans-serif",
              }}
            >
              {initials}
            </div>
          </div>
        )}

        {/* Titel */}
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 900,
            color: "white",
            lineHeight: 1.15,
            maxWidth: 950,
          }}
        >
          {title}
        </div>

        {/* Undertekst */}
        {subtitle && (
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.6)",
              marginTop: 16,
              maxWidth: 700,
              fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            {subtitle.length > 80 ? subtitle.slice(0, 77) + "..." : subtitle}
          </div>
        )}
      </div>

      {/* Logo-branding */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoDataUri}
        alt=""
        width={200}
        height={36}
        style={{
          position: "absolute",
          bottom: 28,
          right: 40,
          opacity: 0.4,
        }}
      />

      {/* Rød bund-streg */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "#BF0A30",
        }}
      />
    </div>
  );
}
