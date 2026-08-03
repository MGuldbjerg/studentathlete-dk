/**
 * Unit-tests for positions-ordbogen. Kør: npx tsx src/lib/_positions-test.ts
 */
import { expandPosition, POSITION_CODES } from "./positions";
import { LANGUAGES } from "./i18n";

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
eq(expandPosition("soccer", "F"), "angriber", "F i fodbold = angriber");
eq(expandPosition("ice-hockey", "G"), "målmand", "G i ishockey = målmand");
eq(expandPosition("basketball", "G"), "guard", "G i basketball = guard");

// ── Hele engelske ord → dansk hvor dansk har et ord ──────────────────────────
eq(expandPosition("soccer", "Midfielder"), "midtbanespiller", "Midfielder → midtbanespiller");
eq(expandPosition("soccer", "Goalkeeper"), "målmand", "Goalkeeper → målmand");
eq(expandPosition("ice-hockey", "Defenseman"), "back", "Defenseman → back");
eq(expandPosition("basketball", "Guard"), "guard", "engelsk beholdes i basketball");

// ── Versaler og punktummer er ligegyldige ────────────────────────────────────
eq(expandPosition("baseball", "c"), "catcher", "små bogstaver");
eq(expandPosition("baseball", "C."), "catcher", "punktum ignoreres");
eq(expandPosition("soccer", "  MF  "), "midtbanespiller", "mellemrum trimmes");

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
eq(expandPosition("soccer", "6'7\""), "6'7\"", "højde er ikke en position — røres ikke");

// Bindestreg må IKKE splitte rigtige ord.
eq(
  expandPosition("track-and-field", "cross-country"),
  "cross-country",
  "langt bindestregs-ord splittes ikke",
);

// ── Atletik: udvides til ENGELSK disciplinnavn med vilje ─────────────────────
// profile-baseline.ts genkender disciplinen på engelsk og vælger derefter det
// danske verbum. Skiftes værdierne til dansk, går den kobling i stykker.
eq(expandPosition("track-and-field", "SP"), "shot put", "SP → shot put (engelsk, med vilje)");
eq(expandPosition("track-and-field", "HJ"), "high jump", "HJ → high jump");
eq(expandPosition("track-and-field", "MD"), "middle distance", "MD → middle distance");

// ── Svømning ─────────────────────────────────────────────────────────────────
eq(expandPosition("swimming-and-diving", "IM"), "individuel medley", "IM → individuel medley");
eq(expandPosition("swimming-and-diving", "BK"), "rygcrawl", "BK → rygcrawl");
eq(expandPosition("rowing", "Cox"), "styrmand", "Cox → styrmand");

// ── Ordbogens egne regler (så en redigering ikke bryder konventionen) ────────
for (const [sport, table] of Object.entries(POSITION_CODES)) {
  for (const key of Object.keys(table as Record<string, string>)) {
    if (key !== key.toLowerCase()) {
      failed++;
      console.error(`  ✗ ${sport}: nøglen "${key}" skal skrives med små bogstaver`);
    } else passed++;
  }
}

// Hvert begreb kernen kan producere skal kunne siges på ALLE registrerede
// sprog — ellers ville begrebets rå id ("attacking_midfielder") sive ud i en
// profiltekst. Atletik undtaget med vilje: dér ER id'et det engelske
// øvelsesnavn (se positions.ts regel 4), som profil-grammatikken selv oversætter.
for (const [lang, pack] of Object.entries(LANGUAGES)) {
  for (const [sport, table] of Object.entries(POSITION_CODES)) {
    if (sport === "track-and-field") continue;
    for (const concept of new Set(Object.values(table as Record<string, string>))) {
      if (pack.positionPhrase[concept]) passed++;
      else {
        failed++;
        console.error(`  ✗ ${sport}: begrebet "${concept}" mangler i sprogpakken "${lang}"`);
      }
    }
  }
}

// ── Engelsk pakke: samme opslag, andet sprog ─────────────────────────────────
eq(expandPosition("soccer", "F", "en"), "striker", "F i fodbold på engelsk = striker");
eq(expandPosition("soccer", "Midfielder", "en"), "midfielder", "engelsk beholder midfielder");
eq(expandPosition("soccer", "CB", "en"), "centre-back", "britisk stavning centre-back");
eq(expandPosition("ice-hockey", "G", "en"), "goalkeeper", "G i ishockey på engelsk");
eq(expandPosition("ice-hockey", "D", "en"), "defenceman", "britisk stavning defenceman");
eq(expandPosition("swimming-and-diving", "IM", "en"), "individual medley", "IM på engelsk");
eq(expandPosition("basketball", "G/F", "en"), "guard/forward", "sammensat på engelsk");

console.log(`\npositions: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
