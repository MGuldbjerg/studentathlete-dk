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
 * TO LÆRREDER (se CARD_FORMATS i src/lib/og-card.ts):
 *   landscape 1200×630 WebP → `card-<id>-v<N>`  — delekort til FB/Bluesky + sitets cover
 *   portrait  1080×1350 JPEG → `ig-<id>-v<N>`   — Instagram, som KUN tager JPEG
 * Målt på artikel 253: WebP 35 KB mod JPEG-mozjpeg 47 KB for samme landscape-kort,
 * så sitet bliver på WebP; JPEG bruges kun hvor Instagram kræver det.
 *
 * Kør:  npx tsx pipeline/render/render-cards.ts [--force] [--article N] [--out fil] [--format F] [--dry-run]
 *   --force      genrender selvom blob findes (efter design-ændring: bump CARD_VERSION!)
 *   --article N  kun én artikel
 *   --out FIL    skriv billedet til disk (lokal visuel verifikation)
 *   --format F   landscape | portrait | begge (standard: begge)
 *   --dry-run    render og skriv KUN til disk — rør ikke D1. Uden den var der
 *                ingen måde at se en designændring uden at skrive i produktion.
 * Idempotent: springer nøgler over der allerede findes (nøgle indeholder CARD_VERSION).
 */
import { readFileSync } from "node:fs";
import { writeFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { CARD_FORMATS, buildMatchCardElement, type CardData, type CardFormat } from "../../src/lib/og-card";
import { cardBlobKey, igCardBlobKey } from "../../src/lib/seo";
import { ALL_CHANNELS, withinQueueWindow } from "../social/post-social";

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

async function renderCard(
  data: CardData,
  assets: ReturnType<typeof loadAssets>,
  format: CardFormat = "landscape",
): Promise<Buffer> {
  const fmt = CARD_FORMATS[format];
  const element = buildMatchCardElement(data, assets.logoDataUri, 1, format);
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: fmt.width,
    height: fmt.height,
    fonts: assets.fonts,
    loadAdditionalAsset: async (code: string, segment: string) => {
      if (code === "emoji") return loadTwemoji(segment);
      // Ukendt glyf-anmodning — returnér tom SVG frem for at vælte renderingen
      return `data:image/svg+xml;base64,${Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64")}`;
    },
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: fmt.width } }).render().asPng();

  // Konverteringen sker HER, i pipelinen (GitHub Actions), ikke i Workeren:
  // `sharp` er en native-modul og hører ikke hjemme på kanten. Workeren
  // serverer bare de bytes der ligger i card_blobs.
  //
  // WebP til sitet: kortet ER LCP-elementet på forsiden, og PNG'erne vejede
  // 73-260 KB — det tungeste enkeltelement på siden.
  //
  // JPEG til Instagram, ikke af smag men af krav: «JPEG is the only image
  // format supported». mozjpeg fordi forskellen er målt — 47 KB mod 64 KB for
  // samme kort ved q82 — og fordi det er den eneste knap vi har her.
  if (format === "portrait") {
    return await sharp(Buffer.from(png)).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  }
  return await sharp(Buffer.from(png)).webp({ quality: 82, effort: 5 }).toBuffer();
}

interface Args {
  force: boolean;
  article: number | null;
  out: string | null;
  formats: CardFormat[];
  dryRun: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let force = false;
  let article: number | null = null;
  let out: string | null = null;
  let formats: CardFormat[] = ["landscape", "portrait"];
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force") force = true;
    if (args[i] === "--dry-run") dryRun = true;
    if (args[i] === "--article" && args[i + 1]) article = parseInt(args[i + 1], 10);
    if (args[i] === "--out" && args[i + 1]) out = args[i + 1];
    if (args[i] === "--format" && args[i + 1]) {
      const f = args[i + 1];
      if (f === "landscape" || f === "portrait") formats = [f];
      else if (f !== "begge") throw new Error(`Ukendt --format: ${f} (landscape | portrait | begge)`);
    }
  }
  return { force, article, out, formats, dryRun };
}

/** Nøgle og lagrede dimensioner hører sammen med formatet — ét sted. */
function blobSpec(format: CardFormat, articleId: number) {
  const fmt = CARD_FORMATS[format];
  return {
    key: format === "portrait" ? igCardBlobKey(articleId) : cardBlobKey(articleId),
    width: fmt.width,
    height: fmt.height,
  };
}

interface CardRow extends CardData {
  id: number;
  published_at: string | null;
}

