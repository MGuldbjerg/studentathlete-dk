/**
 * Ekspansions-katalog: scrap ALLE skoler × sportsgrene, behold hver INTERNATIONAL
 * atlet (ikke kun danskere) og upsert til `international_athletes`.
 *
 * Adskilt fra site-pipelinen — ingen site-kode læser tabellen. Formål: akkumulér
 * inventar + empiriske land-tal til pool-vs-eget-site-beslutningstræet ved launch.
 *
 * Genbruger den samme scrape-teknik som report/full-international-analysis.ts, men
 * dét script kan IKKE importeres (det kører main() ved import), så scrape-hjælperne
 * er bevidst gen-erklæret her for isolation.
 *
 * Kør:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_D1_DATABASE_ID=... \
 *   npx tsx pipeline/catalogue/catalogue-international.ts [--limit-per-div N] [--concurrency 10] [--dry-run] [--include-canada]
 */

import { createD1Client } from "../lib/d1-client";
import type { D1Client } from "../lib/d1-client";
import { parseRoster } from "../scrape/parsers";
import { classifyHometown } from "../report/country-normalize";
import { marketFor, normalizeNameKey } from "./country-language";
import * as fs from "fs";
import * as path from "path";

import { pipelineUserAgent } from "../../src/lib/site";
const USER_AGENT = pipelineUserAgent();

interface SchoolRow {
  id: number;
  name: string;
  division: string;
  website: string;
  platform_type: string | null;
}

export interface CatalogueAthlete {
  name: string;
  nameKey: string;
  homeCountry: string;
  language: string;
  region: string;
  hometown: string | null;
  school: string;
  schoolId: number;
  division: string;
  sport: string;
  position: string | null;
  bioUrl: string | null;
  rosterUrl: string;
}

const PRESTO_SPORT_CODES: Record<string, string[]> = {
  football: ["football"],
  basketball: ["mbball", "wbball"],
  baseball: ["baseball"],
  soccer: ["msoc", "wsoc"],
  golf: ["mgolf", "wgolf"],
  tennis: ["mten", "wten"],
  "swimming-and-diving": ["mswim", "wswim"],
  "track-and-field": ["mtrack", "wtrack"],
  volleyball: ["wvball"],
  rowing: ["rowing"],
  "ice-hockey": ["mihockey", "wihockey"],
  gymnastics: ["wgym"],
};

const ALL_SPORTS = Object.keys(PRESTO_SPORT_CODES);

function getRosterUrls(website: string, sport: string, platformType: string | null): string[] {
  if (platformType === "prestosports") {
    return (PRESTO_SPORT_CODES[sport] ?? [sport]).map((c) => `${website}/roster.aspx?path=${c}`);
  }
  return [`${website}/sports/${sport}/roster`];
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(3000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 500 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Hård per-job timeout. `fetch`/`res.text()` kan INTERMITTENT hænge trods
 * AbortSignal.timeout (set live: en fastlåst worker → hele parallelMap resolver
 * aldrig, ELLER loopet tømmes fordi AbortSignal-timeren er unref'd og Node exit'er 0
 * midt i scrapet). Denne wrapper garanterer at hvert job ALTID settler via en ref'd
 * setTimeout — så parallelMap altid resolver og processen hverken hænger eller exit'er
 * for tidligt. p'ets eget resultat vinder hvis det når frem først.
 */
function withHardTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      () => { clearTimeout(t); resolve(fallback); },
    );
  });
}

async function parallelMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function getKnownUrls(db: D1Client): Promise<Map<string, string>> {
  const result = await db.query<{ school_id: number; sport: string; roster_url: string }>(
    `SELECT school_id, sport, roster_url FROM roster_checks
     WHERE roster_url IS NOT NULL AND status IN ('success', 'empty')`,
  );
  const map = new Map<string, string>();
  for (const row of result.results) map.set(`${row.school_id}:${row.sport}`, row.roster_url);
  return map;
}

