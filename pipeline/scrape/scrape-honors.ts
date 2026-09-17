/**
 * Udmærkelser fra atletens OFFICIELLE bio-side → `athlete_events` → profilen.
 *
 * VI KOPIERER IKKE SKOLENS TEKST. Mikkel, 17. september 2026: «I prefer a table
 * style summary of honors to avoid a complete copy, as I don't want a copy/paste
 * solution». Det er derfor `extractEvents()` genbruges uændret: den svarer med
 * et KANONISK navn ("All-American", "All-Conference", "Mesterskab") — ikke med
 * den sætning den fandt det i. Skolens sætninger er skolens; at prisen blev
 * vundet er ingens, og tabellen er vores egen fremstilling af det.
 *
 * PRÆCISION FØR DÆKNING. Ordene vi leder efter står også i sidernes navigation
 * ("NCAA Championship", "Player of the Year"-arkiver, sponsorbannere). Derfor
 * læses KUN bio-beholderen, og findes den ikke, springes atleten over. Det er
 * bedre at mangle en pris end at give en atlet en andens.
 *
 * SÆSONEN kommer fra sidens egen opdeling ("SOPHOMORE (2025-26)", "As a
 * Freshman (2024-25)"): teksten skæres i sæson-afsnit, og hvert afsnit læses
 * med sin egen sæson. Uden sæson-overskrifter læses hele bioen én gang med
 * season = null — en pris uden årstal er stadig en pris.
 *
 * Kør:  npx tsx pipeline/scrape/scrape-honors.ts --dry-run --limit 40
 *       npx tsx pipeline/scrape/scrape-honors.ts --limit 600 [--country UK]
 */
import * as cheerio from "cheerio";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { extractEvents, type ExtractedEvent } from "../../src/lib/athlete-events";
import { pipelineUserAgent } from "../../src/lib/site";

interface AthleteRow {
  id: number;
  name: string;
  bio_url: string;
}

/**
 * Bio-beholderen, på tværs af to Sidearm-generationer:
 * den gamle bruger ét id, den nye en klynge `c-rosterbio-*`/`…left-rail__content`.
 * Rækkefølgen er snævrest først — en side kan have begge.
 */
const BIO_SELECTORS = [
  "#sidearm-roster-player-bio",
  "[id*='player-bio']",
  "[id*='bio-left-rail__content']",
  ".c-rosterbio-page__content",
  ".sidearm-roster-player-bio",
];

/** Bio-teksten, eller null hvis siden ikke har en bio vi kan afgrænse. */
export function extractBioText(html: string): string | null {
  const $ = cheerio.load(html);
  for (const sel of BIO_SELECTORS) {
    const el = $(sel).first();
    if (el.length === 0) continue;
    const text = el.text().replace(/\s+/g, " ").trim();
    // En tom eller nærmest tom beholder er ikke en bio. 80 tegn er sat lavt
    // nok til "Redshirted the 2025-26 season." og højt nok til at udelukke
    // en overskrift alene.
    if (text.length >= 80) return text;
  }
  return null;
}

/**
 * Bioen skåret i (sæson, tekst)-par på sidens egne sæson-markører.
 * Alt før den første markør hører ingen sæson til og læses med null.
 */
export function seasonChunks(bio: string): { season: string | null; text: string }[] {
  const re = /\b(20\d{2})\s*[-–]\s*(\d{2})\b/g;
  const marks: { season: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(bio)) !== null) {
    // En sæson er to PÅ HINANDEN FØLGENDE år. «2018-22» er en studietid, ikke
    // en sæson, og stod som sådan på Kyle Penmans profil i stikprøven.
    const start = parseInt(m[1], 10);
    if ((start + 1) % 100 !== parseInt(m[2], 10)) continue;
    marks.push({ season: `${m[1]}-${m[2]}`, index: m.index });
  }
  if (marks.length === 0) return [{ season: null, text: bio }];

  const out: { season: string | null; text: string }[] = [];
  if (marks[0].index > 0) out.push({ season: null, text: bio.slice(0, marks[0].index) });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].index : bio.length;
    out.push({ season: marks[i].season, text: bio.slice(marks[i].index, end) });
  }
  return out;
}

export interface HarvestedHonor extends ExtractedEvent {
  season: string | null;
}

/**
 * Udmærkelserne i en bio, én pr. (pris, sæson).
 *
 * Samme pris i to sæsoner er to rækker — det er dét en tabel skal vise. Samme
 * pris to gange i SAMME sæson er én: "All-America for the second consecutive
 * season" nævner den to gange i samme afsnit.
 */
