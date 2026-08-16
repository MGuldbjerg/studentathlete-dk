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

// ── Navne i markup tæller ikke som omtale (kladde #107, 2026-08-16) ─────────
// RSS-beskrivelsen fra goislanders.com begynder med atletens foto. Navnet stod
// i billedets alt-tekst og INTET andet sted — hverken i overskrift eller
// brødtekst. Alligevel blev der skrevet en hel artikel om hende.
blocked(
  {
    athleteName: "Mackenzie Mackreth",
    gender: "f",
    sport: "soccer",
    sourceText:
      'Soccer Hosts A&M-International on Sunday Night\n' +
      '<img alt="Mackenzie Mackreth" src="https://goislanders.com/common/controls/image_handler.aspx?image_path=/images/2026/8/15/DSC00297__1_.jpg" /><br /><br />' +
      "CORPUS CHRISTI, Texas – The Texas A&M-Corpus Christi soccer team gets right back on the pitch after a thrilling season opener during the week, " +
      "heading into action on its home turf against Texas A&M International on Sunday at 7 p.m. The Islanders will be looking to build off of the momentum " +
      "they earned in the back half of their first match against Tarleton State.",
  },
  "kladde #107: fornavnet står KUN i en alt-tekst",
);

// Samme historie, men navnet står også i brødteksten → skal skrives.
allowed(
  {
    athleteName: "Mackenzie Mackreth",
    gender: "f",
    sport: "soccer",
    sourceText:
      '<img alt="Mackenzie Mackreth" src="/images/DSC00297.jpg" />' +
      "CORPUS CHRISTI, Texas – Mackenzie Mackreth played all 90 minutes at centre-back as the Islanders drew 2-2 with Tarleton State.",
  },
  "navnet står også i brødteksten",
);

// Markup må ikke kunne skjule en modsigelse: stedordene i teksten er stadig
// afgørende, når attributterne er væk.
blocked(
  {
    athleteName: "Josh Murray",
    gender: "m",
    sport: "soccer",
    sourceText:
      '<div class="card" title="Josh Murray photo gallery">' +
      "Bella Murray has been named assistant volleyball coach. Josh returns to the programme where she recorded 3,135 assists, " +
      "and her former coach praised her leadership. She begins in the autumn.</div>",
  },
  "attributter fjernet, men hunkønsstedordene i teksten blokerer stadig",
);

// stripMarkup må ikke ødelægge almindelig tekst med < og > eller HTML-entiteter.
allowed(
  {
    athleteName: "Toke Amtrup",
    gender: "m",
    sport: "soccer",
    sourceText:
      "Utah Valley senior defender Toke Amtrup has been named to the Big West Preseason Coaches&#39; Team. " +
      "He played all but 77 minutes in 2025 &amp; started every game.",
  },
  "HTML-entiteter afkodes, teksten overlever",
);

console.log(`\nidentity-guard: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
