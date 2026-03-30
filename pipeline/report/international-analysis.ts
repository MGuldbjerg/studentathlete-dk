/**
 * International atlet-analyse.
 * Scraper roster-sider for ~500 skoler og tæller ALLE internationale atleter.
 *
 * Kør med:
 *   CLOUDFLARE_API_TOKEN="..." \
 *   CLOUDFLARE_ACCOUNT_ID="..." \
 *   CLOUDFLARE_D1_DATABASE_ID="..." \
 *   npx tsx pipeline/report/international-analysis.ts
 */

import { createD1Client } from "../lib/d1-client";
import { parseRoster } from "../scrape/parsers";
import { classifyHometown } from "./country-normalize";
import { writeExcelReport } from "./write-excel";
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

interface SportStat {
  total: number;
  international: number;
}

interface DivisionStat {
  total: number;
  international: number;
}

/** PrestoSports sport-koder */
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
};

const SPORTS_TO_CHECK = [
  "football", "basketball", "baseball", "soccer", "golf",
  "tennis", "swimming-and-diving", "track-and-field", "volleyball",
];

function getRosterUrl(website: string, sport: string, platformType: string | null): string[] {
  if (platformType === "prestosports") {
    const codes = PRESTO_SPORT_CODES[sport] ?? [sport];
    return codes.map((c) => `${website}/roster.aspx?path=${c}`);
  }
  return [
    `${website}/sports/${sport}/roster`,
    `${website}/sports/mens-${sport}/roster`,
    `${website}/sports/womens-${sport}/roster`,
  ];
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const db = createD1Client();

  console.log("=== INTERNATIONAL STUDENT ATHLETE ANALYSE ===");
  console.log(`Startet: ${new Date().toISOString()}\n`);

  // Hent skoler: alle D1 med website + ~130 tilfældige D2/D3
  const d1Result = await db.query<SchoolRow>(
    `SELECT id, name, division, website, platform_type
     FROM schools WHERE website IS NOT NULL AND division = 'NCAA D1'
     ORDER BY name LIMIT 400`,
  );
  const d2Result = await db.query<SchoolRow>(
    `SELECT id, name, division, website, platform_type
     FROM schools WHERE website IS NOT NULL AND division = 'NCAA D2'
     ORDER BY RANDOM() LIMIT 65`,
  );
  const d3Result = await db.query<SchoolRow>(
    `SELECT id, name, division, website, platform_type
     FROM schools WHERE website IS NOT NULL AND division = 'NCAA D3'
     ORDER BY RANDOM() LIMIT 65`,
  );

  const schools = [...d1Result.results, ...d2Result.results, ...d3Result.results];
  const d1Count = d1Result.results.length;
  const d2Count = d2Result.results.length;
  const d3Count = d3Result.results.length;

  console.log(`Sample: ${schools.length} skoler (${d1Count} D1, ${d2Count} D2, ${d3Count} D3)`);

  // Hent totalt antal skoler for skaleringsestimat
  const totalSchoolsResult = await db.query<{ c: number }>(
    "SELECT COUNT(*) as c FROM schools WHERE website IS NOT NULL",
  );
  const totalSchoolsWithWeb = totalSchoolsResult.results[0]?.c ?? 0;

  // Analyse-data
  const countryStats: Record<string, number> = {};
  const sportStats: Record<string, SportStat> = {};
  const divisionStats: Record<string, DivisionStat> = {};
  const countryBySport: Record<string, Record<string, number>> = {};
  let totalAthletes = 0;
  let totalInternational = 0;
  let schoolsProcessed = 0;
  let schoolsWithData = 0;
  let schoolErrors = 0;

  for (const school of schools) {
    schoolsProcessed++;

    if (schoolsProcessed % 50 === 0) {
      console.log(`  Fremgang: ${schoolsProcessed}/${schools.length} skoler (${totalAthletes} atleter, ${totalInternational} internationale)...`);
    }

    // Prøv 2 sportsgrene per skole for hastighed (football + en tilfældig)
    const sportsToCheck = ["football"];
    const otherSport = SPORTS_TO_CHECK[Math.floor(Math.random() * SPORTS_TO_CHECK.length)];
    if (otherSport !== "football") sportsToCheck.push(otherSport);

    let schoolHadData = false;

    for (const sport of sportsToCheck) {
      const urls = getRosterUrl(school.website, sport, school.platform_type);

      let html: string | null = null;
      for (const url of urls) {
        html = await fetchPage(url);
        if (html && html.length > 500) break;
        html = null;
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!html) continue;

      try {
        const roster = parseRoster(html);
        if (roster.length === 0) continue;

        schoolHadData = true;

        // Initialisér sport-stats
        if (!sportStats[sport]) sportStats[sport] = { total: 0, international: 0 };
        if (!divisionStats[school.division]) divisionStats[school.division] = { total: 0, international: 0 };

        for (const entry of roster) {
          totalAthletes++;
          sportStats[sport].total++;
          divisionStats[school.division].total++;

          const { country, isDomestic } = classifyHometown(entry.hometown);

          if (!isDomestic && country !== "Unknown") {
            totalInternational++;
            sportStats[sport].international++;
            divisionStats[school.division].international++;

            countryStats[country] = (countryStats[country] ?? 0) + 1;

            // Land per sport
            if (!countryBySport[country]) countryBySport[country] = {};
            countryBySport[country][sport] = (countryBySport[country][sport] ?? 0) + 1;
          }
        }
      } catch (err) {
        schoolErrors++;
        if (schoolErrors <= 5) {
          console.error(`  Parse-fejl for ${school.name}/${sport}: ${err}`);
        }
      }

      // Rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    if (schoolHadData) schoolsWithData++;
  }

  // ── Resultater ────────────────────────────────────────────────────
  const intlPct = totalAthletes > 0 ? ((totalInternational / totalAthletes) * 100).toFixed(1) : "0";

  console.log("\n" + "=".repeat(60));
  console.log("=== RESULTATER ===");
  console.log("=".repeat(60));
  console.log(`\nSample: ${schoolsProcessed} skoler (${schoolsWithData} med data, ${schoolErrors} fejl)`);
  console.log(`Total atleter fundet: ${totalAthletes.toLocaleString()}`);
  console.log(`Internationale atleter: ${totalInternational.toLocaleString()} (${intlPct}%)`);

  // Top 20 lande
  const sortedCountries = Object.entries(countryStats)
    .sort(([, a], [, b]) => b - a);

  console.log("\nTop 20 lande:");
  sortedCountries.slice(0, 20).forEach(([country, count], i) => {
    const pct = ((count / totalInternational) * 100).toFixed(1);
    console.log(`  ${String(i + 1).padStart(2)}. ${country.padEnd(20)} — ${String(count).padStart(5)} (${pct}%)`);
  });

  // Per sport
  console.log("\nPer sport:");
  Object.entries(sportStats)
    .sort(([, a], [, b]) => (b.international / (b.total || 1)) - (a.international / (a.total || 1)))
    .forEach(([sport, stat]) => {
      const pct = stat.total > 0 ? ((stat.international / stat.total) * 100).toFixed(1) : "0";
      console.log(`  ${sport.padEnd(25)} ${String(stat.total).padStart(6)} total, ${String(stat.international).padStart(5)} intl (${pct}%)`);
    });

  // Per division
  console.log("\nPer division:");
  Object.entries(divisionStats).forEach(([div, stat]) => {
    const pct = stat.total > 0 ? ((stat.international / stat.total) * 100).toFixed(1) : "0";
    console.log(`  ${div.padEnd(15)} ${String(stat.total).padStart(6)} total, ${String(stat.international).padStart(5)} intl (${pct}%)`);
  });

  // Skaleringsestimat
  const scaleFactor = totalSchoolsWithWeb / schoolsWithData;
  const estimatedTotal = Math.round(totalAthletes * scaleFactor);
  const estimatedIntl = Math.round(totalInternational * scaleFactor);

  console.log("\nSkaleringsestimat (hele NCAA):");
  console.log(`  ${totalSchoolsWithWeb} skoler med website × [${scaleFactor.toFixed(1)}x] skalering`);
  console.log(`  Estimeret total: ~${estimatedTotal.toLocaleString()} atleter`);
  console.log(`  Estimeret internationale: ~${estimatedIntl.toLocaleString()} (${intlPct}%)`);

  // Top lande skaleret
  console.log("\n  Estimeret per land (top 10):");
  sortedCountries.slice(0, 10).forEach(([country, count]) => {
    const estimated = Math.round(count * scaleFactor);
    console.log(`    ${country.padEnd(20)} ~${estimated.toLocaleString()}`);
  });

  // ── Gem rapport som JSON ──────────────────────────────────────────
  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      sample_size: schoolsProcessed,
      schools_with_data: schoolsWithData,
      schools_by_division: { D1: d1Count, D2: d2Count, D3: d3Count },
      total_schools_in_db: totalSchoolsWithWeb,
      scale_factor: scaleFactor,
    },
    totals: {
      athletes: totalAthletes,
      international: totalInternational,
      international_pct: parseFloat(intlPct),
      estimated_total: estimatedTotal,
      estimated_international: estimatedIntl,
    },
    by_country: sortedCountries.map(([country, count]) => ({
      country,
      count,
      pct: parseFloat(((count / totalInternational) * 100).toFixed(1)),
      estimated: Math.round(count * scaleFactor),
      top_sports: Object.entries(countryBySport[country] ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([sport, n]) => ({ sport, count: n })),
    })),
    by_sport: Object.entries(sportStats).map(([sport, stat]) => ({
      sport,
      total: stat.total,
      international: stat.international,
      international_pct: stat.total > 0 ? parseFloat(((stat.international / stat.total) * 100).toFixed(1)) : 0,
    })),
    by_division: Object.entries(divisionStats).map(([division, stat]) => ({
      division,
      total: stat.total,
      international: stat.international,
      international_pct: stat.total > 0 ? parseFloat(((stat.international / stat.total) * 100).toFixed(1)) : 0,
    })),
  };

  const reportDir = path.join(__dirname);
  const dateStr = new Date().toISOString().slice(0, 10);
  const jsonPath = path.join(reportDir, `international-report-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\nJSON-rapport gemt: ${jsonPath}`);

  // Excel-rapport
  const xlsxPath = path.join(reportDir, `international-report-${dateStr}.xlsx`);
  await writeExcelReport(report, xlsxPath);
  console.log(`Excel-rapport gemt: ${xlsxPath}`);

  console.log(`Færdig: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Analyse fejlede:", err);
  process.exit(1);
});
