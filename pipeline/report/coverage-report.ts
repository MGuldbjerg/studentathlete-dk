/**
 * Genererer en dækningsrapport for hele pipelinen.
 * Viser status for skoler, roster-checks, atleter og kilder.
 *
 * Kør med: npx tsx pipeline/report/coverage-report.ts
 */

import { createD1Client } from "../lib/d1-client";

interface CountResult {
  count: number;
}

interface GroupCount {
  group_key: string;
  count: number;
}

async function main(): Promise<void> {
  const db = createD1Client();

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       StudentAthlete.dk — Dækningsrapport     ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // === SKOLER ===
  console.log("── Skoler ──────────────────────────────────────");

  const totalSchools = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM schools",
  );
  const schoolsWithUrl = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM schools WHERE website IS NOT NULL",
  );
  const schoolsByDivision = await db.query<GroupCount>(
    "SELECT division as group_key, COUNT(*) as count FROM schools GROUP BY division ORDER BY count DESC",
  );
  const schoolsByPlatform = await db.query<GroupCount>(
    `SELECT COALESCE(platform_type, 'ukendt') as group_key, COUNT(*) as count
     FROM schools WHERE website IS NOT NULL GROUP BY platform_type ORDER BY count DESC`,
  );

  console.log(`  Total: ${totalSchools.results[0].count}`);
  console.log(`  Med website: ${schoolsWithUrl.results[0].count}`);
  console.log(`  Uden website: ${totalSchools.results[0].count - schoolsWithUrl.results[0].count}`);
  console.log("\n  Per division:");
  for (const row of schoolsByDivision.results) {
    console.log(`    ${row.group_key}: ${row.count}`);
  }
  if (schoolsByPlatform.results.length > 0) {
    console.log("\n  Platforme:");
    for (const row of schoolsByPlatform.results) {
      console.log(`    ${row.group_key}: ${row.count}`);
    }
  }

  // === ROSTER-CHECKS ===
  console.log("\n── Roster-checks ───────────────────────────────");

  const totalChecks = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM roster_checks",
  );
  const checksByStatus = await db.query<GroupCount>(
    "SELECT status as group_key, COUNT(*) as count FROM roster_checks GROUP BY status ORDER BY count DESC",
  );
  const neverChecked = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM roster_checks WHERE checked_at IS NULL",
  );

  console.log(`  Total: ${totalChecks.results[0].count}`);
  console.log(`  Aldrig tjekket: ${neverChecked.results[0].count}`);
  console.log("\n  Per status:");
  for (const row of checksByStatus.results) {
    console.log(`    ${row.group_key}: ${row.count}`);
  }

  // === ATLETER ===
  console.log("\n── Atleter ─────────────────────────────────────");

  const totalAthletes = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM athletes",
  );
  const activeAthletes = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM athletes WHERE active = 1",
  );
  const athletesByDivision = await db.query<GroupCount>(
    "SELECT division as group_key, COUNT(*) as count FROM athletes GROUP BY division ORDER BY count DESC",
  );
  const athletesBySport = await db.query<GroupCount>(
    "SELECT sport as group_key, COUNT(*) as count FROM athletes GROUP BY sport ORDER BY count DESC",
  );

  console.log(`  Total: ${totalAthletes.results[0].count}`);
  console.log(`  Aktive: ${activeAthletes.results[0].count}`);
  console.log(`  Alumni: ${totalAthletes.results[0].count - activeAthletes.results[0].count}`);
  console.log("\n  Per division:");
  for (const row of athletesByDivision.results) {
    console.log(`    ${row.group_key}: ${row.count}`);
  }
  console.log("\n  Per sport:");
  for (const row of athletesBySport.results) {
    console.log(`    ${row.group_key}: ${row.count}`);
  }

  // === KILDER & HISTORIER ===
  console.log("\n── Overvågning ─────────────────────────────────");

  const totalSources = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM sources WHERE active = 1",
  );
  const sourcesByType = await db.query<GroupCount>(
    "SELECT source_type as group_key, COUNT(*) as count FROM sources WHERE active = 1 GROUP BY source_type ORDER BY count DESC",
  );
  const totalStories = await db.query<CountResult>(
    "SELECT COUNT(*) as count FROM stories",
  );
  const storiesByStatus = await db.query<GroupCount>(
    "SELECT status as group_key, COUNT(*) as count FROM stories GROUP BY status ORDER BY count DESC",
  );

  console.log(`  Aktive kilder: ${totalSources.results[0].count}`);
  for (const row of sourcesByType.results) {
    console.log(`    ${row.group_key}: ${row.count}`);
  }
  console.log(`\n  Historier: ${totalStories.results[0].count}`);
  for (const row of storiesByStatus.results) {
    console.log(`    ${row.group_key}: ${row.count}`);
  }

  // === PIPELINE-KØRSLER ===
  console.log("\n── Seneste pipeline-kørsler ─────────────────────");

  const recentRuns = await db.query<{
    run_type: string;
    started_at: string;
    status: string;
    items_processed: number;
    items_found: number;
  }>(
    `SELECT run_type, started_at, status, items_processed, items_found
     FROM pipeline_runs ORDER BY id DESC LIMIT 10`,
  );

  if (recentRuns.results.length === 0) {
    console.log("  Ingen kørsler registreret.");
  } else {
    for (const run of recentRuns.results) {
      console.log(
        `  ${run.started_at} | ${run.run_type} | ${run.status} | ${run.items_processed} behandlet, ${run.items_found} fundet`,
      );
    }
  }

  // === DÆKNINGSHUL ===
  console.log("\n── Dækningshul ─────────────────────────────────");

  const schoolsNeverScraped = await db.query<CountResult>(
    `SELECT COUNT(DISTINCT s.id) as count
     FROM schools s
     LEFT JOIN roster_checks rc ON rc.school_id = s.id AND rc.checked_at IS NOT NULL
     WHERE s.website IS NOT NULL AND rc.id IS NULL`,
  );
  const failedSchools = await db.query<CountResult>(
    `SELECT COUNT(DISTINCT school_id) as count
     FROM roster_checks WHERE status = 'error'`,
  );
  const jsRequiredSchools = await db.query<CountResult>(
    `SELECT COUNT(DISTINCT school_id) as count
     FROM roster_checks WHERE status = 'js_required'`,
  );

  console.log(`  Skoler aldrig scannet: ${schoolsNeverScraped.results[0].count}`);
  console.log(`  Skoler med fejl: ${failedSchools.results[0].count}`);
  console.log(`  Skoler der kræver JS: ${jsRequiredSchools.results[0].count}`);
  console.log("");
}

main().catch((err) => {
  console.error("Rapport fejlede:", err);
  process.exit(1);
});
