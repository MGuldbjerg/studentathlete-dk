/**
 * Kortets formater og sprog.
 * Kør: npx tsx src/lib/_og-card-test.ts
 *
 * Den vigtigste test her er sproget. Kortet var omhyggeligt sprogstyret på
 * chip og dato, men modstander-linjen sagde «mod» på ALLE sprog — så de
 * britiske delekort stod live med «mod Brown» i stedet for «vs Brown».
 * Fejlen slap forbi både `_no-danish-in-jsx-test` (den skanner JSX, og det her
 * er et plain-object-træ) og `_ui-strings-test` (strengen var aldrig en
 * ui-nøgle). Derfor denne: den læser den FÆRDIGE tekst ud af elementtræet.
 */
import {
  CARD_FORMATS,
  buildMatchCardElement,
  localizedEventDate,
  localizedOutcome,
  parseCardFacts,
  type CardData,
  type CardFormat,
  type OgElement,
} from "./og-card";
import { cardBlobKey, igCardBlobKey, CARD_VERSION } from "./seo";

let passed = 0;
let failed = 0;

function expect(label: string, got: unknown, want: unknown): void {
  if (Object.is(got, want)) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

/** Al tekst i træet, fladt — så en test kan spørge «står der vs?». */
function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as OgElement).props.children);
  }
  return "";
}

const base: CardData = {
  title: "Testartikel",
  country: "DK",
  athlete_name: "Emma Hansen",
  sport: "soccer",
  university: "Hofstra University",
  primary_color: "#00205B",
  fact_sheet: JSON.stringify({
    event: { opponent: "Brown", competition: null, date: null },
    result: { final_score: "Brown 2 - Hofstra 1", outcome: "Loss" },
  }),
  created_at: "2026-09-13 12:00:00",
};

// ── Sproget på modstander-linjen ─────────────────────────────────────────────
const dk = textOf(buildMatchCardElement(base, "data:,", 1));
const uk = textOf(buildMatchCardElement({ ...base, country: "UK" }, "data:,", 1));
expect("dansk kort siger «mod»", dk.includes("mod Brown"), true);
expect("britisk kort siger «vs»", uk.includes("vs Brown"), true);
expect("britisk kort siger IKKE «mod»", uk.includes("mod Brown"), false);
// Samme regel gælder portrættet — sproget hænger på artiklen, ikke på lærredet.
expect(
  "portræt arver sproget",
  textOf(buildMatchCardElement({ ...base, country: "UK" }, "data:,", 1, "portrait")).includes("vs Brown"),
  true,
);

// ── Faktaarket er amerikansk; kortet er ikke ────────────────────────────────
// fact_sheet skrives på KILDENS sprog: {"outcome":"win","date":"Sep. 01, 2026"}.
// Begge stod uoversat på danske kort indtil 2026-09-15 — usynligt, fordi de ser
// rigtige ud på de britiske, og næsten alt nyt er britisk.
expect("udfald: win → Sejr på dansk", localizedOutcome("win", "da"), "Sejr");
expect("udfald: win → Win på engelsk", localizedOutcome("win", "en"), "Win");
expect("udfald: Loss normaliseres", localizedOutcome("Loss", "da"), "Nederlag");
expect("udfald: draw → Uafgjort", localizedOutcome("draw", "da"), "Uafgjort");
expect("udfald: ukendt tekst tabes ikke", localizedOutcome("2nd of 14", "da"), "2nd of 14");
expect("udfald: null forbliver null", localizedOutcome(null, "da"), null);

