/**
 * Tests for sæsongrænsen på artikel-badgen.
 * Kør: npx tsx src/lib/_season-badge-test.ts
 *
 * Regressionen: `getSeason` returnerede `${year-1}–${year}` uanset måned, så
 * et kampreferat fra 20. august 2026 fik badgen «2025–26» — sæsonen FØR den
 * kamp artiklen handlede om. Hele efterårssæsonen lå i det forkerte år.
 */

import { getSeason } from "../components/templates/SeasonUpdateTemplate";

let passed = 0;
let failed = 0;

function eq(actual: string, expected: string, msg: string): void {
  if (actual === expected) { passed++; }
  else { failed++; console.error(`  ✗ ${msg} (fik "${actual}", ville have "${expected}")`); }
}

// ── Efteråret hører til den sæson der lige er begyndt ──────────────────
eq(getSeason("2026-08-20"), "2026–27", "20. august 2026 = sæson 2026-27 (den der væltede)");
eq(getSeason("2026-08-01"), "2026–27", "1. august er første dag i sæsonen");
eq(getSeason("2026-09-15"), "2026–27", "september");
eq(getSeason("2026-12-31"), "2026–27", "nytårsaften hører til sæsonen der begyndte i august");

// ── Foråret hører til den sæson der begyndte året før ──────────────────
eq(getSeason("2027-01-01"), "2026–27", "nytårsdag er stadig samme sæson");
eq(getSeason("2027-03-10"), "2026–27", "marts");
eq(getSeason("2027-07-31"), "2026–27", "31. juli er sidste dag i sæsonen");
eq(getSeason("2027-08-01"), "2027–28", "1. august ruller over");

// ── Rammer ─────────────────────────────────────────────────────────────
eq(getSeason(null), "", "ingen dato = intet badge");
eq(getSeason(""), "", "tom dato = intet badge");
eq(getSeason("ikke en dato"), "", "ugyldig dato kaster ikke");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
