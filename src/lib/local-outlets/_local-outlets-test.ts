import { matchOutlets, normaliseArea, hometownKeys, type OutletArea } from "./match";
let bad = 0;
const eq = (got: unknown, want: unknown, l: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) { bad++; console.error(`  ✗ ${l}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
};
eq(normaliseArea("Århus"), "aarhus", "å");
eq(normaliseArea("Ærø"), "aeroe", "æø");
eq(normaliseArea("St. Albans"), "stalbans", "dots/spaces");
eq(normaliseArea("Düsseldorf"), "dusseldorf", "diacritics");
eq(hometownKeys("Bath, Somerset, UK"), ["bath", "somerset", "uk"], "segments");
eq(hometownKeys(null), [], "null");
const areas: OutletArea[] = [
  { outletId: 1, areaKey: "ballerup", level: "town" },
  { outletId: 2, areaKey: "ballerup", level: "town" },
  { outletId: 3, areaKey: "denmark", level: "nation" },
  { outletId: 4, areaKey: "kent", level: "county" },
  { outletId: 5, areaKey: "maidstone", level: "town" },
  { outletId: 4, areaKey: "maidstone", level: "region" },
];
eq(matchOutlets("Ballerup, Denmark", areas), [1, 2], "town beats nation; nation dropped");
eq(matchOutlets("Skovlunde, Denmark", areas), [3], "nation only when nothing narrower");
eq(matchOutlets("Maidstone, Kent, England", areas), [5, 4], "town first, then county outlet once");
eq(matchOutlets("Nowhere", areas), [], "no match");
eq(matchOutlets(null, areas), [], "null hometown");
if (bad) { console.error(`${bad} failed`); process.exit(1); }
console.log("local-outlets: all passed");
