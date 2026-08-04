/**
 * Unit-tests for hometown-klassifikationen mod UK-profilen.
 * Kør: npx tsx pipeline/lib/_hometown-uk-test.ts
 *
 * UK er langt farligere end DK: næsten alle store britiske bynavne findes også
 * som byer i USA/Canada (London KY/Ontario, Birmingham AL, Manchester NH,
 * Boston MA, Scotland PA, Wales WI …). Strategien er markers-først
 * ("X, England") + kort byliste uden navnebrødre — disse tests låser den.
 * Formaterne i TRUE-sektionen er ægte strenge fra international_athletes.
 */
import { matchesCountry, classifyHometown } from "../../src/lib/hometown";
import { uk } from "../../src/lib/countries/uk";
import { activeCountries } from "../../src/lib/countries";

const isUkHometown = (h: string | null) => matchesCountry(h, uk);

let passed = 0;
let failed = 0;

function expect(hometown: string | null, want: boolean, label: string): void {
  const got = isUkHometown(hometown);
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: isUkHometown(${JSON.stringify(hometown)}) = ${got}, forventede ${want}`);
  }
}

// ── Skal være TRUE (ægte britiske formater fra kataloget) ────────────────────
expect("London, England", true, "London, England (marker bærer — byen er ikke i listen)");
expect("Worcester, United Kingdom", true, "Worcester, United Kingdom");
expect("Wales, Great Britain", true, "Wales, Great Britain");
expect("Falkirk, Scotland", true, "Falkirk, Scotland");
expect("Belfast, Northern Ireland", true, "Belfast, Northern Ireland");
expect("Motherwell, Scotland", true, "Motherwell, Scotland");
expect("Milton Keynes, United Kingdom", true, "Milton Keynes, United Kingdom");
expect("Henley, United Kingdom", true, "Henley, United Kingdom");
expect("St. Andrews, Scotland", true, "St. Andrews, Scotland");
expect("Greater Manchester, England", true, "Greater Manchester, England");
expect("London, U.K.", true, "London, U.K. (punktum-variant)");
expect("London, UK", true, "London, UK");
expect("Cardiff, Wales", true, "Cardiff, Wales (marker — Cardiff selv er udeladt pga. Cardiff, CA)");
expect("Boston, England", true, "Boston, England (Lincolnshire — marker slår navnebror)");
expect("Birmingham, England", true, "Birmingham, England");
expect("Kent, England", true, "grevskab + marker");
expect("Huddersfield", true, "bar entydig by fra listen");
expect("Wolverhampton", true, "bar entydig by fra listen (2)");
expect("Llanelli, Wales", true, "walisisk by + marker");
expect("Enniskillen", true, "bar nordirsk by fra listen");

// ── Skal være FALSE (navnebrødre i USA/Canada/Australien) ────────────────────
expect("Sydney, New South Wales", false, "New South Wales må ikke matche Wales");
expect("Sydney, New South Wales, Australia", false, "NSW med Australia-suffiks");
expect("Scotland, PA", false, "Scotland, Pennsylvania");
expect("Scotland Neck, N.C.", false, "Scotland Neck, North Carolina");
expect("Scotland, Ontario", false, "Scotland, Ontario (Canada — ingen US-stat-guard)");
expect("London, KY", false, "London, Kentucky");
expect("London, Ohio", false, "London, Ohio (fuldt statsnavn)");
expect("London, Ontario", false, "London, Ontario (Canada)");
expect("London", false, "bar 'London' klassificeres BEVIDST ikke (tvetydig)");
expect("Birmingham, Ala.", false, "Birmingham, Alabama");
expect("Manchester, NH", false, "Manchester, New Hampshire");
expect("Boston, Mass. / Boston Latin", false, "Boston med skolesegment");
expect("Boston", false, "bar 'Boston' klassificeres ikke");
expect("Wales, WI", false, "Wales, Wisconsin");
expect("England, AR", false, "England, Arkansas");
expect("New England, N.D.", false, "New England, North Dakota");
expect("New England", false, "bar 'New England' (mønster, ingen stat)");
expect("New Britain, Conn.", false, "New Britain, Connecticut");
expect("New Britain", false, "bar 'New Britain' (mønster)");
expect("Londonderry, NH", false, "Londonderry, New Hampshire");
expect("Bangor, Maine", false, "Bangor, Maine");
expect("Leeds, AL", false, "Leeds, Alabama");
expect("York, PA", false, "York, Pennsylvania");
expect("Cambridge, Mass.", false, "Cambridge, Massachusetts");
expect("Oxford, Miss.", false, "Oxford, Mississippi");
expect("Glasgow, KY", false, "Glasgow, Kentucky");
expect("Edinburgh, Indiana", false, "Edinburgh, Indiana");
expect("Dundee, Mich.", false, "Dundee, Michigan");
expect("Aberdeen, S.D.", false, "Aberdeen, South Dakota");
expect("Perth, N.Y.", false, "Perth, New York");
expect("Hamilton, Ohio", false, "Hamilton, Ohio");
expect("Bristol, Conn.", false, "Bristol, Connecticut");
expect("Laurinburg, N.C. / Scotland HS", false, "Scotland High School-segment");
expect("Scotland High School", false, "Scotland High School uden stat (mønster)");
expect("Victoria, British Columbia", false, "British Columbia (Canada-mønster)");

// ── Edge cases ───────────────────────────────────────────────────────────────
expect(null, false, "null hometown");
expect("", false, "tom streng");

// ── To lande i registret samtidig ────────────────────────────────────────────
// Nu hvor både DK og UK er aktive, afgør `classifyHometown` hvilket site en
// atlet havner på. Krydsforurening her ville sende en brite ind på det danske
// site (eller omvendt) — værre end at misse atleten helt.
function code(hometown: string | null): string | null {
  return classifyHometown(hometown, activeCountries());
}

function expectCode(hometown: string | null, want: string | null, label: string): void {
  const got = code(hometown);
  if (got === want) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}: classifyHometown(${JSON.stringify(hometown)}) = ${got}, forventede ${want}`);
  }
}

expectCode("Aarhus, Denmark", "DK", "dansker forbliver dansk");
expectCode("København, Danmark", "DK", "dansk stavemåde");
expectCode("Helsingør", "DK", "dansk by uden landemarker");
expectCode("London, England", "UK", "brite bliver britisk");
expectCode("Falkirk, Scotland", "UK", "skotte");
expectCode("Cardiff, Wales", "UK", "waliser");
expectCode("Belfast, Northern Ireland", "UK", "nordirer");
expectCode("Milton Keynes", "UK", "britisk by uden landemarker");
expectCode("Stockholm, Sweden", null, "svensker hører til ingen af sitene");
expectCode("Oslo, Norway", null, "nordmand");
expectCode("Dublin, Ireland", null, "irer er IKKE britisk (eget marked)");
expectCode("Sydney, New South Wales", null, "australier fanges ikke af Wales");
expectCode("London, Ontario", null, "canadier fanges ikke af London");
expectCode("Denmark, SC", null, "US-by ved navn Denmark");
expectCode("Scotland, PA", null, "US-by ved navn Scotland");
expectCode(null, null, "null");

console.log(`\nisUkHometown: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
