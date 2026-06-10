import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SPORT_COLORS } from "@/lib/types";
import { getDB, getEnv } from "@/lib/db";

const FALLBACK_COLOR = "#00205B";

// ─── Fonte + logo som assets ─────────────────────────────────────────────────
// Satori (ImageResponse) har INGEN default-font på Workers — uden eksplicit
// font-data renderes al tekst som ingenting (lærte vi 2026-06-10: routen har
// været blank i prod siden start). Fontene ligger i public/fonts/ og hentes
// via ASSETS-bindingen (HTTP-fallback i lokal dev). Logoet inlines som data-URI
// fordi en Worker ikke pålideligt kan fetche sin egen zone.

interface OgAssets {
  playfair: ArrayBuffer;
  noto: ArrayBuffer;
  notoBold: ArrayBuffer;
  logoDataUri: string;
}

let assetCache: OgAssets | null = null;

function toDataUri(buf: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function loadOgAssets(origin: string): Promise<OgAssets> {
  if (assetCache) return assetCache;
  const env = await getEnv();
  const get = async (path: string): Promise<ArrayBuffer> => {
    if (env.ASSETS?.fetch) {
      try {
        const res = await env.ASSETS.fetch(`https://assets.local${path}`);
        if (res.ok) return res.arrayBuffer();
      } catch {
        /* dev-shim eller binding-fejl — fald til HTTP */
      }
    }
    const res = await fetch(`${origin}${path}`);
    if (!res.ok) throw new Error(`Kunne ikke hente ${path} (${res.status})`);
    return res.arrayBuffer();
  };
  const [playfair, noto, notoBold, logo] = await Promise.all([
    get("/fonts/playfair-700.ttf"),
    get("/fonts/notosans-400.ttf"),
    get("/fonts/notosans-700.ttf"),
    get("/logo-white.png"),
  ]);
  assetCache = { playfair, noto, notoBold, logoDataUri: toDataUri(logo, "image/png") };
  return assetCache;
}

function ogFonts(assets: OgAssets) {
  return [
    { name: "Playfair Display", data: assets.playfair, weight: 700 as const, style: "normal" as const },
    { name: "Noto Sans", data: assets.noto, weight: 400 as const, style: "normal" as const },
    { name: "Noto Sans", data: assets.notoBold, weight: 700 as const, style: "normal" as const },
  ];
}

function getSportColorSafe(sport: string | null): string {
  if (!sport) return FALLBACK_COLOR;
  return SPORT_COLORS[sport.toLowerCase()] ?? FALLBACK_COLOR;
}

// Twemoji-piktogrammer (CC-BY 4.0 — krediteret på /ai-brug) pr. sport-nøgle
const SPORT_EMOJI: Record<string, string> = {
  football: "🏈",
  basketball: "🏀",
  baseball: "⚾",
  fodbold: "⚽",
  "svømning": "🏊",
  svoemning: "🏊",
  atletik: "🏃",
  golf: "⛳",
  tennis: "🎾",
  roning: "🚣",
  gymnastik: "🤸",
  ishockey: "🏒",
  volleyball: "🏐",
};

function getSportEmoji(sport: string | null): string {
  if (!sport) return "🏅";
  return SPORT_EMOJI[sport.toLowerCase()] ?? "🏅";
}

interface CardData {
  title: string;
  athlete_name: string | null;
  sport: string | null;
  university: string | null;
  primary_color: string | null;
  fact_sheet: string | null;
  created_at: string;
}

/** Hent kampkort-data for én artikel (én query, fail-soft → null). */
async function getCardData(articleId: number): Promise<CardData | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    const r = await db
      .prepare(
        `SELECT a.title, a.created_at, at.name as athlete_name, at.sport, at.university,
                sc.primary_color, s.fact_sheet
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         LEFT JOIN stories s ON a.story_id = s.id
         LEFT JOIN schools sc ON sc.name = at.university
         WHERE a.id = ?`
      )
      .bind(articleId)
      .first();
    return (r as CardData) ?? null;
  } catch {
    return null;
  }
}

interface CardFacts {
  opponent: string | null;
  competition: string | null;
  date: string | null;
  finalScore: string | null;
  outcome: string | null;
}

