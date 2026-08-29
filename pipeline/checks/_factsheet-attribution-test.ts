/**
 * Tests for mis-tilskrevne kendsgerninger i faktaarket.
 * Kør: npx tsx pipeline/checks/_factsheet-attribution-test.ts
 */
import { classYearConflict } from "./factsheet-attribution";

let passed = 0, failed = 0;
function eq<T>(a: T, b: T, msg: string): void {
  if (JSON.stringify(a) === JSON.stringify(b)) passed++;
  else { failed++; console.error(`  ✗ ${msg} (fik ${JSON.stringify(a)}, ville have ${JSON.stringify(b)})`); }
}

// ── Sagen der udløste kontrollen ───────────────────────────────────────
// Moercks faktaark bar Bartells «Fifth-year student»; rosteren siger Sr.
eq(classYearConflict("Fifth-year student", "Sr."), { claimed: "fifth-year", roster: "Sr." },
   "fifth-year om en Sr. er en konflikt");

// ── Ingen konflikt når ordet passer ────────────────────────────────────
eq(classYearConflict("Fifth-year student", "Gr."), null, "fifth-year passer på Gr.");
eq(classYearConflict("Fifth-year student", "R-Sr."), null, "og på R-Sr.");
eq(classYearConflict("The senior midfielder scored", "Sr."), null, "senior om en Sr.");
eq(classYearConflict("junior forward", "Jr."), null, "junior om en Jr.");
eq(classYearConflict("junior forward", "R-Jr."), null, "redshirt junior tæller som junior");
eq(classYearConflict("sophomore keeper", "So."), null, "sophomore om en So.");
eq(classYearConflict("freshman debut", "Fr."), null, "freshman om en Fr.");
eq(classYearConflict("first-year student", "Fy."), null, "first-year dækker Fy.");

// ── Konflikter ─────────────────────────────────────────────────────────
eq(classYearConflict("The senior midfielder", "Fr."), { claimed: "senior", roster: "Fr." },
   "senior om en Fr.");
eq(classYearConflict("sophomore forward", "Sr."), { claimed: "sophomore", roster: "Sr." },
   "sophomore om en Sr.");

// ── Ved vi det ikke, siger vi ingenting ────────────────────────────────
eq(classYearConflict("Fifth-year student", null), null, "ingen årgang i rosteren → intet flag");
eq(classYearConflict("Fifth-year student", ""), null, "tom årgang → intet flag");
eq(classYearConflict(null, "Sr."), null, "intet faktaark → intet flag");
eq(classYearConflict("Scored a penalty in the 39th minute", "Sr."), null,
   "faktaark uden årgangsord → intet flag");

// Mest specifikke ord vinder: «fifth-year» må ikke læses som «senior».
eq(classYearConflict("Fifth-year senior", "Gr."), null,
   "fifth-year tjekkes før senior og passer på Gr.");

// ── ⚠️ Ordet er ikke altid en påstand om atleten ──────────────────────
// To af de tre første fund i produktion var falske. Uden disse er
// kontrollen støj.
eq(classYearConflict("Big South Freshman of the Year in 2022", "Jr."), null,
   "«Freshman of the Year» er en pris, ikke en årgang");
eq(classYearConflict("Big South All-Freshman Team", "Jr."), null, "All-Freshman er en pris");
eq(classYearConflict("To be eligible, an individual must be a sophomore, junior or senior", "Jr."), null,
   "berettigelsesregel opremser årgange — den påstår intet om atleten");
eq(classYearConflict("scored on Senior Night", "Fr."), null, "Senior Night er en begivenhed");
eq(classYearConflict("named to the Senior CLASS Award watch list", "Jr."), null, "prisnavn");

// Men en bar påstand står stadig.
eq(classYearConflict("Senior", "Jr."), { claimed: "senior", roster: "Jr." },
   "«Senior» alene i faktaarket er en påstand — sagen der udløste kontrollen (#2774)");
eq(classYearConflict("The senior defender marshalled the back line", "Jr."),
   { claimed: "senior", roster: "Jr." }, "påstand i prosa tæller");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
