/**
 * Tests for the stats page: home-nation resolution and the counting.
 * Every hometown below is a real one from the UK athletes, 2026-09-28.
 */
import { explicitNation, learnTowns, resolveNation } from "../../src/lib/home-nation";
import { siteStats, genderOf } from "../../src/lib/athlete-stats";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// ── Not British: the wrong matches the audit found ──
for (const h of ["Torquay, Australia", "Doncaster East, Victoria, Austraila", "Grimsby, Ont.", "Woking, Alta.",
  "Wales, Mass.", "Torquay, Victoria, AUS", "Dublin, Ireland"]) {
  ok(explicitNation(h) === "not-uk", `not British: ${h}`);
}

// ── Stated outright, or on the short lists ──
ok(explicitNation("Durham, England") === "england", "England stated");
ok(explicitNation("Aberdeen, Scotland") === "scotland", "Scotland stated");
ok(explicitNation("Cardiff, Wales") === "wales", "Wales stated");
ok(explicitNation("Enniskillen, Co. Fermanagh") === "northern-ireland", "NI county");
ok(explicitNation("Omagh, Ireland") === "northern-ireland", "Omagh is Northern Ireland even when written 'Ireland'");
ok(explicitNation("Bellshill, United Kingdom") === "scotland", "Scottish town list");
ok(explicitNation("Swansea, U.K.") === "wales", "Welsh town list");
ok(explicitNation("London, U.K.") === null, "a plain UK town is left to the data layer");
ok(explicitNation("") === "unknown" && explicitNation(null) === "unknown", "empty hometown is unknown");

// ── Learned from our own data ──
const votes = learnTowns(["Bristol, England", "Bristol, England", "Richmond, England", "Richmond, Virginia"]);
ok(resolveNation("Bristol, United Kingdom", votes) === "england", "Bristol learned as English");
ok(resolveNation("Upminster, UK", votes) === "unknown", "unseen town stays unknown, not England");
ok(resolveNation("United Kingdom", votes) === "unknown", "just 'United Kingdom' is unknown");

// ── Gender ──
ok(genderOf({ sport: "field-hockey", division: null, gender: null, hometown: null }) === "f", "field hockey is women's");
ok(genderOf({ sport: "football", division: null, gender: null, hometown: null }) === "m", "football is men's");
ok(genderOf({ sport: "soccer", division: null, gender: null, hometown: null }) === "u", "soccer without gender stays unknown");
ok(genderOf({ sport: "football", division: null, gender: "f", hometown: null }) === "f", "a stored gender wins");

// ── Counting ──
const rows = [
  { sport: "soccer", division: "NCAA D1", gender: "m", hometown: "Leeds, England" },
  { sport: "soccer", division: "NCAA D2", gender: "f", hometown: "Leeds, United Kingdom" },
  { sport: "golf", division: "NCAA D1", gender: null, hometown: "Glasgow, Scotland" },
  { sport: "golf", division: "NCAA D1", gender: "f", hometown: "Wales, Mass." },
  { sport: "tennis", division: "NCAA D3", gender: "m", hometown: "Upminster, UK" },
];
const s = siteStats(rows, "UK");
ok(s.excluded === 1, "the American from Wales, Mass. is excluded");
ok(s.all.totals.total === 4, "UK total excludes them but keeps unknown nation");
ok(s.nationUnknown === 1, "Upminster counted as nation unknown");
ok(s.nations.england?.totals.total === 2, "Leeds, UK learned as England");
ok(s.nations.wales?.totals.total === 0, "Wales not inflated by Massachusetts");
ok(s.all.bySport[0].sport === "soccer" && s.all.bySport[0].f === 1 && s.all.bySport[0].m === 1, "sport split by gender");
ok(s.all.byDivision.map((d) => d.division).join(",") === "NCAA D1,NCAA D2,NCAA D3", "divisions in order");
const dk = siteStats(rows, "DK");
ok(dk.excluded === 0 && Object.keys(dk.nations).length === 0, "DK: no nation split, nothing excluded");

console.log(`athlete-stats: ${pass} ok, ${fail} fejl`);
if (fail) process.exit(1);