async function getFailedUrls(db: D1Client): Promise<Set<string>> {
  const result = await db.query<{ url: string }>(
    "SELECT DISTINCT url FROM url_probes WHERE result != 'ok'",
  );
  return new Set(result.results.map((r) => r.url));
}

/** Gør en rå bio-href absolut mod skolens website. null hvis uparsbar. */
function resolveBioUrl(href: string | null, website: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, website).href;
  } catch {
    return null;
  }
}

export interface CatalogueSummary {
  byLanguage: Record<string, number>;
  byRegion: Record<string, number>;
  byCountry: Record<string, number>;
  bySport: Record<string, number>;
}

/** Aggregér katalogiserede atleter til beslutnings-views (ren funktion — testet). */
export function summarize(athletes: CatalogueAthlete[]): CatalogueSummary {
  const byLanguage: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const bySport: Record<string, number> = {};
  for (const a of athletes) {
    byLanguage[a.language] = (byLanguage[a.language] ?? 0) + 1;
    byRegion[a.region] = (byRegion[a.region] ?? 0) + 1;
    byCountry[a.homeCountry] = (byCountry[a.homeCountry] ?? 0) + 1;
    if (a.sport) bySport[a.sport] = (bySport[a.sport] ?? 0) + 1;
  }
  return { byLanguage, byRegion, byCountry, bySport };
}

/** D1 tillader HØJST 100 bundne SQL-variabler pr. query (strengere end SQLites 999). */
export const D1_MAX_VARS = 100;
/** Antal kolonner pr. upsert-række (skal matche buildUpsert's VALUES-tuple). */
export const UPSERT_COLS = 14;
/** Max rækker pr. upsert-statement så vi holder os under D1's var-grænse. 7×14=98. */
export const MAX_UPSERT_ROWS = Math.floor(D1_MAX_VARS / UPSERT_COLS);

/** Byg en multi-række upsert. UPSERT_COLS params/række → chunk ≤ MAX_UPSERT_ROWS (D1 100-var-grænse). */
export function buildUpsert(rows: CatalogueAthlete[], nowIso: string): { sql: string; params: unknown[] } {
  const cols =
    "(name, name_key, home_country, language, region, hometown, school, school_id, division, sport, position, bio_url, roster_url, last_seen)";
  const placeholders = rows.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").join(", ");
  const params: unknown[] = [];
  for (const r of rows) {
    params.push(
      r.name, r.nameKey, r.homeCountry, r.language, r.region, r.hometown,
      r.school, r.schoolId, r.division, r.sport, r.position, r.bioUrl, r.rosterUrl, nowIso,
    );
  }
  const sql =
    `INSERT INTO international_athletes ${cols} VALUES ${placeholders}\n` +
    `ON CONFLICT(name_key, school, sport) DO UPDATE SET\n` +
    `  last_seen = excluded.last_seen,\n` +
    `  home_country = excluded.home_country,\n` +
    `  language = excluded.language,\n` +
    `  region = excluded.region,\n` +
    `  hometown = COALESCE(excluded.hometown, international_athletes.hometown),\n` +
    `  position = COALESCE(excluded.position, international_athletes.position),\n` +
    `  bio_url = COALESCE(excluded.bio_url, international_athletes.bio_url),\n` +
    `  division = excluded.division,\n` +
    `  active = 1`;
  return { sql, params };
}

function parseArgs() {
  const args = process.argv.slice(2);
  let schoolOffset = 0;
  let schoolLimit = 0; // 0 = alle
  let concurrency = 10;
  let dryRun = false;
  let includeCanada = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--school-offset" && args[i + 1]) { schoolOffset = parseInt(args[++i], 10) || 0; }
    else if (args[i] === "--school-limit" && args[i + 1]) { schoolLimit = parseInt(args[++i], 10) || 0; }
    else if (args[i] === "--concurrency" && args[i + 1]) { concurrency = parseInt(args[++i], 10) || 10; }
    else if (args[i] === "--dry-run") { dryRun = true; }
    else if (args[i] === "--include-canada") { includeCanada = true; }
  }
  return { schoolOffset, schoolLimit, concurrency, dryRun, includeCanada };
}

