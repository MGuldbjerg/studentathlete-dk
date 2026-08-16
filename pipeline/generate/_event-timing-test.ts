/**
 * Test af forhåndsomtale-vagten.
 *
 * Den første sag er den VIRKELIGE kladde #107 fra 2026-08-16, med faktaarket
 * som det faktisk lå i basen. Består den, ville artiklen om en kamp der endnu
 * ikke var spillet aldrig være blevet skrevet. Resten handler om det modsatte
 * hensyn: vagten må ikke blokere en hædersbevisning eller et referat der lander
 * samme dag som begivenheden.
 */
import { checkEventTiming } from "./event-timing";

let passed = 0;
let failed = 0;

function blocked(input: Parameters<typeof checkEventTiming>[0], name: string) {
  const v = checkEventTiming(input);
  if (!v.ok) {
    passed++;
    console.log(`  ✓ blokeret: ${name}\n      → ${v.reason}`);
  } else {
    failed++;
    console.error(`✗ ${name}: BURDE være blokeret, men slap igennem`);
  }
}

function allowed(input: Parameters<typeof checkEventTiming>[0], name: string) {
  const v = checkEventTiming(input);
  if (v.ok) passed++;
  else {
    failed++;
    console.error(`✗ ${name}: burde være tilladt, men blev blokeret (${v.reason})`);
  }
}

// ── Den virkelige fejl ───────────────────────────────────────────────────────
// Story 2817: goislanders.com annoncerer kampen mod A&M-International søndag
// aften. Faktaarket blev bygget 16. august kl. 01:43 UTC; kampen sparkede i
// gang 17. august kl. 00:00 UTC. Artiklen blev skrevet kl. 07:54 UTC — i datid.
const kladde107 = {
  has_substance: true,
  event: { type: "soccer match", date: "2026-08-16", opponent: "Texas A&M International", competition: null },
  result: { final_score: null, outcome: null, placement: null },
  stats: [],
  qualitative: [],
  quotes: [],
  other_facts: [
    { text: "The match is TAMIU's first of two against Southland Conference opponents in 2026.", source: "prose" },
    { text: "Sunday's match can be watched live on ESPN+ with Steven King on the call.", source: "prose" },
  ],
  box_score_url: null,
};

blocked(
  { factSheet: kladde107, now: new Date("2026-08-16T07:54:44Z") },
  "kladde #107: kampannoncering skrevet 16 timer før kickoff",
);

blocked(
  { factSheet: JSON.stringify(kladde107), now: new Date("2026-08-16T07:54:44Z") },
  "samme faktaark som rå JSON-streng (sådan ligger det i stories.fact_sheet)",
);

blocked(
  { factSheet: kladde107, now: new Date("2026-08-15T02:00:00Z") },
  "kampen ligger en hel dag ude i fremtiden",
);

// ── Det modsatte hensyn: vagten må ikke æde de rigtige historier ─────────────

// Story 2752: Amtrup udtaget til Big West Preseason Coaches' Team. En
// hædersbevisning er FÆRDIG når den offentliggøres — også samme dag.
const kladde105 = {
  has_substance: true,
  event: { type: "preseason announcement", date: "2026-08-12", opponent: null, competition: "Big West Preseason Coaches' Team" },
  result: { final_score: null, outcome: null, placement: "named to Preseason Coaches' Team" },
  stats: [{ text: "played all but 77 total minutes in 2025", source: "prose" }],
  quotes: [],
  other_facts: [],
  box_score_url: null,
};

allowed(
  { factSheet: kladde105, now: new Date("2026-08-13T02:29:24Z") },
  "kladde #105: hædersbevisning dagen efter",
);
allowed(
  { factSheet: kladde105, now: new Date("2026-08-12T09:00:00Z") },
  "hædersbevisning SAMME dag (placement = udfald)",
);

allowed(
  {
    factSheet: {
      event: { type: "soccer match", date: "2026-08-16" },
      result: { final_score: "2-2", outcome: "draw", placement: null },
      stats: [],
    },
    now: new Date("2026-08-16T23:00:00Z"),
  },
  "referat samme dag: der ER en slutscore",
);

allowed(
  {
    factSheet: {
      event: { type: "meet", date: "2026-08-16" },
      result: { final_score: null, outcome: null, placement: null },
      stats: [{ text: "ran 10.31 in the 100m" }],
    },
    now: new Date("2026-08-16T23:00:00Z"),
  },
  "referat samme dag uden score, men med tal",
);

allowed(
  {
    factSheet: { event: { type: "soccer match", date: "2026-08-10" }, result: null, stats: [] },
    now: new Date("2026-08-16T07:00:00Z"),
  },
  "overstået kamp med tomt faktaark — ikke denne vagts problem",
);

// ── Konservativ ved manglende/ufortolkelige data ─────────────────────────────
allowed({ factSheet: null, now: new Date("2026-08-16T07:00:00Z") }, "intet faktaark");
allowed({ factSheet: undefined, now: new Date("2026-08-16T07:00:00Z") }, "faktaark undefined");
allowed({ factSheet: "{ ikke json", now: new Date("2026-08-16T07:00:00Z") }, "ulæselig JSON");
allowed(
  { factSheet: { event: { type: "soccer match", date: null }, result: null, stats: [] }, now: new Date("2026-08-16T07:00:00Z") },
  "ingen dato i faktaarket",
);
allowed(
  { factSheet: { event: { type: "soccer match", date: "søndag aften" }, result: null, stats: [] }, now: new Date("2026-08-16T07:00:00Z") },
  "dato er fritekst, ikke ISO",
);
allowed(
  { factSheet: { event: null, result: null, stats: [] }, now: new Date("2026-08-16T07:00:00Z") },
  "event er null",
);
allowed(
  { factSheet: { event: { date: "2026-13-45" }, result: null, stats: [] }, now: new Date("2026-08-16T07:00:00Z") },
  "umulig dato",
);

// Årsskifte: 31. december er overstået den 1. januar.
allowed(
  { factSheet: { event: { date: "2026-12-31" }, result: null, stats: [] }, now: new Date("2027-01-01T06:00:00Z") },
  "begivenhed 31/12 set fra 1/1",
);
blocked(
  { factSheet: { event: { date: "2027-01-01" }, result: null, stats: [] }, now: new Date("2026-12-31T23:00:00Z") },
  "begivenhed 1/1 set fra 31/12",
);

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
