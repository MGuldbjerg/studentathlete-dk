/**
 * Test af atletiksite-fundet.
 *
 * Sagen er virkelig: Kalamazoo College står i basen med `https://www.kzoo.edu`,
 * og dens rosters ligger på `hornetathletics.com`. 435 skoler har samme problem,
 * 258 af dem i D3. Det farlige ved en sådan søgning er ikke at fejle — det er at
 * finde det FORKERTE og skrive det i basen, så scraperen derefter henter en
 * fremmed skoles hold. Derfor handler de fleste tilfælde her om afvisning.
 */
import {
  looksLikeAthleticsHost,
  candidatesFromHtml,
  guessedCandidates,
  athleticsCandidates,
  candidatesFromIdentity,
  siteIdentifiesAs,
} from "./athletics-site";

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

// ── Værtsnavne ───────────────────────────────────────────────────────────────
ok(looksLikeAthleticsHost("hornetathletics.com"), "athletics i navnet");
ok(looksLikeAthleticsHost("aamusports.com"), "sports i navnet");
ok(looksLikeAthleticsHost("gocards.com"), "go-konventionen (Louisville)");
ok(looksLikeAthleticsHost("gozips.com"), "go-konventionen (Akron)");
ok(looksLikeAthleticsHost("athletics.uindy.edu"), "athletics som subdomæne");

// Dem der ville have ødelagt det: leverandører, medier, sociale medier.
ok(!looksLikeAthleticsHost("google.com"), "google.com er ikke et atletiksite");
ok(!looksLikeAthleticsHost("go.com"), "go.com er for kort til go-mønsteret");
ok(!looksLikeAthleticsHost("espn.com"), "ESPN afvises");
ok(!looksLikeAthleticsHost("sports.yahoo.com"), "Yahoo Sports afvises trods 'sports'");
ok(!looksLikeAthleticsHost("cbssports.com"), "CBS Sports afvises");
ok(!looksLikeAthleticsHost("sidearmsports.com"), "platform-leverandøren er ikke skolen");
ok(!looksLikeAthleticsHost("prestosports.com"), "PrestoSports er ikke skolen");
ok(!looksLikeAthleticsHost("athletic.net"), "athletic.net er et resultatarkiv");
ok(!looksLikeAthleticsHost("twitter.com"), "sociale medier afvises");
ok(!looksLikeAthleticsHost("www.ncaa.com"), "ncaa.com afvises");

// ── Kandidater fra universitetets side ───────────────────────────────────────
const UNI = `<!doctype html><html><body>
  <a href="https://www.kzoo.edu/admission/">Admission</a>
  <a href="https://espn.com/college-sports">ESPN</a>
  <a href="https://twitter.com/kzoo">Twitter</a>
  <a href="https://hornetathletics.com/sports/mens-soccer/roster">Men's Soccer Roster</a>
  <a href="https://hornetathletics.com/index.aspx">Athletics</a>
  <a href="https://someboosterclub.com/donate">Donate</a>
</body></html>`;
const cands = candidatesFromHtml(UNI, "https://www.kzoo.edu");
eq(cands, ["https://hornetathletics.com"], "kun atletikværten, og kun én gang");

// Sti-fundet skal RANGERE FØRST, også når et markør-navn optræder tidligere.
const MIXED = `<html><body>
  <a href="https://sportscamp.example.edu/summer">Sports camp</a>
  <a href="https://gopanthers.com/sports/womens-golf/schedule">Golf schedule</a>
</body></html>`;
eq(
  candidatesFromHtml(MIXED, "https://www.example.edu")[0],
  "https://gopanthers.com",
  "et link til /sports/<hold>/roster|schedule vejer tungere end et navn",
);

// Universitetets egen vært er ikke et fund — vi kom derfra.
const SELF = `<html><body><a href="https://www.example.edu/sports/mens-soccer/roster">Roster</a></body></html>`;
eq(candidatesFromHtml(SELF, "https://www.example.edu"), [], "egen vært tælles ikke");

