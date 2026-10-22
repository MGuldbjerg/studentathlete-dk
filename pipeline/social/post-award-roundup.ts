/**
 * The monthly honours roundup on Instagram (Mikkel 2026-10-22: «Honors
 * roundup is fine, tagging the athletes in the IG-post»).
 * ======================================================================
 *
 * On the 1st: last month's awards to the site's athletes — a card (1080×1350
 * JPEG, satori + sharp as the IG cards), a caption that lists the winners, and
 * the winners TAGGED in the image. Tags only from a handle the athlete gave on
 * their own school bio (`name_match`, not rejected), at most 20 (Meta's limit),
 * the athletes with most awards first. Everyday posts still do not tag.
 *
 * The card is parked in card_blobs (`roundup-<cc>-<YYYY-MM>`) and served by
 * /api/og?type=roundup for Meta to fetch. A stats_cache row per site records
 * the month posted, so a rerun never posts twice.
 *
 *   npx tsx pipeline/social/post-award-roundup.ts [--country UK] [--month 2026-10] [--render-only] [--out DIR]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { countryProfile, siteCountryCodes } from "../../src/lib/countries";
import { siteBaseUrl } from "../../src/lib/site";
import { routePath } from "../../src/lib/i18n";
import { awardLabel } from "../../src/lib/athlete-events";
import { dedupeAwards, previousMonth } from "../../src/lib/award-tally";
import { createInstagramChannel, MAX_USER_TAGS } from "./channels/instagram";
import { normaliseHandle } from "./collab";

const args = process.argv.slice(2);
const val = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] ?? null : null; };
const RENDER_ONLY = args.includes("--render-only");
const MONTH = val("--month") ?? previousMonth();
const COUNTRIES = val("--country") ? [val("--country")!.toUpperCase()] : siteCountryCodes();
const POSTED_KEY = "award_roundup_posted";

export interface Winner {
  athlete_id: number; name: string; school: string; conference: string | null;
  award_name: string; occurred_on: string; handle: string | null;
}

const COPY = {
  en: {
    nat: "British", awards: (n: number) => (n === 1 ? "award" : "awards"),
    lead: (month: string, n: number, m: number) => `${month}: ${n} ${n === 1 ? "award" : "awards"} for ${m} British athletes in US college sport.`,
    sub: "for British athletes in US college sport", more: (n: number) => `+ ${n} more`,
    outro: "Every winner, with the conference's own announcement, is on our awards page — link in bio.",
  },
  da: {
    nat: "danske", awards: (n: number) => (n === 1 ? "pris" : "priser"),
    lead: (month: string, n: number, m: number) => `${month}: ${n} ${n === 1 ? "pris" : "priser"} til ${m} danske atleter i amerikansk college-sport.`,
    sub: "til danske atleter i amerikansk college-sport", more: (n: number) => `+ ${n} mere`,
    outro: "Alle vindere med konferencens egen meddelelse står på vores side med priser — link i bio.",
  },
} as const;

const monthTitle = (month: string, lang: string) => {
  const s = new Date(`${month}-15T12:00:00Z`).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** One line per athlete: their awards this month, the biggest honours first. */
export interface WinnerLine { athlete_id: number; name: string; handle: string | null; where: string; awards: string; weight: number; count: number }

const WEIGHT: Record<string, number> = { "All-American": 4, "Player of the Year": 4, "Årets spiller": 4, MVP: 3, "All-Conference": 3, "All-Region": 3 };

/** Group by athlete; order by the biggest honour, then most awards, then name. Pure. */
export function winnerLines(winners: Winner[], lang: "en" | "da"): WinnerLine[] {
  const by = new Map<number, Winner[]>();
  for (const w of winners) by.set(w.athlete_id, [...(by.get(w.athlete_id) ?? []), w]);
  return [...by.values()].map((ws) => {
    const labels = new Map<string, number>();
    for (const w of ws) { const l = awardLabel(w.award_name, lang); labels.set(l, (labels.get(l) ?? 0) + 1); }
    const awards = [...labels].map(([l, n]) => (n > 1 ? `${n}× ${l}` : l)).join(", ");
    return {
      athlete_id: ws[0].athlete_id, name: ws[0].name, handle: ws.find((w) => w.handle)?.handle ?? null,
      where: ws[0].conference ?? ws[0].school, awards, count: ws.length,
      weight: Math.max(...ws.map((w) => WEIGHT[w.award_name] ?? 1)),
    };
  }).sort((a, b) => b.weight - a.weight || b.count - a.count || a.name.localeCompare(b.name));
}

