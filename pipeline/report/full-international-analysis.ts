/**
 * Komplet international atlet-analyse — ALLE skoler, ALLE sportsgrene.
 * Proportionel per-division skalering for retvisende billede.
 *
 * Optimeringer vs. den hurtige analyse:
 *   - Genbruger kendte URLs fra url_probes (skipper kendte fejl-URLs)
 *   - Genbruger roster_checks.roster_url hvor den allerede er fundet
 *   - Parallelle fetches (concurrency=10)
 *   - 3s timeout (ikke 8s) — langsom side = skip
 *   - Estimeret køretid: ~20-40 min for alle skoler
 *
 * Kør med:
 *   CLOUDFLARE_ACCOUNT_ID="..." CLOUDFLARE_D1_DATABASE_ID="..." \
 *   npx tsx pipeline/report/full-international-analysis.ts [--limit-per-div 0] [--concurrency 10]
 */

import { createD1Client } from "../lib/d1-client";
import type { D1Client } from "../lib/d1-client";
import { parseRoster } from "../scrape/parsers";
import { classifyHometown } from "./country-normalize";
import { writeExcelReport } from "./write-excel";
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

interface KnownUrl {
  school_id: number;
  sport: string;
  roster_url: string;
}

interface SportStat { total: number; international: number }

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
  // Kun standard-URL — mens/womens varianter er sjældent nødvendige og koster 2 ekstra requests
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

/** Kør op til N tasks parallelt */
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

/**
 * Opslags-sættene hentes for DE SKOLER kørslen faktisk rører — ikke som hele
 * tabeller. Med `--limit-per-div` er det en brøkdel af basen, og begge tabeller
 * har indeks på `school_id`. Samme rettelse som i catalogue-international.ts,
 * hvor de to fulde scanninger stod for 60 % af D1-frikvoten (2026-09-03).
 *
 * D1 tillader højst 100 bundne variabler pr. forespørgsel — derfor chunkes id'erne.
 */
const ID_CHUNK = 90;

function chunkIds(ids: number[], size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** Hent kendte fungerende roster-URLs fra roster_checks */
async function getKnownUrls(db: D1Client, schoolIds: number[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const ids of chunkIds(schoolIds, ID_CHUNK)) {
    const result = await db.query<KnownUrl>(
      `SELECT school_id, sport, roster_url FROM roster_checks
     WHERE school_id IN (${ids.map(() => "?").join(",")})
       AND roster_url IS NOT NULL AND status IN ('success', 'empty')`,
      ids,
    );
    for (const row of result.results) {
      map.set(`${row.school_id}:${row.sport}`, row.roster_url);
    }
  }
  return map;
}

/**
 * Kendte fejl-URLs for NETOP disse skoler. Kandidat-URLs bygges ud fra skolens
 * eget `website`, så en fejl logget under en anden skole kan alligevel ikke
 * matche — undtagen hvis to skolerækker deler website, og da koster det kun et
 * gen-forsøg, ikke et forkert resultat.
 */
async function getFailedUrls(db: D1Client, schoolIds: number[]): Promise<Set<string>> {
  const set = new Set<string>();
  for (const ids of chunkIds(schoolIds, ID_CHUNK)) {
    const result = await db.query<{ url: string }>(
      `SELECT DISTINCT url FROM url_probes
     WHERE school_id IN (${ids.map(() => "?").join(",")}) AND result != 'ok'`,
      ids,
    );
    for (const r of result.results) set.add(r.url);
  }
  return set;
}

function parseArgs(): { limitPerDiv: number; concurrency: number } {
  const args = process.argv.slice(2);
  let limitPerDiv = 0;
  let concurrency = 10;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit-per-div" && args[i + 1]) {
      limitPerDiv = parseInt(args[i + 1], 10) || 0;
      i++;
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10) || 10;
      i++;
    }
  }
  return { limitPerDiv, concurrency };
}

interface ScrapeJob {
  school: SchoolRow;
  sport: string;
  url: string;
}