// Ingen brugbare links → tom liste (kalderen falder tilbage på gæt).
eq(candidatesFromHtml("<html><body>ingen links</body></html>", "https://x.edu"), [], "ingen links");
eq(candidatesFromHtml('<a href="mailto:a@b.dk">mail</a>', "https://x.edu"), [], "mailto ignoreres");

// ── Gæt ──────────────────────────────────────────────────────────────────────
eq(
  guessedCandidates("https://www.kzoo.edu"),
  ["https://athletics.kzoo.edu", "https://sports.kzoo.edu", "https://kzoo.edu/athletics"],
  "de tre mønstre der er værd at prøve",
);
eq(guessedCandidates("ikke en url"), [], "ugyldig URL giver ingen gæt");

// ── Samlet rækkefølge ────────────────────────────────────────────────────────
const all = athleticsCandidates(UNI, "https://www.kzoo.edu");
eq(all[0], "https://hornetathletics.com", "fund før gæt");
ok(all.includes("https://athletics.kzoo.edu"), "gættene er stadig med");
eq(new Set(all).size, all.length, "ingen dubletter");

// ── Kandidater uden hovedside (NJCAA, 31/8) ─────────────────────────────────
// 442 junior colleges har hverken website eller athletics_url — kun navn og
// kælenavn. Monroe er facit vi kender: monroeumustangs.com er deres RIGTIGE
// adresse, fundet i hånden da Sebastian Tirsgaard Larsen skulle oprettes.
const monroe = candidatesFromIdentity("Monroe University", "Mustangs");
ok(monroe.includes("https://monroeumustangs.com"), "Monroes rigtige adresse er blandt forslagene");
ok(monroe.includes("https://gomustangs.com"), "go+kælenavn er med");
eq(new Set(monroe).size, monroe.length, "ingen dubletter");
eq(candidatesFromIdentity("Monroe University", null), [], "uden kælenavn: ingen gæt");
eq(candidatesFromIdentity("Monroe University", "  "), [], "tomt kælenavn: ingen gæt");

// Institutionsord må ikke blive til domænenavnet.
const nwk = candidatesFromIdentity("Northwest Kansas Technical College", "Mavericks");
ok(nwk.every((u) => !u.includes("collegemavericks")), "«college» bruges ikke som skolenavn");
ok(nwk.some((u) => u.includes("northwest")), "første rigtige ord bruges");

// Reglen der gælder hele modulet: forslag, ikke sandhed.
ok(monroe.every((u) => u.startsWith("https://")), "kandidater er absolutte URL'er");

// ── Sitet skal sige at det ER skolen (31/8) ─────────────────────────────────
// saintsathletics.com bestod hold-prøven for Lurleen B. Wallace Community
// College med 33 hold. Sitet tilhører St. Lawrence University. Uden denne
// prøve ville en fremmed skoles atleter være blevet skrevet ind som vores.
const stLawrence = '<meta property="og:site_name" content="St. Lawrence University Athletics"> Saints';
ok(
  !siteIdentifiesAs(stLawrence, "Lurleen B. Wallace Community College", "Andalusia"),
  "fremmed site med samme kælenavn afvises",
);
ok(
  siteIdentifiesAs("<title>LBW Saints — Lurleen B. Wallace Athletics</title>", "Lurleen B. Wallace Community College", "Andalusia"),
  "skolens eget navn genkendes",
);
ok(
  siteIdentifiesAs("<title>Mustangs</title> Athletics in New Rochelle, NY", "Monroe University", "New Rochelle"),
  "byen tæller også som kendetegn",
);
ok(
  !siteIdentifiesAs("<title>Community College Athletics</title>", "Central Community College", "Columbus"),
  "kun institutionsord er ikke et kendetegn",
);

console.log(`\n${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