function parseCardFacts(factSheetJson: string | null): CardFacts {
  const empty: CardFacts = { opponent: null, competition: null, date: null, finalScore: null, outcome: null };
  if (!factSheetJson) return empty;
  try {
    const fs = JSON.parse(factSheetJson) as {
      event?: { opponent?: string | null; competition?: string | null; date?: string | null } | null;
      result?: { final_score?: string | null; outcome?: string | null } | null;
    };
    return {
      opponent: fs.event?.opponent ?? null,
      competition: fs.event?.competition ?? null,
      date: fs.event?.date ?? null,
      finalScore: fs.result?.final_score ?? null,
      outcome: fs.result?.outcome ?? null,
    };
  } catch {
    return empty;
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Dynamisk OG-billede (1200×630 PNG) til artikler, atleter og sport-sider.
 *
 * Query params:
 *   title    – overskrift eller atletens navn
 *   subtitle – universitet, sport-kategori eller summary
 *   sport    – sport-nøgle for farve
 *   type     – "article" | "athlete" | "sport"
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") || "article";
  const assets = await loadOgAssets(req.nextUrl.origin);

  // Kampkort: synligt cover genereret fra artiklens egne data (IDEA-billeder.md niveau 1)
  if (type === "card") {
    const articleId = parseInt(searchParams.get("article") ?? "", 10);
    const data = Number.isFinite(articleId) ? await getCardData(articleId) : null;
    if (data) return matchCard(data, assets);
    // Fald igennem til generisk design med de params der måtte være sat
  }

  const title = searchParams.get("title") || "StudentAthlete.dk";
  const subtitle = searchParams.get("subtitle") || "";
  const sport = searchParams.get("sport") || null;

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
          src={assets.logoDataUri}
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
      fonts: ogFonts(assets),
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}

/** Kampkort-cover: skolefarve + sport-piktogram + modstander/score fra faktaarket. */
function matchCard(data: CardData, assets: OgAssets) {
  const facts = parseCardFacts(data.fact_sheet);
  const color =
    data.primary_color && HEX_RE.test(data.primary_color)
      ? data.primary_color
      : getSportColorSafe(data.sport);
  const emoji = getSportEmoji(data.sport);
  const sportLabel = data.sport
    ? data.sport.charAt(0).toUpperCase() + data.sport.slice(1)
    : null;
  const dateLabel =
    facts.date ??
    new Date(data.created_at).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const name = data.athlete_name ?? data.title;
  const nameSize = name.length > 22 ? 52 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "'Playfair Display', serif",
          overflow: "hidden",
        }}
      >
        {/* Baggrund i skolefarve — solid + rgba-overlay (alpha-hex i gradients fejler i satori) */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: color }} />
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0.06,
            backgroundImage:
              "repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 0, transparent 16px)",
          }}
        />

        {/* Stort halvtransparent piktogram */}
        <div
          style={{
            position: "absolute",
            right: -30,
            bottom: -50,
            fontSize: 320,
            opacity: 0.14,
            display: "flex",
          }}
        >
          {emoji}
        </div>

        {/* Rød venstre streg */}
        <div
          style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: "#BF0A30" }}
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
          {/* Sport-chip + piktogram */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
            <div style={{ fontSize: 36, display: "flex" }}>{emoji}</div>
            {sportLabel && (
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
            )}
          </div>

          {/* Atletnavn + skole */}
          <div style={{ fontSize: nameSize, fontWeight: 900, color: "white", lineHeight: 1.1, maxWidth: 800 }}>
            {name}
          </div>
          {data.university && (
            <div
              style={{
                fontSize: 26,
                color: "rgba(255,255,255,0.75)",
                marginTop: 10,
                fontFamily: "'Noto Sans', sans-serif",
              }}
            >
              {data.university}
            </div>
          )}

          {/* Kamp-linje */}
          {(facts.opponent || facts.competition) && (
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.6)",
                marginTop: 22,
                fontFamily: "'Noto Sans', sans-serif",
                display: "flex",
                gap: 10,
              }}
            >
              {facts.opponent ? `mod ${facts.opponent}` : ""}
              {facts.opponent && facts.competition ? " · " : ""}
              {facts.competition ?? ""}
            </div>
          )}

          {/* Score-blok */}
          {facts.finalScore && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 26 }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 8,
                  padding: "10px 26px",
                  color: "white",
                  fontSize: 54,
                  fontWeight: 900,
                  fontFamily: "'Noto Sans', sans-serif",
                }}
              >
                {facts.finalScore}
              </div>
              {facts.outcome && facts.outcome.length <= 24 && (
                <div
                  style={{
                    fontSize: 22,
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Noto Sans', sans-serif",
                  }}
                >
                  {facts.outcome}
                </div>
              )}
            </div>
          )}

          {/* Dato */}
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: 80,
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Noto Sans', sans-serif",
            }}
          >
            {dateLabel}
          </div>
        </div>

        {/* Logo-branding */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assets.logoDataUri}
          alt=""
          width={200}
          height={36}
          style={{ position: "absolute", bottom: 28, right: 40, opacity: 0.4 }}
        />

        {/* Rød bund-streg */}
        <div
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "#BF0A30" }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      emoji: "twemoji",
      fonts: ogFonts(assets),
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}
