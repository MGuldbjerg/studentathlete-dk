/**
 * Test af identitetsvagten.
 *
 * De to første sager er de VIRKELIGE kladder fra 2026-08-06, med tekst fra de
 * rigtige kilder. Består de, ville de to forkerte artikler aldrig være blevet
 * skrevet. Resten af testene handler om det modsatte hensyn: vagten må ikke
 * blokere en historie der bare er kortfattet.
 */
import { checkStoryIdentity, hasUnsourcedQuote } from "./identity-guard";

let passed = 0;
let failed = 0;

function blocked(input: Parameters<typeof checkStoryIdentity>[0], name: string) {
  const v = checkStoryIdentity(input);
  if (!v.ok) {
    passed++;
    console.log(`  ✓ blokeret: ${name}\n      → ${v.reason}`);
  } else {
    failed++;
    console.error(`✗ ${name}: BURDE være blokeret, men slap igennem`);
  }
}

function allowed(input: Parameters<typeof checkStoryIdentity>[0], name: string) {
  const v = checkStoryIdentity(input);
  if (v.ok) passed++;
  else {
    failed++;
    console.error(`✗ ${name}: burde være tilladt, men blev blokeret (${v.reason})`);
  }
}

function eq(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) passed++;
  else {
    failed++;
    console.error(`✗ ${name}: fik ${actual}, forventede ${expected}`);
  }
}

// ── De to virkelige fejl ─────────────────────────────────────────────────────
blocked(
  {
    athleteName: "Iolo Grant",
    gender: "m",
    sport: "track-and-field",
    sourceText:
      "Northeastern Athletics Unveils 2026 Hall Of Fame Class. Paul Grant was a four-time individual champion in the pole vault at the New England Indoor Championships. He was a member of the Northeastern men's track and field team that won five straight New England indoor crowns.",
  },
  "Hall of Fame om Paul Grant → kladde om Iolo Grant",
);

blocked(
  {
    athleteName: "Josh Murray",
    gender: "m",
    sport: "soccer",
    sourceText:
      "Murray Announced as Graduate Assistant Volleyball Coach. She has been around the programme and seen the transition between head coaches. Bella has always expressed a desire to pursue coaching throughout her time here. She recorded 3,135 assists and 863 digs in volleyball.",
  },
  "Bella Murray (volleyball) → kladde om Josh Murray (fodbold)",
);

// ── Ægte historier må ikke blokeres ─────────────────────────────────────────
allowed(
  {
    athleteName: "Olatunde Mkparu",
    gender: null,
    sport: "football",
    sourceText:
      "WILLIAMS AND MKPARU NAMED PHIL STEELE PRESEASON ALL-AMERICANS. Olatunde Mkparu, a senior defensive back for the Bryant football team, recorded career-highs in interceptions.",
  },
  "rigtig historie om Mkparu",
);

allowed(
  {
    athleteName: "Marie Eline Madsen",
    gender: "f",
    sport: "golf",
    sourceText:
      "Marie Eline Madsen named unanimous All-American. She finished the golf season with a 71.2 stroke average.",
  },
  "kvindelig golfspiller med hunkønsstedord",
);

// Kort kilde uden stedord og uden sportsord: må IKKE blokeres — vagten
// blokerer kun ved konkret modsigelse, ikke ved manglende oplysninger.
allowed(
  {
    athleteName: "George Cordall",
    gender: "m",
    sport: "golf",
    sourceText: "Zielinski and Cordall named 2025-26 All-America Scholars. George Cordall earned the honour.",
  },
  "kort kilde uden sportsord",
);

// En mand omtalt i en tekst der også nævner kvinder må ikke blokeres.
allowed(
  {
    athleteName: "Casper Puggaard",
    gender: "m",
    sport: "swimming-and-diving",
    sourceText:
      "Casper Puggaard won the 200 free. He touched first. On the women's side, she led from the start and her time was a personal best.",
  },
  "blandede stedord → ingen entydig modsigelse",
);

// Sport nævnt korrekt → ingen blokering, selv om en anden sport også omtales.
allowed(
  {
    athleteName: "Frederik Jellum",
    gender: "m",
    sport: "basketball",
    sourceText:
      "Frederik Jellum scored 18 in the basketball win. The football team also plays this weekend, and the football programme announced its schedule.",
  },
  "egen sport nævnt → anden sport er ligegyldig",
);

blocked(
  { athleteName: "Anders Nielsen", gender: "m", sport: "golf", sourceText: "   " },
  "tom kildetekst",
);

// ── Opfundne citater ────────────────────────────────────────────────────────
eq(
  hasUnsourcedQuote(
    'Speaking on the day, the coach noted: "Olatunde has been a consistent performer in our defensive backfield, and his leadership will be vital."',
    0,
  ),
  true,
  "citat i teksten + nul citater i faktaarket → opfundet",
);
eq(
  hasUnsourcedQuote('The coach called him a "leader" after the match.', 0),
  false,
  "et enkelt ord i anførselstegn er ikke et citat",
);
eq(
  hasUnsourcedQuote('"This is a long and genuine quotation from the source," she said.', 2),
  false,
  "faktaarket HAR citater → intet at anmærke",
);
eq(hasUnsourcedQuote("Ingen anførselstegn overhovedet.", 0), false, "ingen citater");

console.log(`\nidentity-guard: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
