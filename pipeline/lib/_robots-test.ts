/**
 * Test af robots.txt-efterlevelsen.
 *
 * Den første gruppe er acusports.com's rigtige robots.txt (uddrag, 2026-08-17):
 * en lang række navngivne bots får `Disallow: /`, mens `User-agent: *` kun
 * forbyder /common/, /images/, /documents/, /admin/, /services/ og /site/.
 * Netop derfor må vi hente `/api/v2/rosters` — og præcis det skal koden kunne
 * afgøre, i stedet for at vi antager det.
 */
import { parseRobots, ALLOW_ALL, robotsAllows, _clearRobotsCache } from "./robots";

let passed = 0;
let failed = 0;

function ok(cond: boolean, name: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`✗ ${name}`);
  }
}

const UA = "StudentAthleteBot/1.0 (+https://studentathlete.dk)";

// ── acusports.com, som den ser ud ────────────────────────────────────────────
const ACU = `
User-agent: BLP_bbot
Disallow: /

User-agent: Baiduspider
Disallow: /

User-agent: *
Disallow: /common/
Disallow: /images/
Disallow: /documents/
Disallow: /admin/
Disallow: /services/
Disallow: /site/

Sitemap: https://acusports.com/sitemap.xml
`;

const acu = parseRobots(ACU, UA);
ok(acu.allows("/api/v2/rosters?sportId=4"), "API-stien er tilladt for os");
ok(acu.allows("/sports/mens-basketball/roster"), "rostersiden er tilladt");
ok(acu.allows("/sitemap.xml"), "sitemap er tilladt");
ok(!acu.allows("/images/2026/8/2/headshot.jpg"), "/images/ er forbudt");
ok(!acu.allows("/admin/"), "/admin/ er forbudt");
ok(acu.allows("/"), "forsiden er tilladt");

// Reglerne for ANDRE bots må ikke ramme os.
ok(acu.allows("/anything"), "BLP_bbots totalforbud gælder ikke os");

// ── Vores egen agent nævnt ved navn slår *-gruppen ───────────────────────────
const NAMED = `
User-agent: *
Disallow: /

User-agent: StudentAthleteBot
Disallow: /private/
`;
const named = parseRobots(NAMED, UA);
ok(named.allows("/sports/womens-golf/roster"), "navngiven gruppe vinder over *");
ok(!named.allows("/private/x"), "vores egen gruppes forbud gælder");

// ── Længste match vinder ─────────────────────────────────────────────────────
const NESTED = `
User-agent: *
Disallow: /sports/
Allow: /sports/mens-soccer/roster
`;
const nested = parseRobots(NESTED, UA);
ok(nested.allows("/sports/mens-soccer/roster"), "Allow med længere mønster vinder");
ok(!nested.allows("/sports/womens-soccer/roster"), "resten af /sports/ er stadig forbudt");

// ── Jokere ───────────────────────────────────────────────────────────────────
const WILD = `
User-agent: *
Disallow: /*/roster$
`;
const wild = parseRobots(WILD, UA);
ok(!wild.allows("/sports/roster"), "* i midten matcher");
ok(wild.allows("/sports/mens-golf/roster/player/12"), "$ betyder slut på stien");

// ── Tomme og tossede filer ───────────────────────────────────────────────────
ok(parseRobots("", UA).allows("/hvadsomhelst"), "tom robots.txt tillader alt");
ok(parseRobots("Disallow: /", UA).allows("/x"), "regler uden user-agent ignoreres");
ok(parseRobots("User-agent: *\nDisallow:", UA).allows("/x"), "'Disallow:' uden værdi forbyder intet");
ok(
  parseRobots("User-agent: *\nDisallow: /a # kommentar", UA).allows("/b"),
  "kommentarer strippes",
);
ok(!parseRobots("User-agent: *\nDisallow: /a # kommentar", UA).allows("/a/b"), "og reglen gælder stadig");
ok(ALLOW_ALL.allows("/hvadsomhelst"), "ALLOW_ALL");

// ── Fail-open ved netværksfejl ───────────────────────────────────────────────
async function failOpen() {
  _clearRobotsCache();
  const boom: typeof fetch = () => Promise.reject(new Error("timeout"));
  ok(await robotsAllows("https://x.com/sports/a/roster", UA, boom), "kan robots.txt ikke hentes, fortsætter vi");

  _clearRobotsCache();
  let calls = 0;
  const counting: typeof fetch = () => {
    calls++;
    return Promise.resolve(new Response("User-agent: *\nDisallow: /nej", { status: 200 }));
  };
  await robotsAllows("https://y.com/a", UA, counting);
  await robotsAllows("https://y.com/b", UA, counting);
  ok(calls === 1, "robots.txt hentes ÉN gang pr. vært, ikke pr. URL");
  ok(!(await robotsAllows("https://y.com/nej/x", UA, counting)), "cachet politik bruges");

  _clearRobotsCache();
  const htmlErr: typeof fetch = () =>
    Promise.resolve(new Response("<html><body>404</body></html>", { status: 200 }));
  ok(
    await robotsAllows("https://z.com/a", UA, htmlErr),
    "en HTML-fejlside må ikke parses som regler",
  );

  console.log(`\n${passed} bestået, ${failed} fejlet.`);
  if (failed > 0) process.exit(1);
}

failOpen();
