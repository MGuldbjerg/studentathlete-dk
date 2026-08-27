/** Test af grupperingen: én artikel pr. (kilde, land). */
import { groupBySourceAndCountry, type GroupableStory } from "./group-stories";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const S = (id: number, url: string, country: string, rel: number): GroupableStory =>
  ({ id, source_url: url, home_country: country, relevance_score: rel });

// Den virkelige sag: ét referat, tre briter og én dansker.
const bonnies = [
  S(3084, "gobonnies/niagara", "UK", 90), // Macfarlane
  S(3420, "gobonnies/niagara", "UK", 90), // Steel
  S(3422, "gobonnies/niagara", "UK", 90), // Holt
  S(3421, "gobonnies/niagara", "DK", 90), // Helle
];
const r = groupBySourceAndCountry(bonnies);
ok(r.primaries.length === 2, "tre briter + én dansker giver TO artikler");
ok(r.primaries.filter((p) => p.home_country === "UK").length === 1, "kun én britisk artikel");
ok(r.primaries.filter((p) => p.home_country === "DK").length === 1, "danskeren beholder sin egen");
const ukPrimary = r.primaries.find((p) => p.home_country === "UK")!;
ok(ukPrimary.id === 3084, "laveste id bryder uafgjort ved samme relevans");
ok((r.companions.get(3084) ?? []).length === 2, "de to øvrige briter er ledsagere");
ok(!r.companions.has(3421), "danskeren har ingen ledsagere");

// Relevans vinder over id.
const rel = groupBySourceAndCountry([S(9, "u", "UK", 35), S(10, "u", "UK", 90)]);
ok(rel.primaries[0].id === 10, "højeste relevans bærer artiklen");
ok((rel.companions.get(10) ?? [])[0].id === 9, "den svage bliver ledsager");

// Forskellige kilder må ALDRIG slås sammen.
const two = groupBySourceAndCountry([S(1, "a", "UK", 90), S(2, "b", "UK", 90)]);
ok(two.primaries.length === 2, "to kilder giver to artikler");
ok(two.companions.size === 0, "ingen ledsagere på tværs af kilder");

// Determinisme: samme input, samme valg — uanset rækkefølge ind.
const shuffled = groupBySourceAndCountry([...bonnies].reverse());
ok(
  shuffled.primaries.find((p) => p.home_country === "UK")!.id === 3084,
  "rækkefølgen ind ændrer ikke hvem der bærer artiklen",
);

ok(groupBySourceAndCountry([]).primaries.length === 0, "tom liste");

console.log(`\ngroupBySourceAndCountry: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
