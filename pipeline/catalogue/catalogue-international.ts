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

const USER_AGENT = "StudentAthlete.dk/1.0 (research, contact: info@studentathlete.dk)";

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
}

/** Aggregér katalogiserede atleter til de tre beslutnings-views (ren funktion — testet). */
export function summarize(athletes: CatalogueAthlete[]): CatalogueSummary {
  const byLanguage: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  for (const a of athletes) {
    byLanguage[a.language] = (byLanguage[a.language] ?? 0) + 1;
    byRegion[a.region] = (byRegion[a.region] ?? 0) + 1;
    byCountry[a.homeCountry] = (byCountry[a.homeCountry] ?? 0) + 1;
  }
  return { byLanguage, byRegion, byCountry };
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
  let limitPerDiv = 0;
  let concurrency = 10;
  let dryRun = false;
  let includeCanada = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit-per-div" && args[i + 1]) { limitPerDiv = parseInt(args[++i], 10) || 0; }
    else if (args[i] === "--concurrency" && args[i + 1]) { concurrency = parseInt(args[++i], 10) || 10; }
    else if (args[i] === "--dry-run") { dryRun = true; }
    else if (args[i] === "--include-canada") { includeCanada = true; }
  }
  return { limitPerDiv, concurrency, dryRun, includeCanada };
}

async function main(): Promise<void> {
  const { limitPerDiv, concurrency, dryRun, includeCanada } = parseArgs();
  const db = createD1Client();
  const startTime = Date.now();

  console.log("=== EKSPANSIONS-KATALOG: internationale NCAA-atleter ===");
  console.log(`Startet: ${new Date().toISOString()} · concurrency ${concurrency}${dryRun ? " · DRY-RUN" : ""}`);

  const divisions = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
  const schoolsByDiv: Record<string, SchoolRow[]> = {};
  for (const div of divisions) {
    const limitClause = limitPerDiv > 0 ? `LIMIT ${limitPerDiv}` : "";
    const result = await db.query<SchoolRow>(
      `SELECT id, name, division, website, platform_type
       FROM schools WHERE website IS NOT NULL AND division = ?
       ORDER BY RANDOM() ${limitClause}`,
      [div],
    );
    schoolsByDiv[div] = result.results;
    console.log(`  ${div}: ${result.results.length} skoler`);
  }

  const knownUrls = await getKnownUrls(db);
  const failedUrls = await getFailedUrls(db);
  console.log(`  ${knownUrls.size} kendte roster-URLs, ${failedUrls.size} kendte fejl-URLs`);

  interface Job { school: SchoolRow; sport: string; url: string }
  const jobs: Job[] = [];
  for (const div of divisions) {
    for (const school of schoolsByDiv[div]) {
      for (const sport of ALL_SPORTS) {
        const known = knownUrls.get(`${school.id}:${sport}`);
        if (known) { jobs.push({ school, sport, url: known }); continue; }
        const candidates = getRosterUrls(school.website, sport, school.platform_type)
          .filter((u) => !failedUrls.has(u));
        if (candidates.length > 0) jobs.push({ school, sport, url: candidates[0] });
      }
    }
  }
  console.log(`Jobs: ${jobs.length} · est. ~${Math.round(jobs.length / concurrency * 0.5 / 60)} min\n`);

  let completed = 0;
  const perJob = await parallelMap<Job, CatalogueAthlete[]>(jobs, concurrency, async (job) => {
    const html = await fetchPage(job.url);
    if (++completed % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`  ${completed}/${jobs.length} (${elapsed} min)...`);
    }
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
  });

  // Dedupe på (name_key, school, sport) — samme person kan optræde i flere fetches.
  const seen = new Set<string>();
  const athletes: CatalogueAthlete[] = [];
  for (const list of perJob) {
    for (const a of list) {
      const key = `${a.nameKey}|${a.school}|${a.sport}`;
      if (seen.has(key)) continue;
      seen.add(key);
      athletes.push(a);
    }
  }

  const summary = summarize(athletes);
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n=== ${athletes.length} internationale atleter fundet (${elapsed} min) ===`);

  const top = (rec: Record<string, number>, n: number) =>
    Object.entries(rec).sort(([, a], [, b]) => b - a).slice(0, n);

  console.log("\nPr. sprog (redaktionel enhed):");
  for (const [lang, c] of top(summary.byLanguage, 20)) console.log(`  ${lang.padEnd(16)} ${c}`);
  console.log("\nPr. region (pool-markedsenhed):");
  for (const [reg, c] of top(summary.byRegion, 25)) console.log(`  ${reg.padEnd(24)} ${c}`);
  console.log("\nPr. land (graduerings-input, top 40):");
  for (const [country, c] of top(summary.byCountry, 40)) console.log(`  ${country.padEnd(24)} ${c}`);

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

  if (dryRun) {
    console.log("\nDRY-RUN — ingen DB-skrivning.");
    return;
  }

  // Upsert i chunks. Bemærk: vi DEAKTIVERER ikke usete atleter (en skole der fejlede
  // dette run må ikke pensionere sine atleter) — kataloget akkumulerer bevidst.
  const nowIso = new Date().toISOString().replace("T", " ").slice(0, 19);
  const CHUNK = MAX_UPSERT_ROWS;
  let written = 0;
  for (let i = 0; i < athletes.length; i += CHUNK) {
    const chunk = athletes.slice(i, i + CHUNK);
    const { sql, params } = buildUpsert(chunk, nowIso);
    await db.execute(sql, params);
    written += chunk.length;
    if (written % 600 === 0) console.log(`  upsert ${written}/${athletes.length}...`);
  }
  console.log(`\nUpsert færdig: ${written} rækker (insert eller last_seen-opdatering).`);
  console.log(`Færdig: ${new Date().toISOString()}`);
}

// Kør kun når filen eksekveres direkte (så testen kan importere summarize/buildUpsert).
if (process.argv[1] && process.argv[1].endsWith("catalogue-international.ts")) {
  main().catch((err) => {
    console.error("Katalog fejlede:", err);
    process.exit(1);
  });
}
