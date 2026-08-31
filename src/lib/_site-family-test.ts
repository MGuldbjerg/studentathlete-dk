/**
 * Familielinjen i footeren: HVILKE sites må nævnes?
 * Kør: npx tsx src/lib/_site-family-test.ts
 *
 * Linjen er to ting på én gang — en oplysning til læseren og det eneste link
 * mellem to domæner der for en crawler er fremmede for hinanden. Begge dele
 * gør det farligt at nævne et site der er dark launch: spærren er netop at
 * ingen skal finde derhen endnu.
 */
import { COUNTRIES } from "./countries";
import { liveSites, siteIsLive, siteBaseUrl } from "./site";
import { languagePack } from "./i18n";

let passed = 0;
let failed = 0;
function expect(label: string, got: unknown, want: unknown): void {
  if (Object.is(got, want)) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

// Reglen, ikke dagens landeliste — så testen stadig måler noget den dag et
// nyt land er dark launch.
expect("live: uden flag er sitet live", siteIsLive({}), true);
expect("live: dark launch er ikke live", siteIsLive({ darkLaunch: true }), false);
expect("live: darkLaunch=false er live", siteIsLive({ darkLaunch: false }), true);

const codes = liveSites().map((c) => c.code);
expect("familie: DK er med", codes.includes("DK"), true);
expect("familie: UK er med (ude af dark launch 21/8)", codes.includes("UK"), true);
expect("familie: ingen dark launch-sites slipper med", liveSites().every(siteIsLive), true);
expect("familie: koderne er unikke (de ER etiketten i footeren)", new Set(codes).size, codes.length);

// Linket skal pege på sitets EGET domæne — ikke på standardsitet.
for (const c of liveSites()) {
  expect(`familie: ${c.code} linker til sit eget domæne`, siteBaseUrl(c), `https://${c.host}`);
  expect(`familie: ${c.code} har en sprogpakke til hrefLang`, languagePack(c.language).ui["footer.family"] !== undefined, true);
}

// Teksten findes på begge sprog — en manglende oversættelse ville ellers vise
// den danske streng på det britiske site.
for (const [code, pack] of Object.entries({ da: languagePack("da"), en: languagePack("en") })) {
  expect(`familie: ${code} har sin egen tekst`, pack.ui["footer.family"].length > 0, true);
}
expect(
  "familie: dansk og engelsk er IKKE samme streng",
  languagePack("da").ui["footer.family"] === languagePack("en").ui["footer.family"],
  false,
);
expect("familie: alle lande er kendt i registret", liveSites().every((c) => COUNTRIES[c.code] === c), true);

console.log(`\nsite-family: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
