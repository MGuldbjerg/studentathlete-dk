/**
 * Test af JSON-roster-parseren (den nye Sidearm-platform).
 *
 * Fixturen er et RIGTIGT svar fra acusports.com, hentet 2026-08-17 med
 * `GET /api/v2/rosters?sportId=4` og beskåret til to spillere. Den vigtigste
 * assertion i filen er bio-URL'ens id: skolen resolver efter `rosterPlayerId`.
 * Bruger man `playerId`, sender skolen brugeren videre til en HELT anden
 * sportsgren (verificeret: basketballspilleren landede på womens-soccer), og
 * `rosterKey()` ville dermed gemme en forkert identitet — den dyreste fejl vi har.
 */
import { parseApiRoster, isRosterApiProbe, apiRosterUrl, apiProbeUrl } from "./roster-api";
import { rosterKey } from "../../lib/athlete-identity";

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, name: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else {
    failed++;
    console.error(`✗ ${name}\n    fik:      ${a}\n    forventet: ${e}`);
  }
}
function ok(cond: boolean, name: string) {
  if (cond) passed++;
  else {
    failed++;
    console.error(`✗ ${name}`);
  }
}

const ORIGIN = "https://acusports.com";

const REAL = {
  items: [
    {
      id: 575,
      displayTitle: "2026-27 Men's Basketball Roster",
      season: { title: "2026-27" },
      players: [
        {
          firstName: "Gus", lastName: "Salem", hometown: "Los Angeles, Calif.",
          positionLong: "Guard", positionShort: "G",
          academicYearShort: "R-So.", academicYearLong: "Redshirt Sophomore",
          rosterPlayerId: 16047, playerId: 7707, gender: "M", hide: false,
          sport: { globalSportNameSlug: "mens-basketball", globalSportGender: "m", abbrev: "MBB" },
        },
        {
          firstName: "Victor", lastName: "Yimga Moukouri", hometown: "Asnieres sur Seine, France",
          positionLong: "Forward / Center", positionShort: "F/C",
          academicYearShort: "So.", academicYearLong: "Sophomore",
          rosterPlayerId: 16048, playerId: 7708, gender: "M", hide: false,
          sport: { globalSportNameSlug: "mens-basketball", globalSportGender: "m", abbrev: "MBB" },
        },
      ],
    },
  ],
  total: 1, page: 1, pages: 1,
};

// ── Platform-detektion ───────────────────────────────────────────────────────
ok(
  isRosterApiProbe(400, '{"title":"One or more validation errors occurred.","errors":{"sportId":["The sportId field is required."]}}'),
  "400 + sportId i kroppen = den nye platform",
);
ok(!isRosterApiProbe(404, ""), "404 = gammel Sidearm");
ok(!isRosterApiProbe(200, '{"items":[]}'), "200 uden validering er ikke en probe");
ok(!isRosterApiProbe(400, '{"errors":{"season":["required"]}}'), "400 om noget andet tæller ikke");
eq(apiRosterUrl("https://x.com/", 4), "https://x.com/api/v2/rosters?sportId=4", "url uden dobbelt-slash");
eq(apiProbeUrl("https://x.com"), "https://x.com/api/v2/rosters", "probe-url");

// ── Det rigtige svar ─────────────────────────────────────────────────────────
const r = parseApiRoster(REAL, ORIGIN);
ok(r !== null, "svaret parses");
eq(r?.entries.length, 2, "to spillere");
eq(r?.season, "2026-27", "sæsontitel");
eq(r?.seasonYear, 2026, "sæsonår udledt af titlen");
eq(r?.teamSlug, "mens-basketball", "holdets globale slug (ikke rostersidens 'basketball')");
eq(r?.gender, "m", "køn er DATA fra kilden");

const gus = r!.entries[0];
eq(gus.name, "Gus Salem", "fornavn + efternavn samles");
eq(gus.hometown, "Los Angeles, Calif.", "hjemby");
eq(gus.position, "Guard", "lang position foretrækkes");
eq(gus.year, "R-So.", "årgang i kort form (resolveClassYear kender 'R-So.')");
eq(gus.gender, "m", "køn pr. spiller");
eq(
  gus.bioUrl,
  "https://acusports.com/sports/mens-basketball/roster/gus-salem/16047",
  "bio-URL bygges med rosterPlayerId — IKKE playerId (7707 peger et andet sted)",
);
ok(!gus.bioUrl!.includes("7707"), "playerId må ikke stå i bio-URL'en");
eq(rosterKey(gus.bioUrl), "acusports.com#16047", "rosterKey kan læse den byggede URL");

// Flerleddet efternavn må ikke ødelægge slug'en.
eq(
  r!.entries[1].bioUrl,
  "https://acusports.com/sports/mens-basketball/roster/victor-yimga-moukouri/16048",
  "flerleddet navn → bindestreger",
);

// ── Kanter ───────────────────────────────────────────────────────────────────
eq(parseApiRoster({ items: [], total: 0 }, ORIGIN), null, "ukendt sportId (tomt items) → null");
eq(parseApiRoster(null, ORIGIN), null, "null-krop");
eq(parseApiRoster("ikke json", ORIGIN), null, "streng i stedet for objekt");
eq(
  parseApiRoster({ items: [{ displayTitle: "2026 Roster", season: { title: "2026" }, players: [] }] }, ORIGIN)?.entries.length,
  0,
  "hold uden offentliggjorte spillere er tomt, ikke null (kaldes 'empty', ikke 'error')",
);

const hidden = {
  items: [{ displayTitle: "2026 Roster", season: { title: "2026" }, players: [
    { firstName: "Skjult", lastName: "Spiller", hide: true, rosterPlayerId: 1,
      sport: { globalSportNameSlug: "womens-golf", globalSportGender: "f" } },
    { firstName: "Vist", lastName: "Spiller", hide: false, rosterPlayerId: 2,
      sport: { globalSportNameSlug: "womens-golf", globalSportGender: "f" } },
  ] }],
};
const h = parseApiRoster(hidden, ORIGIN);
eq(h?.entries.length, 1, "skolens eget 'hide' respekteres");
eq(h?.entries[0].name, "Vist Spiller", "kun den viste spiller");
eq(h?.gender, "f", "køn fra sport-objektet når spillerfeltet mangler");

// Et program der ligger stille: ACU's herre-cross country svarer med 2016.
const stale = parseApiRoster(
  { items: [{ displayTitle: "2016 Men's Cross Country Roster", season: { title: "2016" }, players: [] }] },
  ORIGIN,
);
eq(stale?.seasonYear, 2016, "gammel sæson kan læses, så kalderen kan frasortere");

// Navn uden efternavn må ikke give en tom bio-slug.
const oneName = parseApiRoster(
  { items: [{ season: { title: "2026" }, players: [
    { firstName: "Ronaldinho", rosterPlayerId: 9,
      sport: { globalSportNameSlug: "mens-soccer", globalSportGender: "m" } },
  ] }] },
  ORIGIN,
);
eq(oneName?.entries[0].name, "Ronaldinho", "kun fornavn");
eq(oneName?.entries[0].bioUrl, "https://acusports.com/sports/mens-soccer/roster/ronaldinho/9", "slug uden efternavn");

console.log(`\n${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
