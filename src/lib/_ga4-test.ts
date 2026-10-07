/**
 * Tests for the GA4 tag: the ID is validated, and consent defaults come before
 * anything that could set a cookie.
 */
import { CONSENT_REGIONS, ga4Id, ga4Snippet } from "./ga4";

let passed = 0;
let failed = 0;
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    got:      ${x}\n    expected: ${y}`); }
}
function ok(c: boolean, name: string) {
  if (c) passed++;
  else { failed++; console.error(`✗ ${name}`); }
}

eq(ga4Id("G-AB12CD34EF"), "G-AB12CD34EF", "as GA4 shows it");
eq(ga4Id("  g-ab12cd34ef "), "G-AB12CD34EF", "spaces and lower case");
eq(ga4Id(""), null, "empty = no tag");
eq(ga4Id(null), null, "null = no tag");
eq(ga4Id("UA-12345-1"), null, "an old Universal Analytics ID is refused");
eq(ga4Id("GTM-ABC123"), null, "a Tag Manager ID is refused");
eq(ga4Id("G-AB12CD34EF<script>"), null, "nothing but the ID gets into the page");

const s = ga4Snippet("G-AB12CD34EF");
ok(s.indexOf("'consent','default'") >= 0, "sets consent defaults");
ok(s.indexOf("'consent','default'") < s.indexOf("'config'"), "defaults come before the config");
ok(s.includes("analytics_storage:'denied'") && s.includes("ad_storage:'denied'"), "storage denied by default");
ok(s.includes("ad_user_data:'denied'") && s.includes("ad_personalization:'denied'"), "consent mode v2 fields");
for (const c of ["GB", "DK", "DE", "NO", "CH"]) ok(CONSENT_REGIONS.includes(c), `${c} is a consent region`);
ok(!CONSENT_REGIONS.includes("US"), "the US is not");
eq(CONSENT_REGIONS.length, 32, "27 EU + 3 EEA + UK + CH");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
