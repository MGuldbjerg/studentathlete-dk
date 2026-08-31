/**
 * Test af sport-inventarets rene del.
 *
 * De to første grupper er de VIRKELIGE fejl fra 2026-08-17:
 *
 *  - Santa Clara-sitemappet indeholder mens-tennis OG womens-tennis, men ingen
 *    football og ingen track. Gætte-løkken tog kun ét tennis-hold og skrev
 *    "fejl" på football. Begge forhold skal kunne læses af koden her.
 *  - Kønsprefikset: "womens" indeholder "mens". Testes eksplicit, fordi den
 *    omvendte rækkefølge gjorde hvert kvindehold til et herrehold andetsteds i
 *    kodebasen (src/lib/gender.ts, migration 039).
 */
import {
  genderFromTeamSlug,
  stripGenderPrefix,
  sportFromTeamSlug,
  isTeamSlug,
  teamFromRosterUrl,
  locsFromXml,
  isSitemapIndex,
  rosterSitemaps,
  teamsFromXml,
  teamsFromHtml,
  unsponsoredSports,
} from "./team-discovery";

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, name: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
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

// ── Køn fra holdnavn ─────────────────────────────────────────────────────────
eq(genderFromTeamSlug("womens-tennis"), "f", "womens-tennis er kvinder");
eq(genderFromTeamSlug("mens-tennis"), "m", "mens-tennis er mænd");
eq(genderFromTeamSlug("womens-swimming-and-diving"), "f", "womens-svømning er kvinder");
eq(genderFromTeamSlug("mens-swimming-and-diving"), "m", "mens-svømning er mænd");
eq(genderFromTeamSlug("football"), null, "football siger intet om køn");
eq(genderFromTeamSlug("softball"), "f", "softball er kvinder i NCAA");
eq(genderFromTeamSlug("field-hockey"), "f", "field hockey er kvinder i NCAA");
eq(genderFromTeamSlug("w-basketball"), "f", "w- som prefiks");
eq(genderFromTeamSlug("m-basketball"), "m", "m- som prefiks");

// ── Kanonisk sport ───────────────────────────────────────────────────────────
eq(stripGenderPrefix("womens-rowing"), "rowing", "kønsprefiks fjernes");
eq(sportFromTeamSlug("womens-rowing"), "rowing", "roning");
eq(sportFromTeamSlug("mens-cross-country"), "track-and-field", "cross country → atletik");
eq(sportFromTeamSlug("womens-indoor-track-and-field"), "track-and-field", "indoor track → atletik");
eq(sportFromTeamSlug("mens-swimming-diving"), "swimming-and-diving", "svømning uden 'and'");
eq(sportFromTeamSlug("womens-beach-volleyball"), "volleyball", "beach volley → volleyball");
eq(sportFromTeamSlug("mens-crew"), "rowing", "crew → roning");
eq(sportFromTeamSlug("baseball"), "baseball", "baseball");
// Sportsgrene UDEN kanonisk nøgle må ikke få en forkert etiket.
// Landhockey blev en kanonisk sportsgren 2026-08-18 — den må IKKE falde i other.
eq(sportFromTeamSlug("field-hockey"), "field-hockey", "landhockey er sin egen sportsgren");
eq(sportFromTeamSlug("womens-field-hockey"), "field-hockey", "kønsprefiks foran landhockey");
eq(genderFromTeamSlug("womens-field-hockey"), "f", "kvindehold");
// Louisvilles rigtige holdslug (Chloe Plumbs bio ligger her).
eq(
  teamFromRosterUrl("https://gocards.com/sports/field-hockey/roster/chloe-plumb/18115")?.sport,
  "field-hockey",
  "spiller-bio på et landhockey-hold",
);

