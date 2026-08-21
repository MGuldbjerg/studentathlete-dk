/**
 * Pre-render af kampkort i FULD 1200×630 — udenfor Workeren (ingen CPU-grænse).
 *
 * satori (element-træ → SVG) + resvg (SVG → PNG) i Node; resultatet gemmes som
 * base64-TEXT i D1 card_blobs (migration-029), som /api/og serverer før sit
 * on-the-fly-fallback (600×315). Design-træet er DELT med Workeren
 * (src/lib/og-card.ts) — én kilde til sandhed.
 * R2 var førstevalget, men kræver dashboard-aktivering på kontoen (fejl 10042);
 * D1-blobs giver samme resultat på $0.
 *
 * Kør:  npx tsx pipeline/render/render-cards.ts [--force] [--article N] [--out fil.png]
 *   --force      genrender selvom blob findes (efter design-ændring: bump CARD_VERSION!)
 *   --article N  kun én artikel
 *   --out FIL    skriv også PNG til disk (lokal visuel verifikation)
 * Idempotent: springer nøgler over der allerede findes (nøgle indeholder CARD_VERSION).
 */
import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createD1Client } from "../lib/d1-client";
import { buildMatchCardElement, type CardData } from "../../src/lib/og-card";
import { cardBlobKey } from "../../src/lib/seo";

// Scripts køres fra repo-roden (som alle pipeline-scripts/workflows gør)
const ROOT = process.cwd();

// ─── Twemoji-loader (Node-satori har IKKE Workers' emoji:"twemoji" indbygget) ─
const twemojiCache = new Map<string, string>();

function emojiToCodePoint(segment: string): string {
  // Twemoji-filnavne: codepoints joinet med '-', uden fe0f-variation-selector
  return [...segment]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((cp) => cp !== "fe0f")
    .join("-");
}

async function loadTwemoji(segment: string): Promise<string> {
  const code = emojiToCodePoint(segment);
  const cached = twemojiCache.get(code);
  if (cached) return cached;
  const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Twemoji ${code} kunne ikke hentes (${res.status})`);
  const svg = await res.text();
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  twemojiCache.set(code, dataUri);
  return dataUri;
}

// ─── Assets (samme filer som Workeren bruger via ASSETS-bindingen) ───────────
function loadAssets() {
  const font = (f: string) => readFileSync(path.join(ROOT, "public/fonts", f));
  const logo = readFileSync(path.join(ROOT, "public/logo-white.png"));
  return {
    fonts: [
      { name: "Playfair Display", data: font("playfair-700.ttf"), weight: 700 as const, style: "normal" as const },
      { name: "Noto Sans", data: font("notosans-400.ttf"), weight: 400 as const, style: "normal" as const },
      { name: "Noto Sans", data: font("notosans-700.ttf"), weight: 700 as const, style: "normal" as const },
    ],
    logoDataUri: `data:image/png;base64,${logo.toString("base64")}`,
  };
}

async function renderCardPng(data: CardData, assets: ReturnType<typeof loadAssets>): Promise<Buffer> {
  const element = buildMatchCardElement(data, assets.logoDataUri, 1);
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: assets.fonts,
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === "emoji") return loadTwemoji(segment);
      // Ukendt glyf-anmodning — returnér tom SVG frem for at vælte renderingen
      return `data:image/svg+xml;base64,${Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64")}`;
    },
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return Buffer.from(png);
}

function parseArgs(): { force: boolean; article: number | null; out: string | null } {
  const args = process.argv.slice(2);
  let force = false;
  let article: number | null = null;
  let out: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force") force = true;
    if (args[i] === "--article" && args[i + 1]) article = parseInt(args[i + 1], 10);
    if (args[i] === "--out" && args[i + 1]) out = args[i + 1];
  }
  return { force, article, out };
}

interface CardRow extends CardData {
  id: number;
}

async function main(): Promise<void> {
  const { force, article, out } = parseArgs();
  const db = createD1Client();
  const assets = loadAssets();

  // Samme joins som /api/og getCardData — kun publicerede artikler pre-renderes
  const rows = await db.query<CardRow>(
    `SELECT a.id, a.title, a.created_at, a.country, at.name as athlete_name, at.sport, at.university,
            sc.primary_color, s.fact_sheet
     FROM articles a
     LEFT JOIN athletes at ON a.athlete_id = at.id
     LEFT JOIN stories s ON a.story_id = s.id
     LEFT JOIN schools sc ON sc.name = at.university
     WHERE a.published = 1${article ? " AND a.id = ?" : ""}
     ORDER BY a.id ASC`,
    article ? [article] : [],
  );

  let rendered = 0;
  let skipped = 0;
  for (const row of rows.results) {
    const key = cardBlobKey(row.id);
    if (!force) {
      const existing = await db.query<{ key: string }>(
        "SELECT key FROM card_blobs WHERE key = ?",
        [key],
      );
      if (existing.results.length > 0) {
        skipped++;
        continue;
      }
    }

    try {
      const png = await renderCardPng(row, assets);
      await db.execute(
        `INSERT INTO card_blobs (key, png_base64, width, height)
         VALUES (?, ?, 1200, 630)
         ON CONFLICT(key) DO UPDATE SET png_base64 = excluded.png_base64, created_at = datetime('now')`,
        [key, png.toString("base64")],
      );
      rendered++;
      console.log(`  ✓ ${key} (artikel ${row.id}, ${Math.round(png.length / 1024)} KB)`);
      if (out) {
        writeFileSync(out, png);
        console.log(`    → skrevet til ${out}`);
      }
    } catch (err) {
      // Én fejlet render må ikke stoppe resten — /api/og-fallbacket dækker den
      console.error(`  ✗ ${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nFærdig: ${rendered} renderet, ${skipped} fandtes allerede (${rows.results.length} publicerede).`);
}

main().catch((err) => {
  console.error("Kort-prerender fejlede:", err);
  process.exit(1);
});
