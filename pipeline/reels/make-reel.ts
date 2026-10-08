/**
 * One text-only reel a day per site (PLAN-reels.md, Mikkel 2026-10-08: UK first,
 * no athlete tags yet, around 9 AM UK time, silent).
 * ============================================================================
 *
 * Picks one article published in the last 24 hours, renders its frames with
 * satori + resvg (as render-cards.ts does), joins them into a silent MP4 with
 * ffmpeg, and publishes it as an Instagram reel. Everything runs in GitHub
 * Actions; the Worker is not involved, and D1 sees one selection query and one
 * `social_posts` row a day. The reel's row uses its own channel name
 * (`instagram_uk_reel`), so the hourly social drain never touches it and the
 * UNIQUE(article_id, channel) constraint stops a rerun posting twice.
 *
 * Upload: Meta fetches the MP4 from /api/og?type=reel on the site, where it is
 * parked in card_blobs for the minute that takes (see parkVideo below).
 *
 *   npx tsx pipeline/reels/make-reel.ts [--country UK] [--article N] [--out DIR]
 *        [--render-only | --container-only] [--scheduled]
 *
 *   --render-only     frames + MP4 to disk; no Meta, no D1 write
 *   --container-only  let Meta fetch it and wait for FINISHED, then stop: nothing is published
 *   --scheduled       only between 08:30 and 11:00 UK time, and once a day
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { countryProfile } from "../../src/lib/countries";
import { getArticleReelUrl, metaDescription, reelBlobKey } from "../../src/lib/seo";
import { siteBaseUrl } from "../../src/lib/site";
import { ADDITION_TYPE } from "../../src/lib/article-addition";
import { isWeeklyAward } from "../generate/award-section";
import { buildPostText } from "../social/copy";
import { readAccountEnv } from "../social/registry";
import {
  fetchPermalink,
  graphFor,
  interpretContainerStatus,
  publishWithRetry,
} from "../social/channels/instagram";
import {
  REEL_HEIGHT,
  REEL_WIDTH,
  FADE,
  buildFrames,
  fadeOffsets,
  frameElement,
  frameSeconds,
  totalSeconds,
  type Frame,
} from "./frames";

const ROOT = process.cwd();

interface Args {
  country: string;
  article: number | null;
  out: string | null;
  renderOnly: boolean;
  containerOnly: boolean;
  scheduled: boolean;
}

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const val = (flag: string) => { const i = a.indexOf(flag); return i >= 0 ? a[i + 1] ?? null : null; };
  return {
    country: (val("--country") ?? "UK").toUpperCase(),
    article: val("--article") ? Number(val("--article")) : null,
    out: val("--out"),
    renderOnly: a.includes("--render-only"),
    containerOnly: a.includes("--container-only"),
    scheduled: a.includes("--scheduled"),
  };
}

export const reelChannel = (country: string) => `instagram_${country.toLowerCase()}_reel`;

/** UK local time as minutes after midnight, and the UK date. */
function londonNow(now = new Date()): { minutes: number; day: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now).map((p) => [p.type, p.value]));
  return { minutes: Number(parts.hour) * 60 + Number(parts.minute), day: `${parts.year}-${parts.month}-${parts.day}` };
}

/** Two cron times (07:50 and 08:50 UTC) cover 9 AM in both BST and GMT; this window picks one. */
export function inPostingWindow(minutes: number): boolean {
  return minutes >= 8 * 60 + 30 && minutes < 11 * 60;
}

interface Candidate {
  id: number;
  title: string;
  summary: string | null;
  content: string;
  published_at: string;
  name: string;
  gender: string | null;
  hometown: string | null;
  sport: string | null;
  university: string | null;
  fact_sheet: string | null;
}

function recordsOf(factSheet: string | null): string[] {
  try {
    const fs = JSON.parse(factSheet ?? "null") as { records?: Array<{ text?: unknown }> } | null;
    return (fs?.records ?? []).map((r) => r.text).filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}

// ─── Rendering ──────────────────────────────────────────────────────────────

function loadFonts() {
  const font = (f: string) => readFileSync(path.join(ROOT, "public/fonts", f));
  return [
    { name: "Playfair Display", data: font("playfair-700.ttf"), weight: 700 as const, style: "normal" as const },
    { name: "Noto Sans", data: font("notosans-400.ttf"), weight: 400 as const, style: "normal" as const },
    { name: "Noto Sans", data: font("notosans-700.ttf"), weight: 700 as const, style: "normal" as const },
  ];
}

async function renderFrames(frames: Frame[], dir: string): Promise<string[]> {
  const fonts = loadFonts();
  const files: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    const svg = await satori(frameElement(frames[i], i, frames.length) as Parameters<typeof satori>[0], {
      width: REEL_WIDTH, height: REEL_HEIGHT, fonts,
    });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: REEL_WIDTH } }).render().asPng();
    const file = path.join(dir, `frame-${i + 1}.png`);
    writeFileSync(file, png);
    files.push(file);
  }
  return files;
}

