/**
 * Tests for den udregnede ugedag i faktaarket.
 * Kør: npx tsx pipeline/generate/_weekday-test.ts
 *
 * Modellen skrev ugedagen selv og tog fejl 4 ud af 5 gange (kladder 27.-28.
 * august 2026). Nu udregnes den.
 */
import { weekdayOf } from "./build-factsheet";

let passed = 0, failed = 0;
function eq(a: unknown, b: unknown, msg: string): void {
  if (a === b) passed++; else { failed++; console.error(`  ✗ ${msg} (fik ${JSON.stringify(a)}, ville have ${JSON.stringify(b)})`); }
}

// De faktiske datoer fra de afviste kladder.
eq(weekdayOf("2026-08-27"), "Thursday", "27. august 2026 er en torsdag (kladden skrev onsdag)");
eq(weekdayOf("Aug. 27, 2026"), "Thursday", "samme dato på skolernes skrivemåde");
eq(weekdayOf("8/27/2026"), "Thursday", "og på amerikansk format");
eq(weekdayOf("2026-08-28"), "Friday", "28. august er en fredag (kladden skrev torsdag)");
eq(weekdayOf("Aug. 20, 2026"), "Thursday", "Bonnies-kampen var en torsdag");

// ── Kan dagen ikke fastslås, siger vi ingenting ───────────────────────
eq(weekdayOf("July 2026"), null, "måned uden dag → ingen ugedag (ville ellers blive den 1.)");
eq(weekdayOf(""), null, "tom dato");
eq(weekdayOf(null), null, "ingen dato");
eq(weekdayOf("i sidste uge"), null, "uforståelig dato → ingen gætteri");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