expect("dato: US-format bliver dansk", localizedEventDate("Sep. 01, 2026", "da"), "1. september 2026");
// .co.uk er BRITISK, ikke amerikansk: kildens «Sep. 01, 2026» bliver til
// britisk datoformat — en forbedring også for UK, som hidtil viste kildens
// amerikanske form på sine egne kort.
expect("dato: engelsk kort får britisk format", localizedEventDate("Sep. 01, 2026", "en"), "1 September 2026");
// new Date("Aug. 30") er IKKE ugyldig — den gætter år 2001. Uden årstal må vi
// ikke formatere, for «30. august 2001» er værre end kildens egen streng.
expect("dato: uden årstal røres den ikke", localizedEventDate("Aug. 30", "da"), "Aug. 30");
expect("dato: uparselig streng røres ikke", localizedEventDate("næste lørdag", "da"), "næste lørdag");
expect("dato: null forbliver null", localizedEventDate(null, "da"), null);

// Og hele vejen gennem træet
const dkText = textOf(buildMatchCardElement(base, "data:,", 1));
expect("dansk kort viser Sejr, ikke win", dkText.includes("win"), false);

// ── Formaterne mod Instagrams egne grænser ───────────────────────────────────
// Kilde: developers.facebook.com/docs/instagram-platform/content-publishing
// Bredde 320-1440 px, formforhold mellem 4:5 (0,8) og 1.91:1.
for (const [name, fmt] of Object.entries(CARD_FORMATS) as [CardFormat, typeof CARD_FORMATS.landscape][]) {
  const ratio = fmt.width / fmt.height;
  expect(`${name}: bredde inden for 320-1440`, fmt.width >= 320 && fmt.width <= 1440, true);
  expect(`${name}: formforhold inden for 0,8-1,91`, ratio >= 0.8 && ratio <= 1.91, true);
}
expect("portræt er 4:5", CARD_FORMATS.portrait.width / CARD_FORMATS.portrait.height, 0.8);
expect("landscape er uændret 1200×630", `${CARD_FORMATS.landscape.width}×${CARD_FORMATS.landscape.height}`, "1200×630");

// ── Nøglerne må ikke kunne kollidere ─────────────────────────────────────────
expect("kort-nøgle og ig-nøgle er forskellige", cardBlobKey(42) === igCardBlobKey(42), false);
expect("ig-nøglen bærer CARD_VERSION", igCardBlobKey(42).endsWith(`-v${CARD_VERSION}`), true);

// ── Standardformatet skifter ikke bag ryggen på nogen ────────────────────────
expect(
  "uden format-argument bygges landscape",
  JSON.stringify(buildMatchCardElement(base, "data:,", 1)) ===
    JSON.stringify(buildMatchCardElement(base, "data:,", 1, "landscape")),
  true,
);

// ── Fact-sheet fields that are not text (2026-10-03, #462) ─────────────────
// A tournament fact sheet listed `opponent` as rounds: [{round, team}, …]. The
// card printed "[object Object]" for each. Only plain text reaches the card.
const rounds = parseCardFacts(JSON.stringify({
  event: { opponent: [{ round: "R32", team: "Virginia" }, { round: "R16", team: "LSU" }], competition: "ITA All-American Championships" },
  result: { final_score: "6-7 (4-7), 3-6", outcome: "Lost" },
}));
expect("facts: an opponent list is not text → no opponent", rounds.opponent, null);
expect("facts: competition still shown", rounds.competition, "ITA All-American Championships");
expect("facts: score still shown", rounds.finalScore, "6-7 (4-7), 3-6");
const odd = parseCardFacts(JSON.stringify({ event: { opponent: { team: "Duke" }, date: 20260930 }, result: { outcome: ["W"], final_score: 3 } }));
expect("facts: an object opponent → null", odd.opponent, null);
expect("facts: a number date becomes text", odd.date, "20260930");
expect("facts: a list outcome → null (was «raw.trim is not a function»)", odd.outcome, null);
expect("facts: a number score becomes text", odd.finalScore, "3");
expect("facts: blank text → null", parseCardFacts(JSON.stringify({ event: { opponent: "  " } })).opponent, null);
expect("facts: plain text unchanged", parseCardFacts(JSON.stringify({ event: { opponent: "Duke" } })).opponent, "Duke");

console.log(`\nog-card: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