/** Frames → silent H.264 MP4 with crossfades. ffmpeg is preinstalled on ubuntu-latest. */
function encode(files: string[], durations: number[], out: string): void {
  const inputs = files.flatMap((f, i) => ["-loop", "1", "-framerate", "30", "-t", String(durations[i]), "-i", f]);
  const offsets = fadeOffsets(durations);
  const chain: string[] = [];
  let prev = "[0:v]";
  for (let i = 1; i < files.length; i++) {
    const label = i === files.length - 1 ? "[vx]" : `[v${i}]`;
    chain.push(`${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offsets[i - 1]}${label}`);
    prev = label;
  }
  const filter = files.length > 1 ? `${chain.join(";")};[vx]format=yuv420p[v]` : "[0:v]format=yuv420p[v]";
  const total = totalSeconds(durations).toFixed(2);
  const args = [
    "-y", ...inputs,
    // A silent stereo track: some players treat a video without audio as broken.
    "-f", "lavfi", "-t", total, "-i", "anullsrc=r=48000:cl=stereo",
    "-filter_complex", filter, "-map", "[v]", "-map", `${files.length}:a`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30",
    "-c:a", "aac", "-b:a", "64k", "-t", total, "-movflags", "+faststart", out,
  ];
  const res = spawnSync(process.env.FFMPEG ?? "ffmpeg", args, { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`ffmpeg failed (${res.status}): ${(res.stderr ?? res.error?.message ?? "").slice(-1500)}`);
}

// ─── Publishing (Instagram, video_url) ──────────────────────────────────────
//
// Resumable byte upload was tried first and refused on 2026-10-08 («The
// parameter video_url is required»): with Instagram Login the video must be at
// a public URL. It is parked in card_blobs and served by /api/og?type=reel for
// the minute Meta needs, then deleted. Base64 in a TEXT column, as the cards:
// D1's REST API takes no binary, and a row may be at most 2 MB.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REEL_TIMEOUT_MS = 5 * 60_000;
const REEL_POLL_MS = 10_000;
const MAX_BASE64 = 1_800_000;

export async function parkVideo(db: D1Client, articleId: number, video: Buffer): Promise<void> {
  const b64 = video.toString("base64");
  if (b64.length > MAX_BASE64) throw new Error(`Reel too large for a D1 row (${Math.round(b64.length / 1024)} KB base64)`);
  await db.execute(
    `INSERT INTO card_blobs (key, png_base64, width, height) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET png_base64 = excluded.png_base64, created_at = datetime('now')`,
    [reelBlobKey(articleId), b64, REEL_WIDTH, REEL_HEIGHT],
  );
}

export async function unparkVideo(db: D1Client, articleId: number): Promise<void> {
  await db.execute("DELETE FROM card_blobs WHERE key = ?", [reelBlobKey(articleId)]);
}

async function uploadReel(country: string, videoUrl: string, caption: string): Promise<{ graph: string; igUserId: string; token: string; creationId: string }> {
  const igUserId = readAccountEnv("instagram", country, "USER_ID");
  const token = readAccountEnv("instagram", country, "ACCESS_TOKEN");
  if (!igUserId || !token) throw new Error(`Instagram ${country} is not configured (USER_ID / ACCESS_TOKEN)`);
  const graph = graphFor(country);

  const create = await fetch(`${graph}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: "REELS", video_url: videoUrl, caption, share_to_feed: true, access_token: token }),
  });
  const createBody = await create.text();
  if (!create.ok) throw new Error(`Reel container failed (${create.status}): ${createBody} [video_url: ${videoUrl}]`);
  const { id: creationId } = JSON.parse(createBody) as { id?: string };
  if (!creationId) throw new Error(`Reel container without id: ${createBody}`);
  console.log(`  container ${creationId} · Meta fetches ${videoUrl}`);

  // Video takes longer than an image: poll for minutes, not seconds.
  const deadline = Date.now() + REEL_TIMEOUT_MS;
  let last = "unknown";
  while (Date.now() < deadline) {
    await sleep(REEL_POLL_MS);
    const res = await fetch(`${graph}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) { last = `status lookup ${res.status}`; continue; }
    const data = (await res.json()) as { status_code?: string; status?: string };
    last = data.status_code ?? "no status_code";
    const verdict = interpretContainerStatus(data.status_code);
    if (verdict === "ready") return { graph, igUserId, token, creationId };
    if (verdict === "dead") throw new Error(`Reel container ended as ${last}: ${data.status ?? ""}`);
  }
  throw new Error(`Reel container not ready within ${REEL_TIMEOUT_MS / 1000} s (last: ${last})`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();
  const db = createD1Client();
  const channel = reelChannel(args.country);
  const brand = countryProfile(args.country).brand;

  if (args.scheduled) {
    const { minutes, day } = londonNow();
    if (!inPostingWindow(minutes)) {
      console.log(`Outside the 08:30–11:00 UK window (${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}) — nothing to do.`);
      return;
    }
    const today = await db.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM social_posts WHERE channel = ? AND status = 'posted' AND posted_at >= datetime('now', '-20 hours')`,
      [channel],
    );
    if ((today.results[0]?.n ?? 0) > 0) {
      console.log(`A reel already went out today (${day}) — nothing to do.`);
      return;
    }
  }

  const rows = await db.query<Candidate>(
    `SELECT a.id, a.title, a.summary, a.content, a.published_at, at.name, at.gender, at.hometown, at.sport, at.university, s.fact_sheet
       FROM articles a
       JOIN athletes at ON at.id = a.athlete_id
       LEFT JOIN stories s ON s.id = a.story_id
      WHERE a.published = 1 AND a.country = ? AND COALESCE(a.article_type, '') != ?
        ${args.article ? "AND a.id = ?" : `AND a.published_at >= datetime('now', '-24 hours')
        AND NOT EXISTS (SELECT 1 FROM social_posts sp WHERE sp.article_id = a.id AND sp.channel = ?)
        AND a.athlete_id NOT IN (SELECT a2.athlete_id FROM social_posts sp2 JOIN articles a2 ON a2.id = sp2.article_id
                                  WHERE sp2.channel = ? AND sp2.posted_at >= datetime('now', '-3 days'))`}`,
    args.article ? [args.country, ADDITION_TYPE, args.article] : [args.country, ADDITION_TYPE, channel, channel],
  );
  if (!rows.results.length) {
    console.log(args.article ? `Article ${args.article} is not a published ${args.country} article.` : "No article published in the last 24 hours — no reel today.");
    return;
  }

  // The most frames (most sourced data) wins; then a weekly award; then the newest.
  const scored = rows.results.map((r) => {
    const frames = buildFrames({ name: r.name, gender: r.gender, hometown: r.hometown, university: r.university, sport: r.sport,
      title: r.title, brand, records: recordsOf(r.fact_sheet) });
    return { r, frames, score: frames.length * 2 + (isWeeklyAward(r.title) ? 1 : 0) };
  }).sort((x, y) => y.score - x.score || y.r.published_at.localeCompare(x.r.published_at));
  const { r, frames } = scored[0];
  console.log(`Article ${r.id}: ${r.title}\n  ${frames.length} frames: ${frames.map((f) => f.kind).join(" → ")}`);

  const dir = args.out ?? path.join(process.env.RUNNER_TEMP ?? "/tmp", `reel-${r.id}`);
  mkdirSync(dir, { recursive: true });
  const files = await renderFrames(frames, dir);
  const durations = frames.map(frameSeconds);
  const video = path.join(dir, "reel.mp4");
  encode(files, durations, video);
  console.log(`  ${video} · ${totalSeconds(durations).toFixed(1)} s · ${Math.round(statSync(video).size / 1024)} KB`);
  if (args.renderOnly) return;

  const caption = buildPostText(
    { title: r.title, description: metaDescription({ summary: r.summary, content: r.content }), url: "", lang: "en" },
    "instagram",
  );

  const videoUrl = siteBaseUrl(countryProfile(args.country)) + getArticleReelUrl({ id: r.id });
  try {
    await parkVideo(db, r.id, readFileSync(video));
    const up = await uploadReel(args.country, videoUrl, caption);
    if (args.containerOnly) {
      console.log(`  container FINISHED — stopping here (--container-only). Nothing was published.`);
      return;
    }
    const mediaId = await publishWithRetry(up.graph, up.igUserId, up.creationId, up.token);
    const url = mediaId ? await fetchPermalink(up.graph, mediaId, up.token) : null;
    await db.execute(
      `INSERT INTO social_posts (article_id, channel, status, posted_at, post_url, attempts)
       VALUES (?, ?, 'posted', datetime('now'), ?, 1)
       ON CONFLICT(article_id, channel) DO UPDATE SET status = 'posted', posted_at = datetime('now'),
         post_url = excluded.post_url, attempts = attempts + 1, last_error = NULL`,
      [r.id, channel, url],
    );
    console.log(`  ✓ published ${url ?? mediaId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!args.containerOnly) {
      await db.execute(
        `INSERT INTO social_posts (article_id, channel, status, attempts, last_error)
         VALUES (?, ?, 'failed', 1, ?)
         ON CONFLICT(article_id, channel) DO UPDATE SET status = 'failed', attempts = attempts + 1, last_error = excluded.last_error`,
        [r.id, channel, msg.slice(0, 1000)],
      );
    }
    throw err;
  } finally {
    // Meta has its own copy once the container is FINISHED; ours goes either way.
    await unparkVideo(db, r.id).catch((e) => console.error(`  ! could not delete reel-${r.id}:`, e));
  }
}

if (/make-reel\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error("Reel failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