async function main(): Promise<void> {
  const { schoolOffset, schoolLimit, concurrency, dryRun, includeCanada } = parseArgs();
  const db = createD1Client();
  const startTime = Date.now();

  console.log("=== EKSPANSIONS-KATALOG: internationale NCAA-atleter ===");
  console.log(`Startet: ${new Date().toISOString()} · concurrency ${concurrency}${dryRun ? " · DRY-RUN" : ""}`);

  // DETERMINISTISK skole-slice (ORDER BY id) så en ekstern runner kan dække alle
  // skoler i små, pålidelige bidder (den lange enkelt-proces-kørsel exit'er
  // intermittent 0 midt i en fetch — små slices + retry konvergerer). SQLite kræver
  // LIMIT før OFFSET; OFFSET uden grænse → LIMIT -1.
  const limitClause = schoolLimit > 0 ? `LIMIT ${schoolLimit}` : schoolOffset > 0 ? "LIMIT -1" : "";
  const offsetClause = schoolOffset > 0 ? `OFFSET ${schoolOffset}` : "";
  const schoolsRes = await db.query<SchoolRow>(
    `SELECT id, name, division, website, platform_type
     FROM schools WHERE website IS NOT NULL
     ORDER BY id ${limitClause} ${offsetClause}`,
  );
  const schools = schoolsRes.results;
  console.log(`Skoler: ${schools.length} (offset ${schoolOffset}${schoolLimit > 0 ? `, limit ${schoolLimit}` : ""})`);
  if (schools.length === 0) {
    console.log("Ingen skoler i dette slice.\nFærdig: " + new Date().toISOString());
    return;
  }

  const knownUrls = await getKnownUrls(db);
  const failedUrls = await getFailedUrls(db);
  console.log(`  ${knownUrls.size} kendte roster-URLs, ${failedUrls.size} kendte fejl-URLs`);

  interface Job { school: SchoolRow; sport: string; url: string }
  const jobs: Job[] = [];
  for (const school of schools) {
    for (const sport of ALL_SPORTS) {
      const known = knownUrls.get(`${school.id}:${sport}`);
      if (known) { jobs.push({ school, sport, url: known }); continue; }
      const candidates = getRosterUrls(school.website, sport, school.platform_type)
        .filter((u) => !failedUrls.has(u));
      if (candidates.length > 0) jobs.push({ school, sport, url: candidates[0] });
    }
  }
  console.log(`Jobs: ${jobs.length} · est. ~${Math.round(jobs.length / concurrency * 0.5 / 60)} min\n`);

  // Scrape-funktion pr. job (uændret logik; batching + løbende upsert nedenfor).
  let completed = 0;
  const scrapeJob = async (job: Job): Promise<CatalogueAthlete[]> => {
    const html = await withHardTimeout(fetchPage(job.url), 8000, null as string | null);
    completed++;
    if (!html) return [];
    try {
      const roster = parseRoster(html);
      const out: CatalogueAthlete[] = [];
      for (const entry of roster) {
        if (!entry.name) continue;
        const { country, isDomestic, isCanadian } = classifyHometown(entry.hometown);
        if (isDomestic || country === "Unknown") continue;      // skip USA + uklassificerbare
        if (isCanadian && !includeCanada) continue;              // Canada deprioriteret (gap-test)
        const { language, region } = marketFor(country);
        out.push({
          name: entry.name,
          nameKey: normalizeNameKey(entry.name),
          homeCountry: country,
          language,
          region,
          hometown: entry.hometown,
          school: job.school.name,
          schoolId: job.school.id,
          division: job.school.division,
          sport: job.sport,
          position: entry.position,
          bioUrl: resolveBioUrl(entry.bioUrl, job.school.website),
          rosterUrl: job.url,
        });
      }
      return out;
    } catch {
      return [];
    }
  };

  // Kør jobs i batches og upsert LØBENDE. Tidligere blev alt samlet og skrevet til
  // sidst — en lang kørsel der blev afbrudt nær slutningen tabte ALT (set live:
  // process exit 0 ved ~99% uden at nå slut-upsert). Nu persisterer hver batch, så
  // afbrydelse koster højst én batch. Dedup på tværs af batches via `seen`; DB'ens
  // ON CONFLICT er backstop. Vi deaktiverer ALDRIG usete atleter (kataloget akkumulerer).
  const nowIso = new Date().toISOString().replace("T", " ").slice(0, 19);
  const seen = new Set<string>();
  const athletes: CatalogueAthlete[] = [];
  let written = 0;
  const BATCH = 800;

  for (let start = 0; start < jobs.length; start += BATCH) {
    const batch = jobs.slice(start, start + BATCH);
    const perJob = await parallelMap<Job, CatalogueAthlete[]>(batch, concurrency, scrapeJob);

    const fresh: CatalogueAthlete[] = [];
    for (const list of perJob) {
      for (const a of list) {
        const key = `${a.nameKey}|${a.school}|${a.sport}`;
        if (seen.has(key)) continue;
        seen.add(key);
        athletes.push(a);
        fresh.push(a);
      }
    }

    if (!dryRun) {
      for (let i = 0; i < fresh.length; i += MAX_UPSERT_ROWS) {
        const chunk = fresh.slice(i, i + MAX_UPSERT_ROWS);
        const { sql, params } = buildUpsert(chunk, nowIso);
        await db.execute(sql, params);
        written += chunk.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log(
      `  ${completed}/${jobs.length} jobs · ${athletes.length} atleter · ${written} skrevet (${elapsed} min)`,
    );
  }

  const summary = summarize(athletes);
  console.log(
    `\n=== ${athletes.length} internationale atleter · ${dryRun ? "0 (dry-run)" : written} skrevet til D1 ===`,
  );

  const top = (rec: Record<string, number>, n: number) =>
    Object.entries(rec).sort(([, a], [, b]) => b - a).slice(0, n);

  console.log("\nPr. sprog (redaktionel enhed):");
  for (const [lang, c] of top(summary.byLanguage, 20)) console.log(`  ${lang.padEnd(16)} ${c}`);
  console.log("\nPr. region (pool-markedsenhed):");
  for (const [reg, c] of top(summary.byRegion, 25)) console.log(`  ${reg.padEnd(24)} ${c}`);
  console.log("\nPr. land (graduerings-input, top 40):");
  for (const [country, c] of top(summary.byCountry, 40)) console.log(`  ${country.padEnd(24)} ${c}`);
  console.log("\nPr. sportsgren (hvor frivillige findes):");
  for (const [sport, c] of top(summary.bySport, 20)) console.log(`  ${sport.padEnd(24)} ${c}`);

  // Skriv snapshot til record (git-ignoreret data — kun til reference)
  try {
    const outDir = path.join(__dirname, "snapshots");
    fs.mkdirSync(outDir, { recursive: true });
    const dateStr = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(
      path.join(outDir, `catalogue-summary-${dateStr}.json`),
      JSON.stringify({ generated_at: new Date().toISOString(), total: athletes.length, ...summary }, null, 2),
    );
  } catch (err) {
    console.warn("  Kunne ikke skrive snapshot:", err);
  }

  console.log(`Færdig: ${new Date().toISOString()}`);
}

// Kør kun når filen eksekveres direkte (så testen kan importere summarize/buildUpsert).
if (process.argv[1] && process.argv[1].endsWith("catalogue-international.ts")) {
  main().catch((err) => {
    console.error("Katalog fejlede:", err);
    process.exit(1);
  });
}
