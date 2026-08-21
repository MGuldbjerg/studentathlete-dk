/**
 * Artiklens adresse er SPROGBESTEMT — og "football" betyder to ting.
 * ===========================================================================
 *
 * Baggrund (2026-08-21): britiske artikler lå på `/fodbold/…` og `/atletik/…`,
 * fordi `getArticleUrl()` blev kaldt uden sprog og derfor fik standardsitets
 * slug. Samtidig byggede sitemappet adressen af DB-nøglen ("soccer"), som ingen
 * af sitene serverer — hver eneste fodboldartikel i sitemappet var en 404.
 *
 * Fælden der gør det farligt at "bare acceptere begge sprog": `football` er en
 * gyldig slug på begge sprog og peger på HVER SIN sportsgren — amerikansk
 * fodbold på dansk, soccer på engelsk. En omdirigering må derfor kun ske når
 * sluggen betyder præcis samme sportsgren som artiklen.
 *
 * Kør: npx tsx src/lib/_article-url-test.ts
 */
import { getArticleUrl, getAthleteUrl, getSchoolUrl, getGuideUrl } from "./seo";
import { sportKeyFromSlugAnyLanguage, sportSlug, routePath, routeSlug, routeKeyFromSlug, queryParam, queryParamAliases } from "./i18n";

let passed = 0;
let failed = 0;

function expect(label: string, got: unknown, want: unknown): void {
  if (Object.is(got, want)) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

const soccer = { slug: "chloe-brand", sport: "soccer" };
const athletics = { slug: "storm-evans", sport: "track-and-field" };
const gridiron = { slug: "chigozie-oge-evans", sport: "football" };

// ── Adressen følger sitets sprog ────────────────────────────────────────────
expect("engelsk: soccer → /football/", getArticleUrl(soccer, "en"), "/football/chloe-brand");
expect("dansk: soccer → /fodbold/", getArticleUrl(soccer, "da"), "/fodbold/chloe-brand");
expect("engelsk: track-and-field → /athletics/", getArticleUrl(athletics, "en"), "/athletics/storm-evans");
expect("dansk: track-and-field → /atletik/", getArticleUrl(athletics, "da"), "/atletik/storm-evans");

// Amerikansk fodbold er den omvendte fælde: dansk slug er "football".
expect("dansk: football → /football/", getArticleUrl(gridiron, "da"), "/football/chigozie-oge-evans");
expect("engelsk: football → /american-football/", getArticleUrl(gridiron, "en"), "/american-football/chigozie-oge-evans");

// DB-nøglen er ALDRIG adressen — det var sitemappets fejl.
expect("db-nøglen 'soccer' bruges ikke som sti på noget sprog",
  [getArticleUrl(soccer, "da"), getArticleUrl(soccer, "en")].some((u) => u.startsWith("/soccer/")),
  false);

// ── Genkendelse på tværs af sprog (til 301) ────────────────────────────────
expect("engelsk site genkender dansk 'fodbold'", sportKeyFromSlugAnyLanguage("fodbold", "en"), "soccer");
expect("dansk site genkender engelsk 'athletics'", sportKeyFromSlugAnyLanguage("athletics", "da"), "track-and-field");

// Sitets EGET sprog vinder for en tvetydig slug — ellers ville en soccer-artikel
// kunne sendes videre til amerikansk fodbold (og omvendt).
expect("'football' på engelsk site = soccer", sportKeyFromSlugAnyLanguage("football", "en"), "soccer");
expect("'football' på dansk site = amerikansk fodbold", sportKeyFromSlugAnyLanguage("football", "da"), "football");
expect("ukendt slug genkendes ikke", sportKeyFromSlugAnyLanguage("hockeystav", "en"), null);

// ── Sammenhæng: slug-tabellen og adressen er samme kilde ───────────────────
expect("getArticleUrl bruger sprogpakkens slug",
  getArticleUrl({ slug: "x", sport: "swimming-and-diving" }, "en"),
  `/${sportSlug("swimming-and-diving", "en")}/x`);

// ── Sektionsstier: også dem tilhører sitet ─────────────────────────────────
expect("engelsk: atleter → /athletes", getAthleteUrl("chloe-brand", "en"), "/athletes/chloe-brand");
expect("dansk: atleter → /atleter", getAthleteUrl("toke-amtrup", "da"), "/atleter/toke-amtrup");
expect("engelsk: skoler → /schools", getSchoolUrl("rice", "en"), "/schools/rice");
expect("dansk: skoler → /skoler", getSchoolUrl("rice", "da"), "/skoler/rice");
expect("engelsk: viden → /guides", getGuideUrl("what-is-the-ncaa", "en"), "/guides/what-is-the-ncaa");
expect("dansk: viden → /viden", getGuideUrl("hvad-er-ncaa", "da"), "/viden/hvad-er-ncaa");
expect("arkivet på engelsk", routePath("archive", "en"), "/articles");
expect("arkivet på dansk", routePath("archive", "da"), "/artikler");

// Genkendelse på tværs (middlewarens 308 + analytics' klassificering)
expect("«atleter» genkendes som athletes", routeKeyFromSlug("atleter"), "athletes");
expect("«athletes» genkendes som athletes", routeKeyFromSlug("athletes"), "athletes");
expect("«guides» genkendes", routeKeyFromSlug("guides"), "guides");
expect("en sportsslug er ikke en sektion", routeKeyFromSlug("football"), null);

// Mapperne i app-routeren er de danske navne — middlewaren skriver om til dem.
expect("dansk er app-routerens fysiske navn", routeSlug("athletes", "da"), "atleter");

// Query-parametre
expect("sidetal på dansk", queryParam("page", "da"), "side");
expect("sidetal på engelsk", queryParam("page", "en"), "page");
expect("kilde på dansk", queryParam("source", "da"), "kilde");
expect("kilde på engelsk", queryParam("source", "en"), "source");
expect("begge navne accepteres ved læsning", queryParamAliases("source").sort().join(","), "kilde,source");

console.log(`\narticle-url: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