// Vandpolo, rugby, fægtning, squash og esport blev kanoniske 2026-08-19 —
// atleterne lå i "other", hvor sporten forsvandt.
eq(sportFromTeamSlug("mens-water-polo"), "water-polo", "vandpolo → water-polo");
eq(sportFromTeamSlug("womens-rugby"), "rugby", "rugby → rugby");
eq(sportFromTeamSlug("mens-fencing"), "fencing", "fægtning → fencing");
eq(sportFromTeamSlug("womens-squash"), "squash", "squash → squash");
eq(sportFromTeamSlug("league-of-legends"), "esports", "spiltitel → esports");
eq(sportFromTeamSlug("mens-heavyweight-rowing"), "rowing", "vægtklasse-roning → rowing");
eq(sportFromTeamSlug("wcross"), "track-and-field", "cross country hører til atletik");
eq(sportFromTeamSlug("mens-polo"), "polo", "hestepolo er IKKE vandpolo");
eq(sportFromTeamSlug("womens-lacrosse"), "lacrosse", "lacrosse → lacrosse");
eq(sportFromTeamSlug("softball"), "softball", "softball er sin egen sport, ikke baseball");
eq(sportFromTeamSlug("womens-bowling"), "bowling", "bowling → bowling");
eq(sportFromTeamSlug("pistol"), "shooting", "pistol og riffel er ÉN kategori");
eq(sportFromTeamSlug("womens-rifle"), "shooting", "riffel → shooting");
eq(sportFromTeamSlug("nordic-skiing"), "skiing", "langrend og alpint er ét skihold");
eq(sportFromTeamSlug("womens-triathlon"), "triathlon", "triatlon → triathlon");
eq(sportFromTeamSlug("mens-sailing"), "sailing", "sejlsport → sailing");
eq(sportFromTeamSlug("womens-flag-football"), "flag-football", "flag football → flag-football");
eq(sportFromTeamSlug("cycling"), "cycling", "cykling → cycling");
eq(sportFromTeamSlug("archery"), "archery", "bueskydning → archery");
eq(sportFromTeamSlug("acrobatics-tumbling"), "acrobatics-tumbling", "A&T → acrobatics-tumbling");
eq(sportFromTeamSlug("ultimate-frisbee"), "ultimate", "ultimate frisbee → ultimate");
// STUNT er en anden sport end acrobatics & tumbling og er ikke valgt til.
eq(sportFromTeamSlug("stunt"), "other", "STUNT er ikke A&T");
// Dans og hestesport er fravalgt (Mikkel 2026-08-19) — de SKAL blive i "other".
eq(sportFromTeamSlug("dance-team"), "other", "dans er fravalgt");
eq(sportFromTeamSlug("equestrian"), "other", "ridning er fravalgt");
ok(!isTeamSlug("saac"), "SAAC er ikke et hold");
ok(!isTeamSlug("hall-of-fame"), "hall of fame er ikke et hold");
ok(!isTeamSlug("pep-band"), "orkestret er ikke et hold");
eq(sportFromTeamSlug("wrestling"), "wrestling", "brydning → wrestling");

// ── Hvad er et hold ──────────────────────────────────────────────────────────
ok(isTeamSlug("womens-golf"), "womens-golf er et hold");
ok(!isTeamSlug("general"), "'general' er Sidearms fællescontainer, ikke et hold");
ok(!isTeamSlug("staff"), "'staff' er ikke et hold");
ok(!isTeamSlug(""), "tom slug er ikke et hold");

// ── URL → hold ───────────────────────────────────────────────────────────────
eq(
  teamFromRosterUrl("https://santaclarabroncos.com/sports/womens-tennis/roster"),
  {
    teamSlug: "womens-tennis",
    sport: "tennis",
    gender: "f",
    rosterUrl: "https://santaclarabroncos.com/sports/womens-tennis/roster",
    latestSeason: null,
  },
  "roster-URL → hold",
);

// ── Sæson-URL'er: den fejl der gav NUL hold på Loyola ────────────────────────
// Loyolas roster-sitemap indeholder kun sæson-URL'er (/roster/2013 … /roster/2026)
// og aldrig den bare /roster. Den første version af matcheren krævede at stien
// SLUTTEDE ved /roster og fandt derfor ingenting på hele skolen.
eq(
  teamFromRosterUrl("https://loyolaramblers.com/sports/cross-country/roster/2026")?.teamSlug,
  "cross-country",
  "sæson-URL udpeger stadig holdet",
);
eq(
  teamFromRosterUrl("https://loyolaramblers.com/sports/cross-country/roster/2026")?.latestSeason,
  2026,
  "sæsonen læses ud af URL'en",
);
eq(
  teamFromRosterUrl("https://x.com/sports/mens-basketball/roster/2026-27")?.latestSeason,
  2026,
  "sæson på formen 2026-27",
);
eq(
  teamFromRosterUrl("https://x.com/sports/womens-golf/roster/2026")?.rosterUrl,
  "https://x.com/sports/womens-golf/roster",
  "vi GEMMER altid den kanoniske forside uden sæson",
);
// Spiller-bio'er udpeger også holdet — de ligger i skolens sitemap_player_1.xml.
eq(
  teamFromRosterUrl("https://acusports.com/sports/mens-basketball/roster/gus-salem/16047")?.teamSlug,
  "mens-basketball",
  "spiller-bio afslører holdet",
);
eq(
  teamFromRosterUrl("https://acusports.com/sports/mens-basketball/roster/gus-salem/16047")?.latestSeason,
  null,
  "en bio-URL siger intet om sæson",
);
eq(
  teamFromRosterUrl("https://x.com/sports/mens-soccer/roster/")?.teamSlug,
  "mens-soccer",
  "trailing slash",
);
eq(teamFromRosterUrl("https://x.com/sports/mens-soccer/schedule"), null, "schedule er ikke en roster");
eq(teamFromRosterUrl("https://x.com/news/story"), null, "nyhed er ikke en roster");
eq(teamFromRosterUrl("ikke en url"), null, "ugyldig URL");
eq(
  teamFromRosterUrl("https://x.com/sports/womens-rowing/roster?view=list")?.teamSlug,
  "womens-rowing",
  "query ignoreres",
);

