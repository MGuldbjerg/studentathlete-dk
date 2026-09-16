/**
 * Test of the handle harvest.
 *
 * Every case below is a real handle from the 52 British bio pages sampled on
 * 16 September 2026. The danger here is not missing a handle — it is keeping a
 * wrong one, because the next step is a human following a stranger under the
 * site's name. So most of these are rejections.
 */
import {
  extractInstagramHandles,
  looksInstitutional,
  matchesName,
  pickHandle,
  rejectedSet,
} from "./scrape-instagram";

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

// ── Udtræk ───────────────────────────────────────────────────────────────────
eq(
  extractInstagramHandles(
    `<a href="https://www.instagram.com/joebrayson9/">IG</a>
     <a href="http://instagram.com/gwsports">Dept</a>`,
  ),
  ["joebrayson9", "gwsports"],
  "begge anker-handles findes",
);
eq(
  extractInstagramHandles(`<a href="https://www.instagram.com/p/DM1x9kXoQ/">Opslag</a>`),
  [],
  "instagram.com/p/ er et opslag, ikke en konto",
);
eq(
  extractInstagramHandles(
    `<a href="https://instagram.com/Bryant_Rowing">A</a><a href="https://instagram.com/bryant_rowing">B</a>`,
  ),
  ["Bryant_Rowing"],
  "samme handle i to stavemåder tælles én gang",
);
eq(
  extractInstagramHandles(`Følg @francescajbaber på Instagram`),
  [],
  "handle i brødtekst uden link tælles ikke",
);
// Sidearm sætter sin egen base foran det atleten selv skrev. Læst forfra hedder
// handlen "https" — 39 atleter blev filet sådan i første kørsel.
eq(
  extractInstagramHandles(
    `<a href="https://www.instagram.com/https://www.instagram.com/eva_isabel_/">IG</a>`,
  ),
  ["eva_isabel_"],
  "dobbelt-præfikset URL pakkes ud til det atleten skrev",
);
eq(
  extractInstagramHandles(`<a href="https://www.instagram.com/https://x.com/someone">IG</a>`),
  [],
  "dobbelt-præfiks om et ANDET site efterlader kun skemaet — og det er ingen",
);
eq(
  extractInstagramHandles(
    `<a href="/api/v2/promotions/840/click?redirect=https%3a%2f%2fwww.instagram.com%2fcusepics%2f">Foto</a>`,
  ),
  [],
  "URL-kodet reklame-viderestilling er ikke et anker til en atlet",
);

// ── Institutionelle konti ────────────────────────────────────────────────────
ok(looksInstitutional("bryanthoops", "Bryant University"), "skolenavn + sportsord");
ok(looksInstitutional("yalefencing", "Yale University"), "skolenavn + sportsgren");
ok(looksInstitutional("fsc_waterski", "Florida Southern College"), "forkortelse + sportsgren");
ok(looksInstitutional("gothunderwolves", "Colorado State University–Pueblo"), "kaldenavn uden skolenavn");
ok(!looksInstitutional("hiangusdavies", "University of California, Berkeley"), "personligt handle slipper igennem");

// ── Navnematch ───────────────────────────────────────────────────────────────
ok(matchesName("francescajbaber", "Francesca Baber"), "fornavn + initial + efternavn");
ok(matchesName("_boprice", "Bo Price"), "efternavn med understreg foran");
ok(matchesName("joebrayson9", "Joe Brayson"), "efternavn med tal efter");
ok(matchesName("hiangusdavies", "Angus Davies"), "efternavn midt i handlen");
ok(!matchesName("stagsvb", "Matthew Ground"), "holdkonto matcher ikke navnet");
ok(!matchesName("bryantbowl", "Bo Price"), "'bo' er for kort til at bære et match alene");

// ── Valget ───────────────────────────────────────────────────────────────────
eq(
  pickHandle(["gwsports", "joebrayson9"], "Joe Brayson", "The George Washington University", new Set()),
  { handle: "joebrayson9", confidence: "name_match" },
  "navnematchet vinder over holdkontoen",
);
eq(
  pickHandle(["eva_isabel_"], "Eva Barker", "Syracuse University", new Set()),
  { handle: "eva_isabel_", confidence: "unverified" },
  "plausibelt men ubevist handle stilles til gennemsyn",
);
eq(
  pickHandle(["cuse", "cuseWLAX"], "Eva Barker", "Syracuse University", new Set(["cuse"])),
  null,
  "chrome-konti og holdkonti efterlader intet",
);
eq(
  pickHandle(["thelocalcafe", "sunsetphotos"], "Eva Barker", "Syracuse University", new Set()),
  null,
  "to anonyme kandidater er et møntkast, ikke et fund",
);
// Athletes whose surname IS the school's: the name match must survive the filter.
eq(
  pickHandle(["bryantufootball", "jakebryant"], "Jake Bryant", "Bryant University", new Set()),
  { handle: "jakebryant", confidence: "name_match" },
  "efternavn = skolenavn filtreres ikke væk",
);

// ── Afviste handles (migration-054) ──────────────────────────────────────────
eq(
  pickHandle(
    ["joebrayson9"],
    "Joe Brayson",
    "The George Washington University",
    new Set(),
    rejectedSet("joebrayson9"),
  ),
  null,
  "et afvist handle vejes ikke igen — heller ikke når det matcher navnet",
);
eq(
  pickHandle(
    ["joebrayson9", "jbrayson10"],
    "Joe Brayson",
    "The George Washington University",
    new Set(),
    rejectedSet("JoeBrayson9"),
  ),
  { handle: "jbrayson10", confidence: "name_match" },
  "afvisningen gælder handlen, ikke atleten — næste kandidat må gerne vinde",
);
eq([...rejectedSet(" A_one , B.two ,, ")], ["a_one", "b.two"], "listen læses uafhængigt af mellemrum og store bogstaver");
eq([...rejectedSet(null)], [], "ingen afvisninger er en tom mængde, ikke en fejl");

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
