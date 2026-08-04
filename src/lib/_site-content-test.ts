/**
 * Unit-tests for site-content-hjælpere. Kør: npx tsx src/lib/_site-content-test.ts
 *
 * Fokus: `adsenseIds`. AdSense skriver ID'et som "ca-pub-123…", men ads.txt
 * vil have "pub-123…" — normaliseringen findes netop for at Mikkel kan indsætte
 * værdien præcis som den står i AdSense, uanset form. Et forkert ID i ads.txt
 * er værre end intet, så ugyldige værdier skal give null (⇒ 404/intet metatag).
 */
import { adsenseIds, SITE_CONTENT, SETTING_KEYS, siteDefaults } from "./site-content";

let passed = 0;
let failed = 0;

function eq(got: unknown, want: unknown, label: string): void {
  if (JSON.stringify(got) === JSON.stringify(want)) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

const ID = "1234567890123456";

// ── Alle tre skrivemåder giver samme resultat ────────────────────────────────
eq(adsenseIds(`ca-pub-${ID}`), { account: `ca-pub-${ID}`, seller: `pub-${ID}` }, "kontoform ca-pub-…");
eq(adsenseIds(`pub-${ID}`), { account: `ca-pub-${ID}`, seller: `pub-${ID}` }, "sælgerform pub-…");
eq(adsenseIds(ID), { account: `ca-pub-${ID}`, seller: `pub-${ID}` }, "bare cifre");
eq(adsenseIds(`  ca-pub-${ID}  `), { account: `ca-pub-${ID}`, seller: `pub-${ID}` }, "mellemrum trimmes");
eq(adsenseIds(`CA-PUB-${ID}`), { account: `ca-pub-${ID}`, seller: `pub-${ID}` }, "versaler");

// ── Ugyldigt → null (ingen ads.txt, intet metatag) ───────────────────────────
eq(adsenseIds(""), null, "tomt felt");
eq(adsenseIds("   "), null, "kun mellemrum");
eq(adsenseIds(null), null, "null");
eq(adsenseIds(undefined), null, "undefined");
eq(adsenseIds("ca-pub-"), null, "præfiks uden cifre");
eq(adsenseIds("ca-pub-abcdef1234567890"), null, "bogstaver i ID");
eq(adsenseIds("ca-pub-123"), null, "for kort til at være et rigtigt ID");
eq(adsenseIds("ca-pub-1234567890123456; rm -rf /"), null, "indsprøjtet skidt afvises");
eq(adsenseIds("<script>alert(1)</script>"), null, "markup afvises");

// ── Registret hænger sammen ──────────────────────────────────────────────────
eq(SETTING_KEYS.has("adsense.publisher_id"), true, "nøglen er i SETTING_KEYS (ellers afviser admin-PUT den)");
eq(siteDefaults()["adsense.publisher_id"], "", "standard er tom — verifikation er tilvalg");
eq(
  SITE_CONTENT.filter((s) => s.key === "adsense.publisher_id").length,
  1,
  "nøglen findes præcis én gang",
);
eq(new Set(SITE_CONTENT.map((s) => s.key)).size, SITE_CONTENT.length, "ingen dublet-nøgler i registret");
eq(SETTING_KEYS.has("adsense.enabled"), true, "script-kontakten er i SETTING_KEYS");
eq(siteDefaults()["adsense.enabled"], "false", "scriptet er slukket som standard — det indlæser tredjeparts-JS");
eq(
  SITE_CONTENT.find((s) => s.key === "adsense.enabled")?.type,
  "bool",
  "script-kontakten er en bool (afkrydsning i admin)",
);

console.log(`\nsite-content: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
