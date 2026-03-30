import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SPORT_COLORS } from "@/lib/types";

const FALLBACK_COLOR = "#00205B";

function getSportColorSafe(sport: string | null): string {
  if (!sport) return FALLBACK_COLOR;
  return SPORT_COLORS[sport.toLowerCase()] ?? FALLBACK_COLOR;
}

/**
 * Dynamisk OG-billede (1200×630 PNG) til artikler, atleter og sport-sider.
 *
 * Query params:
 *   title    – overskrift eller atletens navn
 *   subtitle – universitet, sport-kategori eller summary
 *   sport    – sport-nøgle for farve
 *   type     – "article" | "athlete" | "sport"
 */
const LOGO_URL = "https://studentathlete.dk/logo-white.png";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "StudentAthlete.dk";
  const subtitle = searchParams.get("subtitle") || "";
  const sport = searchParams.get("sport") || null;
  const type = searchParams.get("type") || "article";

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

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Georgia, 'Times New Roman', serif",
          overflow: "hidden",
        }}
      >
        {/* Baggrund */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${color} 0%, ${color}88 60%, #0a0a0a 100%)`,
          }}
        />

        {/* Streg-mønster */}
        <div
          style={{
            position: "absolute",
            inset: 0,
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
                  fontFamily: "system-ui, sans-serif",
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
                  fontFamily: "system-ui, sans-serif",
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
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {subtitle.length > 80 ? subtitle.slice(0, 77) + "..." : subtitle}
            </div>
          )}
        </div>

        {/* Logo-branding */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
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
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}