/**
 * Hvilke lande har brug for et portræt-kort?
 *
 * Svaret står i kanal-registeret, ikke i en konstant her: et portræt-kort er
 * kun til Instagram, og Instagram er én konto i ét land. Uden det filter ville
 * kørslen lave 67 britiske IG-kort som ingen konto kan poste — ~5 MB i en base
 * IDEA-datalag.md i forvejen holder øje med.
 *
 * Bemærk at der IKKE spørges til `isConfigured()`. Om et kort skal findes,
 * afhænger af at kanalen EKSISTERER — ikke af om dens secrets tilfældigvis er
 * sat i netop denne kørsel. Ellers ville en manglende secret stille og roligt
 * holde op med at rendere kort, og fejlen ville først vise sig som en kø der
 * venter på et billede der aldrig kommer.
 *
 * Since 2026-10-01 the channel list is generated for every country × platform,
 * so "the channel is in the list" no longer means "the account exists". The
 * test is now the queue: an IG channel exists once it has ever had a
 * `social_posts` row. That still does not ask `isConfigured()` (the render step
 * has no Meta secrets), and a new market costs one run's delay on its very
 * first post — the drain holds the row until the card is there.
 *
 * Returns country → IG channel name, so the caller can also ask whether an
 * article is new enough for that channel's queue (see `withinQueueWindow`).
 */
async function portraitCountries(db: D1Client): Promise<Map<string, string>> {
  const igChannels = ALL_CHANNELS.filter((c) => c.cardKind === "ig");
  if (igChannels.length === 0) return new Map();
  const used = await db.query<{ channel: string }>(
    `SELECT DISTINCT channel FROM social_posts WHERE channel IN (${igChannels.map(() => "?").join(",")})`,
    igChannels.map((c) => c.name),
  );
  const live = new Set(used.results.map((r) => r.channel));
  return new Map(igChannels.filter((c) => live.has(c.name)).map((c) => [c.country, c.name]));
}

async function main(): Promise<void> {
  const { force, article, out, formats, dryRun } = parseArgs();
  const db = createD1Client();
  const assets = loadAssets();

  if (dryRun) console.log("DRY-RUN: renderer og skriver til disk, rører ikke D1." + "\n");

  // Samme joins som /api/og getCardData — kun publicerede artikler pre-renderes
  const rows = await db.query<CardRow>(
    `SELECT a.id, a.title, a.created_at, a.published_at, a.country, at.name as athlete_name, at.sport, at.university,
            sc.primary_color, s.fact_sheet
     FROM articles a
     LEFT JOIN athletes at ON a.athlete_id = at.id
     LEFT JOIN stories s ON a.story_id = s.id
     LEFT JOIN schools sc ON sc.name = at.university
     WHERE a.published = 1${article ? " AND a.id = ?" : ""}
     ORDER BY a.id ASC`,
    article ? [article] : [],
  );

  const igCountries = await portraitCountries(db);
  if (formats.includes("portrait")) {
    console.log(`Portræt-kort renderes for: ${[...igCountries.keys()].join(", ") || "(ingen lande — ingen IG-kanal)"}`);
  }

  let rendered = 0;
  let skipped = 0;
  for (const row of rows.results) {
    for (const format of formats) {
      // Et portræt-kort til et land uden Instagram-konto er spildt arbejde og
      // spildt plads. Springes stille over — det er ikke en fejl.
      if (format === "portrait") {
        const igChannel = igCountries.get(row.country ?? "");
        if (!igChannel) continue;
        // Only articles the IG queue can still take. The queue never picks up
        // older ones, so their cards would only fill D1. `--article` is a
        // deliberate request and is always honoured.
        if (!article && !withinQueueWindow(row.published_at, igChannel)) continue;
      }
      const { key, width, height } = blobSpec(format, row.id);

      // I dry-run springer vi ALDRIG over: man beder om den netop for at se
      // kortet, og et «fandtes allerede» ville give en tom mappe og ingen fejl.
      if (!force && !dryRun) {
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
        const img = await renderCard(row, assets, format);
        if (!dryRun) {
          await db.execute(
            `INSERT INTO card_blobs (key, png_base64, width, height)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET png_base64 = excluded.png_base64, created_at = datetime('now')`,
            [key, img.toString("base64"), width, height],
          );
        }
        rendered++;
        console.log(`  ${dryRun ? "·" : "✓"} ${key} (artikel ${row.id}, ${width}×${height}, ${Math.round(img.length / 1024)} KB)`);
        if (out) {
          // Flere formater i én kørsel må ikke overskrive hinandens fil.
          const file = formats.length > 1 ? out.replace(/(\.[a-z]+)?$/, `-${format}$1`) : out;
          writeFileSync(file, img);
          console.log(`    → skrevet til ${file}`);
        }
      } catch (err) {
        // Én fejlet render må ikke stoppe resten — /api/og-fallbacket dækker den
        console.error(`  ✗ ${key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log(
    `\nFærdig: ${rendered} renderet, ${skipped} fandtes allerede ` +
      `(${rows.results.length} publicerede × ${formats.length} format).`,
  );
}

main().catch((err) => {
  console.error("Kort-prerender fejlede:", err);
  process.exit(1);
});