export function harvestHonors(bio: string): HarvestedHonor[] {
  const seen = new Set<string>();
  const out: HarvestedHonor[] = [];
  for (const chunk of seasonChunks(bio)) {
    for (const ev of extractEvents(chunk.text)) {
      const key = `${ev.award_name}|${chunk.season ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...ev, season: chunk.season });
    }
  }
  // Bioens indledning opsummerer tit karrieren FØR sæson-afsnittene ("a
  // two-time All-American who…"), og den har ingen sæson. Står samme pris
  // også med årstal længere nede, er den sæsonløse række den samme oplysning
  // uden årstallet — og i en tabel bliver den til en linje med "—" ved siden
  // af den rigtige. Den ryger.
  const seasoned = new Set(out.filter((h) => h.season).map((h) => h.award_name));
  return out.filter((h) => h.season !== null || !seasoned.has(h.award_name));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": pipelineUserAgent() },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function originOf(bioUrl: string): string {
  try {
    return new URL(bioUrl).origin;
  } catch {
    return "";
  }
}

function parseArgs(): { limit: number; dryRun: boolean; country: string | null } {
  const args = process.argv.slice(2);
  let limit = 600;
  let country: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!Number.isNaN(n)) limit = n;
    }
    if (args[i] === "--country" && args[i + 1]) country = args[i + 1].toUpperCase();
  }
  return { limit, dryRun: args.includes("--dry-run"), country };
}

/** Samme vært-gruppering som handle-høsten: seks skoler ad gangen, én atlet ad gangen pr. skole. */
const HOST_CONCURRENCY = 6;

async function main(): Promise<void> {
  const { limit, dryRun, country } = parseArgs();
  const db: D1Client = createD1Client();

  const athletes = await db.query<AthleteRow>(
    `SELECT a.id, a.name, a.bio_url
     FROM athletes a
     WHERE a.active = 1
       AND a.bio_url IS NOT NULL AND a.bio_url <> ''
       ${country ? "AND a.home_country = ?" : ""}
     ORDER BY a.honors_checked_at ASC NULLS FIRST, a.name
     LIMIT ?`,
    country ? [country, limit] : [limit],
  );

  const byHost = new Map<string, AthleteRow[]>();
  for (const a of athletes.results) {
    const o = originOf(a.bio_url);
    const b = byHost.get(o);
    if (b) b.push(a);
    else byHost.set(o, [a]);
  }
  const hosts = [...byHost.entries()];
  console.log(
    `${athletes.results.length} atlet(er)${country ? ` (${country})` : ""} fordelt på ${hosts.length} atletiksite(r)${dryRun ? " — DRY RUN" : ""}`,
  );

  let withBio = 0;
  let withHonors = 0;
  let rows = 0;
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= hosts.length) return;
      for (const athlete of hosts[i][1]) {
        const html = await fetchPage(athlete.bio_url);
        if (!dryRun) {
          await db.execute(
            `UPDATE athletes SET honors_checked_at = datetime('now') WHERE id = ?`,
            [athlete.id],
          );
        }
        if (!html) continue;
        const bio = extractBioText(html);
        if (!bio) continue;
        withBio++;
        const honors = harvestHonors(bio);
        if (honors.length === 0) continue;
        withHonors++;
        console.log(
          `✓ ${athlete.name}: ${honors.map((h) => `${h.award_name}${h.season ? ` (${h.season})` : ""}`).join(", ")}`,
        );
        if (dryRun) {
          rows += honors.length;
          continue;
        }
        for (const h of honors) {
          // `summary` får det kanoniske navn, ikke skolens sætning — se filens
          // hoved. Unik-indekset (athlete_id, award_name, season) gør gentagne
          // kørsler gratis.
          const res = await db.execute(
            `INSERT OR IGNORE INTO athlete_events
               (athlete_id, season, kind, award_name, summary, significance, source_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [athlete.id, h.season, h.kind, h.award_name, h.award_name, h.significance, athlete.bio_url],
          );
          rows += res.meta?.changes ?? 0;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: HOST_CONCURRENCY }, () => worker()));
  console.log(
    `\nFærdig: ${withBio} bio-sider læst · ${withHonors} atleter med udmærkelser · ${rows} række(r)${dryRun ? " ville blive skrevet" : " skrevet"}.`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("scrape-honors.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