// ── Sitemap ──────────────────────────────────────────────────────────────────
const INDEX = `<?xml version="1.0"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://loyolaramblers.com/sitemap/sitemap_story_1.xml</loc></sitemap>
  <sitemap><loc>https://loyolaramblers.com/sitemap/sitemap_roster_1.xml</loc></sitemap>
  <sitemap><loc>https://loyolaramblers.com/sitemap/sitemap_player_1.xml</loc></sitemap>
</sitemapindex>`;

ok(isSitemapIndex(INDEX), "sitemapindex genkendes");
eq(locsFromXml(INDEX, "https://loyolaramblers.com").length, 3, "tre loc-værdier");
eq(
  rosterSitemaps(INDEX, "https://loyolaramblers.com"),
  [
    "https://loyolaramblers.com/sitemap/sitemap_roster_1.xml",
    "https://loyolaramblers.com/sitemap/sitemap_player_1.xml",
  ],
  "kun roster/player følges — nyhedsarkivet koster requests uden at give hold",
);

// Santa Claras rigtige holdliste (uddrag, hentet 2026-08-17).
const SCU = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://santaclarabroncos.com/sports/baseball/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/mens-basketball/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/womens-basketball/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/mens-tennis/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/womens-tennis/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/mens-rowing/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/womens-rowing/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/womens-water-polo/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/general/roster</loc></url>
  <url><loc>https://santaclarabroncos.com/sports/mens-soccer/schedule</loc></url>
</urlset>`;

const scuTeams = teamsFromXml(SCU, "https://santaclarabroncos.com");
eq(scuTeams.length, 8, "otte hold (general og schedule tælles ikke med)");
ok(
  scuTeams.some((t) => t.teamSlug === "mens-tennis") &&
    scuTeams.some((t) => t.teamSlug === "womens-tennis"),
  "BEGGE tennis-hold findes — det gamle gætteri tog kun ét",
);
ok(
  scuTeams.filter((t) => t.sport === "tennis").length === 2,
  "to hold kan dele samme kanoniske sport",
);
ok(
  scuTeams.some((t) => t.sport === "water-polo" && t.teamSlug === "womens-water-polo"),
  "vandpolo med som water-polo",
);

// Det negative register: Santa Clara har ikke football, gymnastik, ishockey,
// svømning, golf eller atletik i uddraget.
const missing = unsponsoredSports(scuTeams);
ok(missing.includes("football"), "football står som ikke-sponsoreret");
ok(missing.includes("gymnastics"), "gymnastik står som ikke-sponsoreret");
ok(missing.includes("ice-hockey"), "ishockey står som ikke-sponsoreret");
ok(!missing.includes("tennis"), "tennis står IKKE som ikke-sponsoreret");
ok(!missing.includes("rowing"), "roning står IKKE som ikke-sponsoreret");
ok(!missing.includes("other"), "'other' kan aldrig mangle — den er ikke en sportsgren");

// Dubletter i skolens eget sitemap må ikke give to rækker for samme hold.
const DUPES = `<urlset>
  <url><loc>https://x.com/sports/mens-golf/roster</loc></url>
  <url><loc>https://x.com/sports/mens-golf/roster</loc></url>
  <url><loc>https://x.com/sports/mens-golf/roster?season=2026</loc></url>
