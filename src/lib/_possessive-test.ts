/** Test of the possessive first name used in the profile's fan-shop box. */
import { firstName, possessive } from "./possessive";
import { t } from "./i18n";

let pass = 0, fail = 0;
function eq(a: string, b: string, label: string): void {
  if (a === b) pass++;
  else { fail++; console.log(`  ✗ ${label}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
}

eq(possessive("Kirstine", "da"), "Kirstines", "da: plain name");
eq(possessive("Thomas", "da"), "Thomas'", "da: ends in s");
eq(possessive("Max", "da"), "Max'", "da: ends in x");
eq(possessive("Toke", "da"), "Tokes", "da: Toke");
eq(possessive("Kirstine", "en"), "Kirstine's", "en: plain name");
eq(possessive("James", "en"), "James'", "en: ends in s");
eq(possessive("Max", "en"), "Max's", "en: x takes 's");
eq(firstName("Tajma Muharemovic"), "Tajma", "first name");
eq(firstName("  Noah   Anker "), "Noah", "first name, extra spaces");

// The whole box reads right in both languages.
const da = { first: "Kirstine", possessive: possessive("Kirstine", "da") };
eq(t("profile.merch_heading", "da", da), "Støt Kirstine", "da heading");
eq(t("profile.merch_button", "da", da), "Gå til Kirstines shop ↗", "da button");
eq(t("profile.merch_body", "da", da), "Merch med Kirstines navn. Kirstine får en del af hvert salg.", "da body");
const en = { first: "Kirstine", possessive: possessive("Kirstine", "en") };
eq(t("profile.merch_heading", "en", en), "Support Kirstine", "en heading");
eq(t("profile.merch_button", "en", en), "Visit Kirstine's shop ↗", "en button");
eq(t("profile.merch_via", "en", {}), "Sold through Influxer", "en via");

console.log(`possessive: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
