/**
 * Unit-tests for positions-ordbogen. Kør: npx tsx src/lib/_positions-test.ts
 */
import { expandPosition, POSITION_TERMS } from "./positions";

let passed = 0;
let failed = 0;

function eq(got: unknown, want: unknown, label: string): void {
  if (got === want) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

// ── Samme bogstav, forskellig sport ──────────────────────────────────────────
// Hele pointen med per-sport-tabeller.
eq(expandPosition("basketball", "C"), "center", "C i basketball = center");
eq(expandPosition("baseball", "C"), "catcher", "C i baseball = catcher");
eq(expandPosition("football", "C"), "center", "C i football = center");
eq(expandPosition("basketball", "F"), "forward", "F i basketball = forward");
eq(expandPosition("fodbold", "F"), "angriber", "F i fodbold = angriber");
eq(expandPosition("ishockey", "G"), "målmand", "G i ishockey = målmand");
eq(expandPosition("basketball", "G"), "guard", "G i basketball = guard");

// ── Hele engelske ord → dansk hvor dansk har et ord ──────────────────────────
eq(expandPosition("fodbold", "Midfielder"), "midtbanespiller", "Midfielder → midtbanespiller");
eq(expandPosition("fodbold", "Goalkeeper"), "målmand", "Goalkeeper → målmand");
eq(expandPosition("ishockey", "Defenseman"), "back", "Defenseman → back");
eq(expandPosition("basketball", "Guard"), "guard", "engelsk beholdes i basketball");

// ── Versaler og punktummer er ligegyldige ────────────────────────────────────
eq(expandPosition("baseball", "c"), "catcher", "små bogstaver");
eq(expandPosition("baseball", "C."), "catcher", "punktum ignoreres");
eq(expandPosition("fodbold", "  MF  "), "midtbanespiller", "mellemrum trimmes");

// ── Sammensatte positioner ───────────────────────────────────────────────────
eq(expandPosition("basketball", "G/F"), "guard/forward", "skråstreg");
eq(expandPosition("baseball", "P, OF"), "pitcher/outfielder", "komma");
eq(expandPosition("basketball", "F-C"), "forward/center", "kort bindestregs-par");
eq(expandPosition("volleyball", "OH & MB"), "outside hitter/middle blocker", "ampersand");

// ── Vi gætter aldrig ─────────────────────────────────────────────────────────
eq(expandPosition("basketball", "Zx"), "Zx", "ukendt kode returneres uændret");
eq(expandPosition("golf", "Whatever"), "Whatever", "sport uden tabel → uændret");
eq(expandPosition("basketball", null), null, "null → null");
eq(expandPosition("basketball", "   "), null, "kun mellemrum → null");
eq(expandPosition("fodbold", "6'7\""), "6'7\"", "højde er ikke en position — røres ikke");

// Bindestreg må IKKE splitte rigtige ord.
eq(
  expandPosition("atletik", "cross-country"),
  "cross-country",
  "langt bindestregs-ord splittes ikke",
);

// ── Atletik: udvides til ENGELSK disciplinnavn med vilje ─────────────────────
// profile-baseline.ts genkender disciplinen på engelsk og vælger derefter det
// danske verbum. Skiftes værdierne til dansk, går den kobling i stykker.
eq(expandPosition("atletik", "SP"), "shot put", "SP → shot put (engelsk, med vilje)");
eq(expandPosition("atletik", "HJ"), "high jump", "HJ → high jump");
eq(expandPosition("atletik", "MD"), "middle distance", "MD → middle distance");

// ── Svømning ─────────────────────────────────────────────────────────────────
eq(expandPosition("svømning", "IM"), "individuel medley", "IM → individuel medley");
eq(expandPosition("svømning", "BK"), "rygcrawl", "BK → rygcrawl");
eq(expandPosition("roning", "Cox"), "styrmand", "Cox → styrmand");

// ── Ordbogens egne regler (så en redigering ikke bryder konventionen) ────────
for (const [sport, table] of Object.entries(POSITION_TERMS)) {
  for (const key of Object.keys(table)) {
    if (key !== key.toLowerCase()) {
      failed++;
      console.error(`  ✗ ${sport}: nøglen "${key}" skal skrives med små bogstaver`);
    } else passed++;
  }
}

console.log(`\npositions: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