/** The handles to tag: own-bio handles only, unique, most awards first, at most 20. Pure. */
export function tagsFor(winners: Winner[]): string[] {
  const byAthlete = new Map<number, { handle: string; n: number }>();
  for (const w of winners) {
    if (!w.handle) continue;
    const h = normaliseHandle(w.handle);
    if (!/^[a-z0-9._]{1,30}$/.test(h)) continue;
    const cur = byAthlete.get(w.athlete_id);
    byAthlete.set(w.athlete_id, { handle: h, n: (cur?.n ?? 0) + 1 });
  }
  const seen = new Set<string>();
  return [...byAthlete.values()].sort((a, b) => b.n - a.n || a.handle.localeCompare(b.handle))
    .map((x) => x.handle).filter((h) => (seen.has(h) ? false : (seen.add(h), true))).slice(0, MAX_USER_TAGS);
}

/** The caption: lead line, one line per winner (2,200 characters at most), outro. Pure. */
export function captionFor(winners: Winner[], month: string, lang: "en" | "da"): string {
  const c = COPY[lang];
  const athletes = new Set(winners.map((w) => w.athlete_id)).size;
  const lines = winnerLines(winners, lang).map((w) => `• ${w.name}${w.handle ? ` (@${normaliseHandle(w.handle)})` : ""} — ${w.awards}, ${w.where}`);
  const head = c.lead(monthTitle(month, lang), winners.length, athletes);
  let body = "";
  let shown = 0;
  for (const l of lines) {
    if ((head + "\n\n" + body + l + "\n\n" + c.more(lines.length) + "\n\n" + c.outro).length > 2150) break;
    body += l + "\n";
    shown++;
  }
  if (shown < lines.length) body += c.more(lines.length - shown) + "\n";
  return `${head}\n\n${body}\n${c.outro}`;
}

async function winnersFor(db: D1Client, country: string, month: string): Promise<Winner[]> {
  // The query reaches four days back so a release on the 30th still merges
  // with our article on the 2nd; only the month's own awards are kept.
  const rows = (await db.query<Winner>(
    `SELECT e.athlete_id, a.name,
            COALESCE(NULLIF(trim(substr(sc.common_name, 1, instr(sc.common_name || '/', '/') - 1)), ''), a.university) AS school,
            sc.conference, e.award_name, e.occurred_on,
            CASE WHEN a.instagram_confidence = 'name_match' AND COALESCE(a.instagram_rejected, '') = ''
                      AND COALESCE(a.instagram_status, '') != 'rejected' THEN a.instagram_handle END AS handle
       FROM athlete_events e JOIN athletes a ON a.id = e.athlete_id
       LEFT JOIN schools sc ON sc.name = a.university
      WHERE e.kind = 'award' AND a.home_country = ? AND e.award_name IS NOT NULL
        AND e.occurred_on >= date(?, '-4 days') AND e.occurred_on < date(?, '+1 month')
      ORDER BY e.occurred_on, a.name`,
    [country, `${month}-01`, `${month}-01`])).results;
  return dedupeAwards(rows).filter((w) => w.occurred_on.slice(0, 7) === month);
}

function cardElement(winners: Winner[], month: string, lang: "en" | "da", brand: string) {
  const c = COPY[lang];
  const el = (type: string, style: Record<string, string | number>, children?: unknown) => ({ type, props: { style, children } });
  const lines = winnerLines(winners, lang);
  const list = lines.slice(0, 7).map((w) =>
    el("div", { display: "flex", flexDirection: "column", paddingTop: 14, paddingBottom: 14, borderTop: "2px solid rgba(255,255,255,0.18)" }, [
      el("div", { fontFamily: "Noto Sans", fontWeight: 700, fontSize: 30 }, w.name),
      el("div", { fontFamily: "Noto Sans", fontSize: 24, color: "#C9CEDB" }, `${w.awards} · ${w.where}`),
    ]));
  if (lines.length > 7) list.push(el("div", { fontFamily: "Noto Sans", fontSize: 26, color: "#C9CEDB", paddingTop: 14 }, c.more(lines.length - 7)));
  return el("div", {
    width: 1080, height: 1350, display: "flex", flexDirection: "column", backgroundColor: "#00205B", color: "#FFFFFF",
    paddingTop: 80, paddingBottom: 70, paddingLeft: 84, paddingRight: 84, justifyContent: "space-between",
  }, [
    el("div", { display: "flex", flexDirection: "column" }, [
      el("div", { display: "flex", alignItems: "center", gap: 20 }, [
        el("div", { width: 80, height: 6, backgroundColor: "#BF0A30" }),
        el("div", { fontFamily: "Noto Sans", fontWeight: 700, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: "#C9CEDB" }, monthTitle(month, lang)),
      ]),
      el("div", { fontFamily: "Playfair Display", fontWeight: 700, fontSize: 190, lineHeight: 1, marginTop: 30 }, String(winners.length)),
      el("div", { fontFamily: "Noto Sans", fontSize: 38, marginTop: 6 }, `${c.awards(winners.length)} ${c.sub}`),
    ]),
    el("div", { display: "flex", flexDirection: "column" }, list),
    el("div", { fontFamily: "Noto Sans", fontWeight: 700, fontSize: 28, letterSpacing: 3, color: "#C9CEDB" }, brand.toUpperCase()),
  ]);
}

