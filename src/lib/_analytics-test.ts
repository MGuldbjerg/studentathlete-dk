/**
 * Unit-tests for analytics-hjælpere. Kør: npx tsx src/lib/_analytics-test.ts
 * (Ingen test-runner — bare asserts, exit 1 ved fejl.)
 */
import { classify, deviceFromUA, isClickKind, hashVisitor, normalizeSource } from "./analytics";

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
eq(classify("/", "da"), { pageType: "home", sport: null }, "forside");
eq(classify("/atleter/foo", "da"), { pageType: "athlete", sport: null }, "atlet");
eq(classify("/skoler/foo", "da"), { pageType: "school", sport: null }, "skole");
eq(classify("/golf", "da"), { pageType: "sport", sport: "golf" }, "sport-landing");
eq(classify("/golf/rasmus-vinder", "da"), { pageType: "article", sport: "golf" }, "artikel");
eq(classify("/a/b/c", "da"), { pageType: "other", sport: null }, "andet");

// Sproget afgør hvad en sport-slug betyder. «football» er amerikansk fodbold på
// .dk og soccer på .co.uk — uden sproget blev britiske fodboldartikler talt
// under den forkerte sportsgren.
eq(classify("/football/chloe-brand", "en"), { pageType: "article", sport: "soccer" }, "engelsk /football = soccer");
eq(classify("/football/mads", "da"), { pageType: "article", sport: "football" }, "dansk /football = amerikansk fodbold");
eq(classify("/fodbold/mads", "da"), { pageType: "article", sport: "soccer" }, "dansk /fodbold = soccer");
eq(classify("/athletics/storm", "en"), { pageType: "article", sport: "track-and-field" }, "engelsk /athletics");

// Sektioner må ALDRIG blive til opfundne sportsgrene (fejlen der loggede
// /viden som sporten "viden" og den nedlagte /ig som sporten "ig").
eq(classify("/viden", "da"), { pageType: "guide", sport: null }, "viden-hub er ikke en sport");
eq(classify("/viden/hvad-er-ncaa", "da"), { pageType: "guide", sport: null }, "guide er ikke en artikel");
eq(classify("/artikler", "da"), { pageType: "archive", sport: null }, "arkivet");
eq(classify("/atleter", "da"), { pageType: "athlete", sport: null }, "atlet-oversigt");
eq(classify("/ig", "da"), { pageType: "other", sport: null }, "ukendt ét-segment → other, ikke sport");
eq(classify("/noget-vrøvl", "da"), { pageType: "other", sport: null }, "ukendt navn opfinder ingen sport");
eq(classify("/noget/vrøvl", "da"), { pageType: "other", sport: null }, "ukendt sport → ikke artikel");

// Læser-slug oversættes til den kanoniske nøgle, så analytics taler samme
// sprog som databasen (/fodbold er soccer, ikke "fodbold").
eq(classify("/fodbold", "da"), { pageType: "sport", sport: "soccer" }, "dansk slug → kanonisk nøgle");
eq(
  classify("/fodbold/emil-bak-scorer", "da"),
  { pageType: "article", sport: "soccer" },
  "artikel under dansk sport-slug",
);
eq(classify("/svoemning", "da"), { pageType: "sport", sport: "swimming-and-diving" }, "svømning");

// normalizeSource
eq(normalizeSource("ig"), "ig", "simpel kilde");
eq(normalizeSource("IG"), "ig", "små bogstaver");
eq(normalizeSource("news letter!"), "newsletter", "tegn uden for [a-z0-9_-] fjernes");
eq(normalizeSource("utm_source-1"), "utm_source-1", "understreg og bindestreg beholdes");
eq(normalizeSource("!!!"), null, "kun ugyldige tegn → null");
eq(normalizeSource(""), null, "tom streng → null");
eq(normalizeSource(null), null, "null → null");
eq(normalizeSource("x".repeat(80)), "x".repeat(40), "afkortes til 40 tegn");

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
