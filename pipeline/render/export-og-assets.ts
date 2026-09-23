/**
 * Export OG images as static files, so Cloudflare serves them WITHOUT the Worker.
 * ===============================================================================
 *
 * Runs at the start of `npm run build:worker` (i.e. every deploy) and writes
 * into public/og/, which Next copies into the static-asset directory. Why and
 * how the URLs work: src/lib/og-static.ts.
 *
 *   public/og/cards/card-<id>-v<N>.webp  ← copied from card_blobs (already rendered
 *                                          by render-cards.ts; nothing is re-rendered)
 *   public/og/g/<hash>.webp              ← generic image for athletes WITHOUT a photo,
 *                                          in its own site's language, rendered here at
 *                                          1200×630 with the same design as /api/og
 *
 * Generic files are content-addressed (the name is a hash of what they show),
 * so an existing file is never re-rendered: only new or renamed athletes cost
 * time. Files nobody references any more are deleted, so public/og/ does not
 * grow forever.
 *
 * FAIL-SOFT, on purpose. Anything this script does not write is still served —
 * by the Worker, as before. A D1 hiccup must never stop a deploy, so every
 * failure is a warning and the exit code is 0.
 *
 * Run by hand:  npx tsx pipeline/render/export-og-assets.ts
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { createD1Client } from "../lib/d1-client";
import { CARD_VERSION, athleteOgParams, GENERIC_OG_VERSION } from "../../src/lib/seo";
import { cardAssetPath, genericAssetPath } from "../../src/lib/og-static";
import { buildGenericElement, GENERIC_OG_SIZE } from "../../src/lib/og-generic";
import { activeCountries } from "../../src/lib/countries";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const OG_DIR = path.join(PUBLIC, "og");

/** public/og/... on disk for a URL path from og-static.ts. */
function diskPath(urlPath: string): string {
  return path.join(PUBLIC, urlPath);
}

function isWebp(b: Buffer): boolean {
  return b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP";
}

function loadAssets() {
  const font = (f: string) => readFileSync(path.join(PUBLIC, "fonts", f));
  const logo = readFileSync(path.join(PUBLIC, "logo-white.png"));
  return {
    fonts: [
      { name: "Playfair Display", data: font("playfair-700.ttf"), weight: 700 as const, style: "normal" as const },
      { name: "Noto Sans", data: font("notosans-400.ttf"), weight: 400 as const, style: "normal" as const },
      { name: "Noto Sans", data: font("notosans-700.ttf"), weight: 700 as const, style: "normal" as const },
    ],
    logoDataUri: `data:image/png;base64,${logo.toString("base64")}`,
  };
}

async function exportCards(db: ReturnType<typeof createD1Client>, wanted: Set<string>): Promise<number> {
  const PAGE = 25; // ~47 KB of base64 per row; keeps each D1 HTTP response small
  let written = 0;
  for (let offset = 0; ; offset += PAGE) {
    const { results } = await db.query<{ key: string; png_base64: string }>(
      `SELECT key, png_base64 FROM card_blobs WHERE key LIKE ? ORDER BY key LIMIT ? OFFSET ?`,
      [`card-%-v${CARD_VERSION}`, PAGE, offset],
    );
    for (const r of results) {
      const id = Number(r.key.match(/^card-(\d+)-v\d+$/)?.[1]);
      if (!Number.isFinite(id)) continue;
      const bytes = Buffer.from(r.png_base64, "base64");
      // The static path says .webp. Old PNG blobs stay with the Worker, which
      // sniffs the format — a wrong Content-Type would break the image.
      if (!isWebp(bytes)) continue;
      const urlPath = cardAssetPath(id, CARD_VERSION);
      wanted.add(diskPath(urlPath));
      writeFileSync(diskPath(urlPath), bytes); // always rewrite: a --force re-render keeps the key
      written++;
    }
    if (results.length < PAGE) break;
  }
  return written;
}

async function exportAthletes(db: ReturnType<typeof createD1Client>, wanted: Set<string>) {
  const assets = loadAssets();
  const { results } = await db.query<{ name: string; university: string; sport: string; home_country: string }>(
    `SELECT name, university, sport, home_country FROM athletes WHERE photo_url IS NULL OR photo_url = ''`,
  );
  // An athlete page answers only on its own site (getAthleteBySlug filters on
  // home_country), in that site's language — so one image per athlete.
  const langByCountry = new Map(activeCountries().map((c) => [c.code.toUpperCase(), c.language]));
  let rendered = 0;
  let kept = 0;
  for (const a of results) {
    const lang = langByCountry.get((a.home_country ?? "").toUpperCase());
    if (!lang) continue; // not on any live site: no page, so no image needed
    const params = athleteOgParams(a, lang);
    const file = diskPath(genericAssetPath({ ...params, version: GENERIC_OG_VERSION }));
    wanted.add(file);
    if (existsSync(file)) { kept++; continue; }
    const element = buildGenericElement(
      { title: params.title, subtitle: params.subtitle ?? "", sport: params.sport ?? null, type: "athlete" },
      assets.logoDataUri,
      1,
    );
    const svg = await satori(element as Parameters<typeof satori>[0], { ...GENERIC_OG_SIZE, fonts: assets.fonts });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: GENERIC_OG_SIZE.width } }).render().asPng();
    writeFileSync(file, await sharp(Buffer.from(png)).webp({ quality: 82, effort: 5 }).toBuffer());
    rendered++;
  }
  return { athletes: results.length, rendered, kept };
}

/** Delete files under public/og/ that nothing references any more. */
function prune(wanted: Set<string>): number {
  let removed = 0;
  for (const sub of ["cards", "g"]) {
    const dir = path.join(OG_DIR, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const full = path.join(dir, f);
      if (!wanted.has(full)) { unlinkSync(full); removed++; }
    }
  }
  return removed;
}

async function main() {
  mkdirSync(path.join(OG_DIR, "cards"), { recursive: true });
  mkdirSync(path.join(OG_DIR, "g"), { recursive: true });
  const db = createD1Client();
  const wanted = new Set<string>();
  let cardsOk = false;
  let athletesOk = false;

  try {
    const n = await exportCards(db, wanted);
    console.log(`og-export: ${n} match cards → public/og/cards/`);
    cardsOk = true;
  } catch (e) {
    console.warn(`og-export: WARNING cards skipped (${(e as Error).message}) — the Worker serves them instead`);
  }

  try {
    const r = await exportAthletes(db, wanted);
    console.log(
      `og-export: ${r.athletes} athletes without photo → ${r.rendered} rendered, ${r.kept} already on disk`,
    );
    athletesOk = true;
  } catch (e) {
    console.warn(`og-export: WARNING athlete images skipped (${(e as Error).message}) — the Worker serves them instead`);
  }

  // Only prune what we have a complete picture of: a failed query must not
  // wipe the files the last good run wrote.
  if (cardsOk && athletesOk) console.log(`og-export: ${prune(wanted)} unreferenced files removed`);
}

main().catch((e) => {
  console.warn(`og-export: WARNING ${(e as Error).message} — continuing the build without static OG files`);
});
