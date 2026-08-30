import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { NextRequest } from "next/server";
import { getDB, getEnv } from "@/lib/db";
import { cardBlobKey } from "@/lib/seo";
import {
  buildMatchCardElement,
  getSportColorSafe,
  type CardData,
} from "@/lib/og-card";

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

// ─── Eksplicit edge-cache ────────────────────────────────────────────────────
// Worker-svar caches IKKE automatisk på edge (Cache-Control alene gør intet
// dér) — uden cache.put renderes hvert billede ved HVERT sidevisning, og satori
// er for CPU-tung til free-plan (fejl 1102). Med put renderes hvert kort én
// gang pr. PoP pr. uge.

function getEdgeCache(): Cache | null {
  try {
    if (typeof caches === "undefined") return null;
    return (caches as unknown as { default?: Cache }).default ?? null;
  } catch {
    return null;
  }
}

async function withEdgeCache(url: string, res: Response): Promise<Response> {
  const cache = getEdgeCache();
  if (cache) {
    try {
      await cache.put(url, res.clone());
    } catch {
      /* cache-fejl må aldrig vælte selve svaret */
    }
  }
  return res;
}

/** Hent kampkort-data for én artikel (én query, fail-soft → null). */
async function getCardData(articleId: number): Promise<CardData | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    const r = await db
      .prepare(
        `SELECT a.title, a.created_at, a.country, at.name as athlete_name, at.sport, at.university,
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

  const cached = await getEdgeCache()?.match(req.url);
  if (cached) return cached;

  const type = searchParams.get("type") || "article";

  // Kampkort: synligt cover genereret fra artiklens egne data (IDEA-billeder.md niveau 1)
  if (type === "card") {
    const articleId = parseInt(searchParams.get("article") ?? "", 10);
    if (Number.isFinite(articleId)) {
      // 1) Pre-rendret 1200×630 fra pipelinen (card_blobs, migration-029) —
      //    skarpt kort UDEN satori-CPU på free-plan. Fail-soft til fallback.
      const blob = await getCardBlob(articleId);
      if (blob) return withEdgeCache(req.url, blob);
      // 2) Fallback: on-the-fly 600×315 (free-plan-budgettet) — som hidtil
      const data = await getCardData(articleId);
      if (data) {
        const assets = await loadOgAssets(req.nextUrl.origin);
        return withEdgeCache(req.url, matchCard(data, assets));
      }
    }
    // Fald igennem til generisk design med de params der måtte være sat
  }

  const assets = await loadOgAssets(req.nextUrl.origin);

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

  return withEdgeCache(req.url, new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          transform: "scale(0.5)",
          transformOrigin: "top left",
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
      width: 600,
      height: 315,
      fonts: ogFonts(assets),
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  ));
}

/** Kampkort-fallback: on-the-fly 600×315 via det DELTE element-træ (og-card.ts). */
function matchCard(data: CardData, assets: OgAssets) {
  return new ImageResponse(
    // Plain-object-element-træet er satori-kompatibelt; next/og sender det uændret videre.
    buildMatchCardElement(data, assets.logoDataUri, 0.5) as unknown as ReactElement,
    {
      width: 600,
      height: 315,
      emoji: "twemoji",
      fonts: ogFonts(assets),
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}

/** Pre-rendret kort fra card_blobs (base64-TEXT → PNG). Fail-soft: null = fallback. */
async function getCardBlob(articleId: number): Promise<Response | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    const r = await db
      .prepare("SELECT png_base64 FROM card_blobs WHERE key = ?")
      .bind(cardBlobKey(articleId))
      .first() as { png_base64: string } | null;
    if (!r?.png_base64) return null;
    const binary = atob(r.png_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // Formatet LÆSES af de første bytes i stedet for at blive antaget:
    // kolonnen hedder stadig png_base64, men bærer WebP for alt der er
    // renderet efter 30-08-2026, og de gamle PNG'er skal blive ved at virke.
    // Et forkert Content-Type ville få browseren til at afvise billedet.
    const isWebp =
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    return new Response(bytes, {
      headers: {
        "Content-Type": isWebp ? "image/webp" : "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return null;
  }
}
