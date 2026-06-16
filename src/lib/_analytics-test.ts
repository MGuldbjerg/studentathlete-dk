/**
 * Unit-tests for analytics-hjælpere. Kør: npx tsx src/lib/_analytics-test.ts
 * (Ingen test-runner — bare asserts, exit 1 ved fejl.)
 */
import { classify, deviceFromUA, isClickKind, hashVisitor } from "./analytics";

let failed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}
function eq(a: unknown, b: unknown, msg: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (fik ${JSON.stringify(a)}, ville have ${JSON.stringify(b)})`);
}

// classify
eq(classify("/"), { pageType: "home", sport: null }, "forside");
eq(classify("/atleter/foo"), { pageType: "athlete", sport: null }, "atlet");
eq(classify("/skoler/foo"), { pageType: "school", sport: null }, "skole");
eq(classify("/golf"), { pageType: "sport", sport: "golf" }, "sport-landing");
eq(classify("/golf/rasmus-vinder"), { pageType: "article", sport: "golf" }, "artikel");
eq(classify("/a/b/c"), { pageType: "other", sport: null }, "andet");

// deviceFromUA
eq(deviceFromUA("Mozilla/5.0 (iPhone)"), "mobile", "iphone=mobile");
eq(deviceFromUA("Mozilla/5.0 (iPad)"), "tablet", "ipad=tablet");
eq(deviceFromUA("Mozilla/5.0 (Windows NT 10.0)"), "desktop", "windows=desktop");

// isClickKind
ok(isClickKind("bio_out"), "bio_out gyldig");
ok(isClickKind("search"), "search gyldig");
ok(!isClickKind("evil"), "ukendt afvist");
ok(!isClickKind(123), "ikke-streng afvist");

// hashVisitor — deterministisk for samme input, forskellig ved andet salt
(async () => {
  const h1 = await hashVisitor("1.2.3.4", "UA", "salt");
  const h2 = await hashVisitor("1.2.3.4", "UA", "salt");
  const h3 = await hashVisitor("1.2.3.4", "UA", "andet-salt");
  eq(h1, h2, "samme input → samme hash");
  ok(h1 !== h3, "andet salt → anden hash");
  ok(/^[0-9a-f]{64}$/.test(h1), "hash er 64 hex-tegn (SHA-256)");

  if (failed > 0) {
    console.error(`\n${failed} test(s) fejlede.`);
    process.exit(1);
  }
  console.log("Alle analytics-tests bestået.");
})();
