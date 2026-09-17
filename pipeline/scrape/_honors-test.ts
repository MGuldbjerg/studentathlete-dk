/**
 * Test af udmærkelses-høsten.
 *
 * Teksterne er ægte — hentet fra de tre bio-sider 17. september 2026. De to
 * farlige fejl står nederst: at læse navigationen som en pris, og at give en
 * atlet en holdkammerats udmærkelse.
 */
import { extractBioText, seasonChunks, harvestHonors, pageIsAboutAthlete } from "./scrape-honors";

let passed = 0;
let failed = 0;
function ok(cond: boolean, name: string) {
  if (cond) passed++;
  else { failed++; console.error(`✗ ${name}`); }
}
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    fik:      ${x}\n    forventet: ${y}`); }
}

// ── Bio-beholderen ───────────────────────────────────────────────────────────
const LEGACY = `<html><nav>NCAA Championship History · Player of the Year Archive</nav>
  <div id="sidearm-roster-player-bio"><p>Prior to ETSU - Played six games last season at
  Northwestern Oklahoma State and two more before that. Earned All-Conference mention.</p></div></html>`;
ok(extractBioText(LEGACY)!.includes("Northwestern Oklahoma State"), "gammel Sidearm: bio findes");
ok(!extractBioText(LEGACY)!.includes("Championship History"), "navigationen kommer IKKE med");

const NEW = `<html><header>Wolfpack Club</header>
  <div id="roster-legacy-bio-left-rail__content">SOPHOMORE (2025-26) Earned All-America honors for the
  second consecutive season, earning WGCA All-America Second Team honors and a nod to the Golfweek
  Third Team. Tabbed to All-ACC Team for the second consecutive year.</div></html>`;
ok(extractBioText(NEW)!.includes("All-ACC"), "ny Sidearm: bio findes");

ok(extractBioText(`<html><nav>Player of the Year</nav><main>Ingen bio her</main></html>`) === null,
   "ingen bio-beholder → null, ikke sidens øvrige tekst");
ok(extractBioText(`<html><div id="sidearm-roster-player-bio">Bio</div></html>`) === null,
   "en nærmest tom beholder tæller ikke som bio");

// ── Sæsoner ──────────────────────────────────────────────────────────────────
eq(seasonChunks("Kom til holdet. SOPHOMORE (2025-26) Vandt pris. FRESHMAN (2024-25) Spillede 6 kampe.")
     .map((c) => c.season),
   [null, "2025-26", "2024-25"],
   "bioen skæres på sidens egne sæson-markører");
eq(seasonChunks("Ingen årstal her overhovedet.").map((c) => c.season), [null],
   "uden markører læses hele bioen som ét afsnit");
eq(seasonChunks("Redshirted 2025–26 season.").map((c) => c.season), [null, "2025-26"],
   "tankestreg tæller som bindestreg (teksten før markøren har ingen sæson)");

eq(seasonChunks("Played at Kentucky 2018-22 before transferring.").map((c) => c.season), [null],
   "«2018-22» er en studietid, ikke en sæson");
eq(seasonChunks("SENIOR (2099-00) Vandt alt.").map((c) => c.season), [null, "2099-00"],
   "årtusindskiftet ruller korrekt (99 → 00)");

// ── Årstal alene, som Cornell m.fl. skriver dem ────────────────────────────
eq(seasonChunks("Biography 2025 I JUNIOR SEASON Did not compete. 2024 I SOPHOMORE SEASON All-Ivy.")
     .map((c) => c.season),
   [null, "2025", "2024"],
   "«2024 I SOPHOMORE SEASON» er en sæson");
eq(seasonChunks("REDSHIRT 2023 SEASON: sad ude.").map((c) => c.season), [null, "2023"],
   "årstal + SEASON tæller, uanset ordstilling");
eq(seasonChunks("Moved to England in 2020 and never looked back.").map((c) => c.season), [null],
   "et årstal i almindelig prosa er IKKE en sæson");
eq(seasonChunks("Played 2018-22 before transferring. 2024 FRESHMAN SEASON here.")
     .map((c) => c.season),
   [null, "2024"],
   "studietiden ignoreres stadig, sæsonen fanges");
eq(harvestHonors("2024 I SOPHOMORE SEASON Honorable mention All-Ivy League.")
     .map((x) => `${x.award_name}/${x.season}`),
   ["All-Conference/2024"],
   "prisen får årstallet med");

// ── Høsten ───────────────────────────────────────────────────────────────────
const NCSTATE = `SOPHOMORE (2025-26) Earned All-America honors for the second consecutive season,
earning WGCA All-America Second Team honors. Tabbed to All-ACC Team for the second consecutive year.
FRESHMAN (2024-25) Named ACC Freshman of the Year. Set the school record for low round.`;
const h = harvestHonors(NCSTATE);
eq(h.filter((x) => x.season === "2025-26").map((x) => x.award_name).sort(),
   ["All-American", "All-Conference"],
   "2025-26: All-American og All-Conference, hver ÉN gang");
eq(h.filter((x) => x.season === "2024-25").map((x) => x.award_name).sort(),
   ["Player of the Year", "Rekord"],
   "2024-25: sin egen række, ikke slået sammen med sæsonen over");
ok(h.every((x) => !x.summary.includes("WGCA")),
   "skolens egen formulering lagres ALDRIG — kun det kanoniske navn");
ok(h.length === 4, "fire rækker i alt — to sæsoner à to");

// Formerne skolerne faktisk bruger. Ingen af dem blev fanget før 17. sept. 2026.
eq(harvestHonors("Earned All-America honors.").map((x) => x.award_name), ["All-American"],
   "«All-America» uden n er samme pris");
eq(harvestHonors("Tabbed to All-ACC Team.").map((x) => x.award_name), ["All-Conference"],
   "«All-ACC» er en konference-udmærkelse");
eq(harvestHonors("Named to the All-SoCon second team.").map((x) => x.award_name), ["All-Conference"],
   "«All-SoCon» ligeså");
eq(harvestHonors("Named Academic All-America.").map((x) => x.award_name), ["Academic All-American"],
   "Academic All-America er sin EGEN pris, ikke All-American");
eq(harvestHonors("Holds the all-time school scoring record.").map((x) => x.award_name), [],
   "«all-time» er ikke en All-pris — og «school scoring record» er heller ikke rekord-mønstret");
eq(harvestHonors("Played in the All-Star game as a junior.").map((x) => x.award_name), [],
   "«All-Star» er ikke en konference-udmærkelse");

// Samme pris i to sæsoner ER to rækker; det er dét tabellen skal vise.
eq(harvestHonors("SENIOR (2025-26) All-American. JUNIOR (2024-25) All-American.").length, 2,
   "samme pris i to sæsoner giver to rækker");
// … men to omtaler i SAMME sæson er én.
eq(harvestHonors("SENIOR (2025-26) All-American. Named an All-American again in the spring.").length, 1,
   "to omtaler i samme sæson giver én række");

// ── Deltagelse er ikke sejr ─────────────────────────────────────────────────
eq(harvestHonors("Competed at the NCAA Championships as a sophomore.").map((x) => x.award_name), [],
   "at stille op til NCAA Championships er IKKE et mesterskab");
eq(harvestHonors("Qualified for the NCAA Championship in the 200 free.").map((x) => x.award_name), [],
   "en kvalifikation er heller ikke et mesterskab");
eq(harvestHonors("Won the conference championship with the Bulldogs.").map((x) => x.award_name), ["Mesterskab"],
   "«won the … championship» er det");
eq(harvestHonors("Captured the SoCon championship title.").map((x) => x.award_name), ["Mesterskab"],
   "«captured … championship» ligeså — «SoCon» uden «All-» er ikke en All-pris");
eq(harvestHonors("Was named a national champion in the 400m.").map((x) => x.award_name), ["Mesterskab"],
   "«national champion» om personen tæller");
eq(harvestHonors("Vandt DM og blev danmarksmester i 2025.").map((x) => x.award_name), ["Mesterskab"],
   "dansk: danmarksmester");

// ── Den sæsonløse dublet ────────────────────────────────────────────────────
eq(harvestHonors("A two-time All-American. SENIOR (2025-26) Named All-American again.")
     .map((x) => `${x.award_name}/${x.season ?? "-"}`),
   ["All-American/2025-26"],
   "indledningens sæsonløse omtale falder bort, når prisen også står med årstal");
eq(harvestHonors("A two-time All-American with no seasons listed anywhere.")
     .map((x) => `${x.award_name}/${x.season ?? "-"}`),
   ["All-American/-"],
   "… men står den KUN uden årstal, beholdes den");

// ── Identitet ───────────────────────────────────────────────────────────────
// Den ægte sag: calbears.com svarede på Pippa Jamiesons adresse med en
// linebackers side. En 404 havde været ufarlig; dette var det ikke.
ok(pageIsAboutAthlete("<h1>Pippa Jamieson</h1> Women's Soccer", "Pippa Jamieson"),
   "hendes egen side godkendes");
ok(!pageIsAboutAthlete("<h1>Nick Antzoulatos</h1> Linebacker, Cal Football", "Pippa Jamieson"),
   "en anden atlets side afvises");
ok(pageIsAboutAthlete("<h1>Martha Jane Burgoyne Broderick</h1>", "Martha Broderick"),
   "mellemnavne forhindrer ikke genkendelse");
ok(pageIsAboutAthlete("<h1>MARIE ELINE MADSEN</h1>", "Marie Eline Madsen"),
   "versaler betyder intet");
ok(pageIsAboutAthlete("<h1>Zara Ali</h1> Athletics", "Zara Ali"),
   "kort efternavn godkendes når fornavnet også står der");
ok(!pageIsAboutAthlete("<h1>Jonas Alistair</h1> Swimming", "Zara Ali"),
   "kort efternavn må ikke ramme et andet navn det tilfældigvis står inde i");

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