async function renderCard(winners: Winner[], month: string, lang: "en" | "da", brand: string): Promise<Buffer> {
  const font = (f: string) => readFileSync(path.join(process.cwd(), "public/fonts", f));
  const svg = await satori(cardElement(winners, month, lang, brand) as Parameters<typeof satori>[0], {
    width: 1080, height: 1350,
    fonts: [
      { name: "Playfair Display", data: font("playfair-700.ttf"), weight: 700, style: "normal" },
      { name: "Noto Sans", data: font("notosans-400.ttf"), weight: 400, style: "normal" },
      { name: "Noto Sans", data: font("notosans-700.ttf"), weight: 700, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } }).render().asPng();
  return await sharp(Buffer.from(png)).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

async function main(): Promise<void> {
  const db = createD1Client();
  for (const country of COUNTRIES) {
    const site = countryProfile(country);
    const lang = site.language === "da" ? "da" : "en";
    const winners = await winnersFor(db, country, MONTH);
    if (!winners.length) { console.log(`${country} ${MONTH}: no awards — nothing to post.`); continue; }
    const posted = (await db.query<{ value: string }>("SELECT value FROM stats_cache WHERE key = ? AND country = ?", [POSTED_KEY, country])).results[0]?.value;
    if (!RENDER_ONLY && posted && JSON.parse(posted).month === MONTH) { console.log(`${country} ${MONTH}: already posted.`); continue; }

    const tags = tagsFor(winners);
    const caption = captionFor(winners, MONTH, lang);
    const card = await renderCard(winners, MONTH, lang, site.brand);
    console.log(`${country} ${MONTH}: ${winners.length} awards, ${tags.length} tags, caption ${caption.length} chars, card ${Math.round(card.length / 1024)} KB`);

    if (RENDER_ONLY) {
      const dir = val("--out") ?? path.join(process.env.RUNNER_TEMP ?? "/tmp", "roundup");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `roundup-${country.toLowerCase()}-${MONTH}.jpg`), card);
      writeFileSync(path.join(dir, `roundup-${country.toLowerCase()}-${MONTH}.txt`), `${caption}\n\nTAGS: ${tags.join(", ")}\n`);
      console.log(`  → ${dir}`);
      continue;
    }

    const channel = createInstagramChannel(country);
    if (!channel.isConfigured()) { console.log(`${country}: Instagram not configured — skipped.`); continue; }
    const key = `roundup-${country.toLowerCase()}-${MONTH}`;
    await db.execute(
      `INSERT INTO card_blobs (key, png_base64, width, height) VALUES (?, ?, 1080, 1350)
       ON CONFLICT(key) DO UPDATE SET png_base64 = excluded.png_base64, created_at = datetime('now')`,
      [key, card.toString("base64")],
    );
    const base = siteBaseUrl(site);
    const result = await channel.post({
      text: caption, url: `${base}${routePath("stats", lang)}/${lang === "da" ? "priser" : "awards"}`,
      title: monthTitle(MONTH, lang), summary: null,
      imageUrl: `${base}/api/og?type=roundup&key=${key}`, userTags: tags,
    });
    await db.execute(
      `INSERT INTO stats_cache (key, country, value, computed_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key, country) DO UPDATE SET value = excluded.value, computed_at = excluded.computed_at`,
      [POSTED_KEY, country, JSON.stringify({ month: MONTH, url: result.postUrl, tags: result.userTags ?? [] })],
    );
    console.log(`  ✓ posted ${result.postUrl ?? result.mediaId ?? ""} with ${result.userTags?.length ?? 0} tags`);
  }
}

if (/post-award-roundup\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
