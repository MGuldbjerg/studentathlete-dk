/**
 * Test af SITETS EGEN robots.txt — mod vores egen robots-parser.
 *
 * Sagen: Amtrup-artiklen blev delt på Facebook 18. august 2026 uden billede.
 * `/api/og` svarede 200 med et 1200×630 PNG, og Bluesky viste det samme dag — men
 * vores robots.txt sagde `Disallow: /api/`, og Facebooks scraper respekterer
 * robots.txt. Den hentede siden, læste og:image, og lod billedet ligge.
 *
 * Testen er skruet sammen så den ville have fanget netop det: vi renderer sitets
 * regler til robots.txt-syntaks og spørger `parseRobots()` — samme parser
 * pipelinen bruger til at efterleve ANDRES robots.txt, og som implementerer
 * længste-match-reglen, Google og Meta følger — om en crawler må hente OG-billedet.
 */
import { robotsRules, renderRobotsTxt, OG_IMAGE_PATH } from "../../src/lib/robots-txt";
import { parseRobots } from "./robots";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string) {
  if (cond) passed++;
  else { failed++; console.error(`✗ ${name}`); }
}

const FACEBOOK = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const GOOGLE = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const txt = renderRobotsTxt(robotsRules(false));

for (const [name, ua] of [["Facebook", FACEBOOK], ["Google", GOOGLE]] as const) {
  const p = parseRobots(txt, ua);

  // Kernen: OG-billedet SKAL kunne hentes — ellers får delte links intet billede.
  ok(p.allows(`${OG_IMAGE_PATH}?type=card&article=105&v=8`), `${name} må hente OG-kortet`);
  ok(p.allows(OG_IMAGE_PATH), `${name} må hente ${OG_IMAGE_PATH}`);

  // Alt det andet skal stadig være lukket.
  ok(!p.allows("/api/track"), `${name} må IKKE hente /api/track`);
  ok(!p.allows("/api/_lead"), `${name} må IKKE hente lead-endpointet`);
  ok(!p.allows("/admin/"), `${name} må IKKE hente /admin/`);
  ok(!p.allows("/admin/kladder"), `${name} må IKKE hente admin-undersider`);

  // Og selve indholdet skal være åbent.
  ok(p.allows("/"), `${name} må hente forsiden`);
  ok(p.allows("/fodbold/toke-amtrup-udvalgt-til-big-wests-preseasonhold"), `${name} må hente artikler`);
  ok(p.allows("/atleter/toke-amtrup"), `${name} må hente atletprofiler`);
  ok(p.allows("/sitemap.xml"), `${name} må hente sitemap`);
}

// Dark launch lukker alt — også OG-billedet, og det er meningen: et land der ikke
// må indekseres, skal heller ikke kunne deles med kort.
const dark = parseRobots(renderRobotsTxt(robotsRules(true)), FACEBOOK);
ok(!dark.allows("/"), "dark launch: forsiden er lukket");
ok(!dark.allows(OG_IMAGE_PATH), "dark launch: OG-billedet er lukket");

// Regressionsvagt: forbuddet mod /api/ skal stadig STÅ der. Fjernes det i stedet
// for at tilføje en Allow, bliver sporing og admin-API indekserbart.
ok(
  renderRobotsTxt(robotsRules(false)).includes("Disallow: /api/"),
  "det brede /api/-forbud er bevaret",
);
ok(
  renderRobotsTxt(robotsRules(false)).includes(`Allow: ${OG_IMAGE_PATH}`),
  "OG-stien står som eksplicit Allow",
);

console.log(`\n${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
