import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { NextRequest } from "next/server";
import { getDB, getEnv } from "@/lib/db";
import { cardBlobKey, igCardBlobKey } from "@/lib/seo";
import { buildGenericElement } from "@/lib/og-generic";
import {
  buildMatchCardElement,
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
      const blob = await getCardBlob(cardBlobKey(articleId));
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

  // Instagram-kortet: 1080×1350 JPEG, pre-rendret i pipelinen.
  //
  // INGEN fallback her, med vilje. Det liggende fallback ville være forkert
  // format OG forkert formfaktor, og Instagram cacher sin egen hentning — ét
  // dårligt billede bliver hængende. Findes kortet ikke, er svaret 404, og
  // Instagram-kanalen venter på samme måde som social-køen venter på delekortet.
  if (type === "ig") {
    const articleId = parseInt(searchParams.get("article") ?? "", 10);
    if (Number.isFinite(articleId)) {
      const blob = await getCardBlob(igCardBlobKey(articleId));
      if (blob) return withEdgeCache(req.url, blob);
    }
    return new Response("Instagram-kort ikke renderet endnu", { status: 404 });
  }

  const assets = await loadOgAssets(req.nextUrl.origin);

  const title = searchParams.get("title") || "StudentAthlete.dk";
  const subtitle = searchParams.get("subtitle") || "";
  const sport = searchParams.get("sport") || null;

  return withEdgeCache(req.url, new ImageResponse(
    buildGenericElement({ title, subtitle, sport, type }, assets.logoDataUri, 0.5),
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

/** Pre-rendret kort fra card_blobs (base64-TEXT). Fail-soft: null = fallback. */
async function getCardBlob(key: string): Promise<Response | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    const r = await db
      .prepare("SELECT png_base64 FROM card_blobs WHERE key = ?")
      .bind(key)
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
    // JPEG kom til med Instagram-kortet (kun JPEG accepteres dér).
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    return new Response(bytes, {
      headers: {
        "Content-Type": isWebp ? "image/webp" : isJpeg ? "image/jpeg" : "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return null;
  }
}
