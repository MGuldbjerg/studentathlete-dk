/** Tests for the Influxer store check. Run: npx tsx pipeline/profiles/_merch-stores-test.ts */
import { pageMatches, slugCandidates, storeSchool } from "./merch-stores";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

expect("plain name", slugCandidates("Noah Anker"), ["noah-anker"]);
expect("ø both ways (dropped, Shopify writes a hyphen)", slugCandidates("Jonathan Støvring"), ["jonathan-stovring", "jonathan-st-vring"]);
expect("accents folded", slugCandidates("Tajma Muharemović"), ["tajma-muharemovic"]);

// A store page carries every school in its navigation data; only the heading counts.
const page = (title: string, school: string) =>
  `<title>${title} | Shop ${title} NIL Apparel</title><h1 class="sr-only">${school} Apparel</h1>` +
  `{"Portland State University":{"sports":[]},"Alfred University":{"sports":[]}}`;
const anker = page("Noah Anker", "East Tennessee State University");
expect("the store's school is the heading", storeSchool(anker), "East Tennessee State University");
expect("name and school match", pageMatches(anker, "Noah Anker", "East Tennessee State University"), true);
expect("a school only in the navigation data does not", pageMatches(anker, "Noah Anker", "Portland State University"), false);
expect("another athlete's store does not", pageMatches(anker, "Kirstine Munk", "East Tennessee State University"), false);
expect("Saint vs St. counts as the same school", pageMatches(page("Daniel Helle", "St. Bonaventure University"), "Daniel Helle", "Saint Bonaventure University"), true);
expect("no heading, no match", pageMatches(`<title>Noah Anker | Shop</title>`, "Noah Anker", "East Tennessee State University"), false);
expect("the «Visit … shop» link is the fallback", storeSchool(`<a aria-label="Visit Adelphi University shop">`), "Adelphi University");

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