interface ScrapeResult {
  division: string;
  sport: string;
  athletes: Array<{ country: string; isDomestic: boolean }>;
  success: boolean;
}

async function main(): Promise<void> {
  const { limitPerDiv, concurrency } = parseArgs();
  const db = createD1Client();
  const startTime = Date.now();

  console.log("=== KOMPLET INTERNATIONAL STUDENT ATHLETE ANALYSE ===");
  console.log(`Startet: ${new Date().toISOString()}`);
  console.log(`Concurrency: ${concurrency}`);
  if (limitPerDiv > 0) console.log(`Limit per division: ${limitPerDiv}`);

  // Hent skoler per division
  const divisions = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA"];
  const schoolsByDiv: Record<string, SchoolRow[]> = {};
  const totalByDiv: Record<string, number> = {};

  for (const div of divisions) {
    const limitClause = limitPerDiv > 0 ? `LIMIT ${limitPerDiv}` : "";
    const result = await db.query<SchoolRow>(
      `SELECT id, name, division, website, platform_type
       FROM schools WHERE website IS NOT NULL AND division = ?
       ORDER BY RANDOM() ${limitClause}`,
      [div],
    );
    schoolsByDiv[div] = result.results;

    const countResult = await db.query<{ c: number }>(
      "SELECT COUNT(*) as c FROM schools WHERE website IS NOT NULL AND division = ?",
      [div],
    );
    totalByDiv[div] = countResult.results[0]?.c ?? 0;
    console.log(`  ${div}: ${result.results.length} skoler (af ${totalByDiv[div]})`);
  }

  // Hent cache fra DB
  console.log("\nHenter kendte URLs fra database...");
  const schoolIds = divisions.flatMap((div) => schoolsByDiv[div].map((s) => s.id));
  const knownUrls = await getKnownUrls(db, schoolIds);
  const failedUrls = await getFailedUrls(db, schoolIds);
  console.log(`  ${knownUrls.size} kendte roster-URLs, ${failedUrls.size} kendte fejl-URLs`);

  // Byg job-liste: skole × sport → URL
  const jobs: ScrapeJob[] = [];
  let skippedByCache = 0;

  for (const div of divisions) {
    for (const school of schoolsByDiv[div]) {
      for (const sport of ALL_SPORTS) {
        // Tjek om vi allerede kender URL'en
        const known = knownUrls.get(`${school.id}:${sport}`);
        if (known) {
          jobs.push({ school, sport, url: known });
          continue;
        }

        // Generér kandidat-URLs og filtrer kendte fejl
        const candidates = getRosterUrls(school.website, sport, school.platform_type)
          .filter((u) => !failedUrls.has(u));

        if (candidates.length === 0) {
          skippedByCache++;
          continue;
        }

        // Tag kun første kandidat (hurtigst)
        jobs.push({ school, sport, url: candidates[0] });
      }
    }
  }

  console.log(`\nJobs: ${jobs.length} (${skippedByCache} sprunget over pga. kendte fejl)`);
  console.log(`Estimeret tid: ~${Math.round(jobs.length / concurrency * 0.5 / 60)} minutter\n`);

  // Kør alle jobs parallelt
  let completed = 0;
  const results = await parallelMap<ScrapeJob, ScrapeResult>(jobs, concurrency, async (job) => {
    const html = await fetchPage(job.url);
    completed++;

    if (completed % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`  ${completed}/${jobs.length} (${elapsed} min)...`);
    }

    if (!html) {
      return { division: job.school.division, sport: job.sport, athletes: [], success: false };
    }

    try {
      const roster = parseRoster(html);
      const athletes = roster.map((entry) => {
        const { country, isDomestic } = classifyHometown(entry.hometown);
        return { country, isDomestic };
      });
      return { division: job.school.division, sport: job.sport, athletes, success: true };
    } catch {
      return { division: job.school.division, sport: job.sport, athletes: [], success: false };
    }
  });

  // ── Aggregér ──────────────────────────────────────────────────────
  const divCountryStats: Record<string, Record<string, number>> = {};
  const divSportStats: Record<string, Record<string, SportStat>> = {};
  const divTotals: Record<string, { athletes: number; international: number; schoolsWithData: Set<number> }> = {};
  const globalCountryBySport: Record<string, Record<string, number>> = {};

  for (const div of divisions) {
    divCountryStats[div] = {};
    divSportStats[div] = {};
    divTotals[div] = { athletes: 0, international: 0, schoolsWithData: new Set() };
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const job = jobs[i];
    const div = r.division;

    if (!r.success || r.athletes.length === 0) continue;

    divTotals[div].schoolsWithData.add(job.school.id);

    if (!divSportStats[div][r.sport]) divSportStats[div][r.sport] = { total: 0, international: 0 };

    for (const a of r.athletes) {
      divTotals[div].athletes++;
      divSportStats[div][r.sport].total++;

      if (!a.isDomestic && a.country !== "Unknown") {
        divTotals[div].international++;
        divSportStats[div][r.sport].international++;
        divCountryStats[div][a.country] = (divCountryStats[div][a.country] ?? 0) + 1;

        if (!globalCountryBySport[a.country]) globalCountryBySport[a.country] = {};
        globalCountryBySport[a.country][r.sport] = (globalCountryBySport[a.country][r.sport] ?? 0) + 1;
      }
    }
  }

  // ── Resultater ────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log("\n" + "=".repeat(65));
  console.log(`=== RESULTATER (${elapsed} min) ===`);
  console.log("=".repeat(65));

  // Per-division skalering
  let estTotalAll = 0;
  let estIntlAll = 0;
  const estByCountry: Record<string, number> = {};

  console.log("\nPer division:");
  for (const div of divisions) {
    const d = divTotals[div];
    const sampled = schoolsByDiv[div].length;
    const withData = d.schoolsWithData.size;
    const total = totalByDiv[div];
    const scale = withData > 0 ? total / withData : 0;
    const estAthletes = Math.round(d.athletes * scale);
    const estIntl = Math.round(d.international * scale);
    const pct = d.athletes > 0 ? ((d.international / d.athletes) * 100).toFixed(1) : "0";

    estTotalAll += estAthletes;
    estIntlAll += estIntl;

    for (const [country, count] of Object.entries(divCountryStats[div])) {
      estByCountry[country] = (estByCountry[country] ?? 0) + Math.round(count * scale);
    }

    console.log(`  ${div.padEnd(10)} ${String(withData).padStart(4)}/${String(sampled).padStart(4)} skoler med data`);
    console.log(`  ${"".padEnd(10)} ${String(d.athletes).padStart(6)} atleter, ${String(d.international).padStart(5)} intl (${pct}%)`);
    console.log(`  ${"".padEnd(10)} skaleret → ~${estAthletes.toLocaleString()} atleter, ~${estIntl.toLocaleString()} intl`);
  }

  const globalPct = estTotalAll > 0 ? ((estIntlAll / estTotalAll) * 100).toFixed(1) : "0";
  console.log(`\n  SAMLET: ~${estTotalAll.toLocaleString()} atleter, ~${estIntlAll.toLocaleString()} internationale (${globalPct}%)`);

  // Top lande
  const sortedCountries = Object.entries(estByCountry).sort(([, a], [, b]) => b - a);
  console.log("\nTop 30 lande (skaleret):");
  sortedCountries.slice(0, 30).forEach(([country, est], i) => {
    const pct = estIntlAll > 0 ? ((est / estIntlAll) * 100).toFixed(1) : "0";
    console.log(`  ${String(i + 1).padStart(2)}. ${country.padEnd(22)} ~${String(est).padStart(6)} (${pct}%)`);
  });

  // Per sport
  const aggSport: Record<string, SportStat> = {};
  for (const div of divisions) {
    for (const [sport, stat] of Object.entries(divSportStats[div])) {
      if (!aggSport[sport]) aggSport[sport] = { total: 0, international: 0 };
      aggSport[sport].total += stat.total;
      aggSport[sport].international += stat.international;
    }
  }

  console.log("\nPer sport:");
  Object.entries(aggSport)
    .sort(([, a], [, b]) => (b.international / (b.total || 1)) - (a.international / (a.total || 1)))
    .forEach(([sport, stat]) => {
      const pct = stat.total > 0 ? ((stat.international / stat.total) * 100).toFixed(1) : "0";
      console.log(`  ${sport.padEnd(25)} ${String(stat.total).padStart(6)} total, ${String(stat.international).padStart(5)} intl (${pct}%)`);
    });

  // ── Gem rapport ───────────────────────────────────────────────────
  const sampleCountryStats: Record<string, number> = {};
  for (const div of divisions) {
    for (const [country, count] of Object.entries(divCountryStats[div])) {
      sampleCountryStats[country] = (sampleCountryStats[country] ?? 0) + count;
    }
  }
  const sampleTotals = {
    athletes: Object.values(divTotals).reduce((s, d) => s + d.athletes, 0),
    international: Object.values(divTotals).reduce((s, d) => s + d.international, 0),
  };
  const samplePct = sampleTotals.athletes > 0
    ? parseFloat(((sampleTotals.international / sampleTotals.athletes) * 100).toFixed(1)) : 0;

  const sortedSampleCountries = Object.entries(sampleCountryStats).sort(([, a], [, b]) => b - a);

  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      type: "full_proportional",
      sample_size: Object.values(schoolsByDiv).reduce((s, arr) => s + arr.length, 0),
      schools_with_data: Object.values(divTotals).reduce((s, d) => s + d.schoolsWithData.size, 0),
      schools_by_division: {
        D1: schoolsByDiv["NCAA D1"]?.length ?? 0,
        D2: schoolsByDiv["NCAA D2"]?.length ?? 0,
        D3: schoolsByDiv["NCAA D3"]?.length ?? 0,
      },
      total_schools_in_db: Object.values(totalByDiv).reduce((s, n) => s + n, 0),
      scale_factor: 0,
      elapsed_minutes: parseFloat(elapsed),
    },
    totals: {
      athletes: sampleTotals.athletes,
      international: sampleTotals.international,
      international_pct: samplePct,
      estimated_total: estTotalAll,
      estimated_international: estIntlAll,
    },
    by_country: sortedSampleCountries.map(([country, count]) => ({
      country,
      count,
      pct: sampleTotals.international > 0
        ? parseFloat(((count / sampleTotals.international) * 100).toFixed(1)) : 0,
      estimated: estByCountry[country] ?? 0,
      top_sports: Object.entries(globalCountryBySport[country] ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([sport, n]) => ({ sport, count: n })),
    })),
    by_sport: Object.entries(aggSport).map(([sport, stat]) => ({
      sport,
      total: stat.total,
      international: stat.international,
      international_pct: stat.total > 0
        ? parseFloat(((stat.international / stat.total) * 100).toFixed(1)) : 0,
    })),
    by_division: divisions.map((div) => ({
      division: div,
      total: divTotals[div].athletes,
      international: divTotals[div].international,
      international_pct: divTotals[div].athletes > 0
        ? parseFloat(((divTotals[div].international / divTotals[div].athletes) * 100).toFixed(1)) : 0,
      schools_sampled: schoolsByDiv[div].length,
      schools_with_data: divTotals[div].schoolsWithData.size,
      schools_total: totalByDiv[div],
    })),
  };

  const reportDir = path.join(__dirname);
  const dateStr = new Date().toISOString().slice(0, 10);

  const jsonPath = path.join(reportDir, `full-international-report-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\nJSON: ${jsonPath}`);

  const xlsxPath = path.join(reportDir, `full-international-report-${dateStr}.xlsx`);
  await writeExcelReport(report, xlsxPath);
  console.log(`Excel: ${xlsxPath}`);

  console.log(`Færdig: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Analyse fejlede:", err);
  process.exit(1);
});