</urlset>`;
eq(teamsFromXml(DUPES, "https://x.com").length, 1, "samme hold kun én gang");

// Loyolas rigtige roster-sitemap: mange sæsoner pr. hold, nyeste skal vinde.
const SEASONS = `<urlset>
  <url><loc>https://loyolaramblers.com/sports/cross-country/roster/2013</loc></url>
  <url><loc>https://loyolaramblers.com/sports/cross-country/roster/2019</loc></url>
  <url><loc>https://loyolaramblers.com/sports/cross-country/roster/2026</loc></url>
  <url><loc>https://loyolaramblers.com/sports/mens-volleyball/roster/2011</loc></url>
</urlset>`;
const seasonTeams = teamsFromXml(SEASONS, "https://loyolaramblers.com");
eq(seasonTeams.length, 2, "to hold på tværs af mange sæsoner");
eq(seasonTeams.find((t) => t.teamSlug === "cross-country")?.latestSeason, 2026, "nyeste sæson vinder");
eq(
  seasonTeams.find((t) => t.teamSlug === "mens-volleyball")?.latestSeason,
  2011,
  "et hold hvis nyeste roster er fra 2011 er et henlagt program",
);

// ── Skolens egen sport-menu (HTML) ───────────────────────────────────────────
// Santa Claras /sitemap.xml svarer med en 404-HTML-side; holdene står i menuen
// på hver almindelig side. Den kilde skal virke, ellers er skolen usynlig.
const NAV = `<!doctype html><html><body><nav>
  <a href="/sports/mens-water-polo/roster">Men's Water Polo</a>
  <a href="/sports/womens-water-polo/roster">Women's Water Polo</a>
  <a href="https://santaclarabroncos.com/sports/womens-rowing/roster">Women's Rowing</a>
  <a href="/sports/mens-soccer/schedule">Schedule</a>
  <a href="/sports/general/roster">General</a>
  <a href="/news/2026/8/17/story.aspx">Nyhed</a>
</nav></body></html>`;
const navTeams = teamsFromHtml(NAV, "https://santaclarabroncos.com");
eq(navTeams.length, 3, "tre hold fra menuen (schedule, general og nyhed tælles ikke)");
ok(
  navTeams.some((t) => t.teamSlug === "womens-water-polo" && t.sport === "water-polo"),
  "vandpolo med som water-polo",
);
eq(
  navTeams.find((t) => t.teamSlug === "womens-rowing")?.rosterUrl,
  "https://santaclarabroncos.com/sports/womens-rowing/roster",
  "absolutte og relative href'er giver samme URL",
);

// ── PrestoSports: sæsonen står MELLEM hold og roster (31/8) ─────────────────
// Junior colleges kører overvejende Presto, ikke Sidearm. Formen er
// `/sports/msoc/2026-27/roster`, og den gamle regex krævede `/roster` lige
// efter holdnavnet — så calhounathletics.com meldte 0 hold, mens holdmenuen
// stod med 15. Sitet så tomt ud, og skolen blev noteret som "intet fundet".
const presto = teamFromRosterUrl("https://calhounathletics.com/sports/msoc/2026-27/roster");
eq(presto?.teamSlug, "msoc", "Presto: holdet læses ud");
eq(presto?.sport, "soccer", "Presto: msoc er fodbold");
eq(presto?.latestSeason, 2026, "Presto: sæsonen læses fra det midterste led");
// Sæsonen SKAL blive i adressen: /sports/msoc/roster svarer 404 hos Presto.
eq(
  presto?.rosterUrl,
  "https://calhounathletics.com/sports/msoc/2026-27/roster",
  "Presto: sæsonleddet beholdes i roster-URL'en",
);

// Sidearm er uændret: sæsonen står EFTER og normaliseres væk.
const sidearm = teamFromRosterUrl("https://gocards.com/sports/mens-soccer/roster/2026");
eq(sidearm?.rosterUrl, "https://gocards.com/sports/mens-soccer/roster", "Sidearm: normaliseres uden sæson");
eq(sidearm?.latestSeason, 2026, "Sidearm: sæsonen læses stadig");

// Presto-koderne skal kunne navngives — ellers er holdet "other" og tælles
// hverken som fundet eller som manglende.
eq(teamFromRosterUrl("https://x.com/sports/mbkb/2026-27/roster")?.sport, "basketball", "mbkb = basketball");
eq(teamFromRosterUrl("https://x.com/sports/fball/2026-27/roster")?.sport, "football", "fball = amerikansk fodbold");

console.log(`\n${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
