/**
 * Tests for holdnavnet.
 * Kør: npx tsx src/lib/_school-team-name-test.ts
 */
import { parseNickname, teamName } from "./school-team-name";

let passed = 0, failed = 0;
function eq<T>(a: T, b: T, msg: string): void {
  if (a === b) passed++; else { failed++; console.error(`  ✗ ${msg} (fik ${JSON.stringify(a)}, ville have ${JSON.stringify(b)})`); }
}

// ── Ét navn til begge køn ──────────────────────────────────────────────
eq(teamName("Iona", "Gaels", "m"), "Iona Gaels", "Iona Gaels");
eq(teamName("Iona", "Gaels", "f"), "Iona Gaels", "samme navn for damer");
eq(teamName("Iona", "Gaels", null), "Iona Gaels", "ukønnet navn kræver ikke køn");
eq(teamName("Ohio State", "Buckeyes", "m"), "Ohio State Buckeyes", "Ohio State Buckeyes");
eq(teamName("Miami (Florida)", "Hurricanes", "f"), "Miami (Florida) Hurricanes", "Hurricanes");
eq(teamName("St. Bonaventure", "Bonnies", "m"), "St. Bonaventure Bonnies", "Bonnies");

// ── Delte navne i ét felt: herrer først ────────────────────────────────
eq(teamName("Claremont-Mudd-Scripps", "Stags and Athenas", "m"), "Claremont-Mudd-Scripps Stags", "Stags");
eq(teamName("Claremont-Mudd-Scripps", "Stags and Athenas", "f"), "Claremont-Mudd-Scripps Athenas", "Athenas");
eq(teamName("Delta State", "Statesmen & Lady Statesmen", "f"), "Delta State Lady Statesmen", "Lady Statesmen");
eq(teamName("Oberlin", "Yeomen and Yeowomen", "f"), "Oberlin Yeowomen", "Yeowomen");
eq(teamName("California Lutheran", "Kingsmen and Regals", "f"), "California Lutheran Regals", "Regals");

// ── Kun herrenavnet i basen — damerne hedder noget andet ───────────────
eq(teamName("UMass", "Minutemen", "m"), "UMass Minutemen", "Minutemen");
eq(teamName("UMass", "Minutemen", "f"), "UMass Minutewomen", "Minutewomen — IKKE Minutemen");
eq(teamName("Washington", "Shoremen", "f"), "Washington Shorewomen", "Shorewomen");

// ── ⚠️ Kønnet navn + ukendt køn → intet holdnavn ──────────────────────
// At skrive «Minutemen» om en kvinde er en påstand om et navngivent menneske.
eq(teamName("UMass", "Minutemen", null), "", "ukendt køn + kønnet navn → tomt");
eq(teamName("Claremont-Mudd-Scripps", "Stags and Athenas", ""), "", "tomt køn → tomt");
eq(teamName("Delta State", "Statesmen & Lady Statesmen", "x"), "", "ukendt kønskode → tomt");

// ── Manglende data ─────────────────────────────────────────────────────
eq(teamName("Iona", null, "m"), "", "intet nickname → tomt");
eq(teamName("Iona", "", "m"), "", "tomt nickname → tomt");
eq(teamName("", "Gaels", "m"), "", "intet skolenavn → tomt");

// ── parseNickname ──────────────────────────────────────────────────────
eq(parseNickname("Gaels")?.gendered, false, "Gaels er ikke kønnet");
eq(parseNickname("Stags and Athenas")?.gendered, true, "delt navn er kønnet");
eq(parseNickname("Minutemen")?.gendered, true, "Minutemen er kønnet via tabellen");
eq(parseNickname("Flying Dutchmen")?.gendered, false, "Lebanon Valley bruger ét navn til begge");
eq(parseNickname("Penmen")?.gendered, false, "SNHU bruger ét navn til begge");
eq(parseNickname(null), null, "null → null");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
