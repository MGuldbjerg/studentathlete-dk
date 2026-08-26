/**
 * Tests for Sidearm-parserens kolonne-genkendelse.
 * Kør: npx tsx pipeline/scrape/parsers/_sidearm-test.ts
 *
 * Regressionen der udløste dem: Iona University's golf-roster har ingen
 * nummerkolonne, og med hardkodede indekser blev Freddie Tucker indlæst som
 * atleten "Jr." med positionen "6-0" (højde) og årgangen "175" (vægt).
 */

import { parseSidearm, mapColumns } from "./sidearm";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function eq<T>(actual: T, expected: T, msg: string): void {
  assert(actual === expected, `${msg} (fik ${JSON.stringify(actual)}, ville have ${JSON.stringify(expected)})`);
}

// ── mapColumns: overskrifterne bestemmer, ikke rækkefølgen ─────────────
const golf = mapColumns(["Name", "Yr.", "Ht.", "Wt.", "Hometown / High School", "Major"]);
eq(golf.name, 0, "golf: Name er kolonne 0");
eq(golf.year, 1, "golf: Yr. er kolonne 1");
eq(golf.hometown, 4, "golf: Hometown er kolonne 4");
eq(golf.position, null, "golf har ingen position-kolonne");

// "Ht." (højde) må ALDRIG forveksles med "Hometown" — det var halvdelen af fejlen.
assert(golf.hometown !== 2, "Ht. bliver ikke til hometown");

const team = mapColumns(["No.", "Name", "Pos.", "Yr.", "Hometown"]);
eq(team.name, 1, "holdsport: Name er kolonne 1");
eq(team.position, 2, "holdsport: Pos. er kolonne 2");
eq(team.year, 3, "holdsport: Yr. er kolonne 3");
eq(team.hometown, 4, "holdsport: Hometown er kolonne 4");

eq(mapColumns(["#", "Player", "Class", "Position", "Home City"]).name, 1, "Player tæller som navn");
eq(mapColumns(["#", "Player", "Class", "Position", "Home City"]).year, 2, "Class tæller som årgang");
eq(mapColumns(["#", "Player", "Class", "Position", "Home City"]).hometown, 4, "Home City tæller som hjemby");

// Ingen brugbar overskrift → det gamle mønster, som stadig er rigtigt for en
// nummereret holdsport-roster.
const noHeaders = mapColumns([]);
eq(noHeaders.name, 1, "uden overskrifter falder vi tilbage til indeks 1");
eq(noHeaders.position, 2, "fallback: position");
eq(mapColumns(["Foo", "Bar"]).name, 1, "ukendte overskrifter → fallback");

// ── Hele parseren på Ionas faktiske tabel-form ─────────────────────────
const ionaHtml = `
<div class="sidearm-roster">
<table class="sidearm-table">
  <thead><tr>
    <th>Name</th><th>Yr.</th><th>Ht.</th><th>Wt.</th>
    <th>Hometown / High School</th><th>Major</th>
  </tr></thead>
  <tbody>
    <tr>
      <td><a href="/sports/mens-golf/roster/freddie-tucker/1234">Freddie Tucker</a></td>
      <td>Jr.</td><td>6-0</td><td>175</td>
      <td>London, England / Bedford School</td><td>Undecided</td>
    </tr>
    <tr>
      <td><a href="/sports/mens-golf/roster/sahir-balyan/1235">Sahir Balyan</a></td>
      <td>Sr.</td><td>6-0</td><td>130</td>
      <td>Simi Valley, CA / Simi Valley</td><td>Business Analytics</td>
    </tr>
  </tbody>
</table>
</div>`;

const iona = parseSidearm(ionaHtml);
eq(iona.length, 2, "to spillere fundet");
eq(iona[0].name, "Freddie Tucker", "navnet er spillerens, ikke årgangen");
eq(iona[0].year, "Jr.", "årgangen er Jr., ikke vægten");
eq(iona[0].hometown, "London, England / Bedford School", "hjembyen er hjembyen");
eq(iona[0].position, null, "golf har ingen position — og højden er ikke en position");
eq(iona[0].bioUrl, "/sports/mens-golf/roster/freddie-tucker/1234", "bio-linket følger navnekolonnen");
eq(iona[1].name, "Sahir Balyan", "anden spiller læses også rigtigt");

// ── Den nummererede holdsport-tabel må ikke gå i stykker ───────────────
const soccerHtml = `
<table class="sidearm-table">
  <thead><tr><th>No.</th><th>Name</th><th>Pos.</th><th>Yr.</th><th>Hometown</th></tr></thead>
  <tbody><tr>
    <td>7</td>
    <td><a href="/roster/emma-jones/9">Emma Jones</a></td>
    <td>Forward</td><td>So.</td><td>Leeds, England</td>
  </tr></tbody>
</table>`;

const soccer = parseSidearm(soccerHtml);
eq(soccer.length, 1, "holdsport: én spiller");
eq(soccer[0].name, "Emma Jones", "holdsport: navnet");
eq(soccer[0].position, "Forward", "holdsport: positionen");
eq(soccer[0].year, "So.", "holdsport: årgangen");
eq(soccer[0].hometown, "Leeds, England", "holdsport: hjembyen");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
