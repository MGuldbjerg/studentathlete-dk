/**
 * Unit-tests for build-profile-drafts.ts (rene funktioner — ingen netværk/DB).
 * Kør: npx tsx pipeline/profiles/_profile-drafts-test.ts
 */
import { eventsBlock, buildExpandPrompt, extractProfileText, verifyDraft, excludeHealthEvents, composeBaselineDraft, expandSystem, languageFor, type EventRow } from "./build-profile-drafts";
import { transferSentence } from "../../src/lib/i18n/profile-builders";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { localizeCityNames } from "./refresh-hometown-drafts";

let passed = 0;
let failed = 0;

function check(cond: boolean, label: string, detail?: unknown): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ""}`);
  }
}

// ── eventsBlock ──────────────────────────────────────────────────────────────
const events: EventRow[] = [
  { season: "2026-27", kind: "award", award_name: "All-American", summary: "Udnævnt til All-American", significance: "honor", occurred_on: "2027-03-01" },
  { season: "2025-26", kind: "award", award_name: "Ugens spiller", summary: "Ugens spiller i Big Ten", significance: "notable", occurred_on: "2025-10-05" },
  { season: "2025-26", kind: "result", award_name: null, summary: "Scorede to mål mod Michigan", significance: "routine", occurred_on: "2025-09-14" },
  { season: null, kind: "transfer", award_name: null, summary: "Skiftede til Ohio State", significance: "notable", occurred_on: null },
];
const lines = eventsBlock(events);
check(lines.length === 4, "eventsBlock: alle events med");
check(lines[0].includes("Scorede to mål"), "eventsBlock: kronologisk (dato før award i samme sæson)", lines[0]);
check(lines[1].startsWith("- [2025-26] Ugens spiller:"), "eventsBlock: award_name som præfiks", lines[1]);
check(lines[2].startsWith("- [2026-27]"), "eventsBlock: sæsoner sorteret", lines[2]);
check(lines[3].includes("ukendt sæson"), "eventsBlock: null-sæson sidst", lines[3]);

const prompt = buildExpandPrompt("Mikkel Jensen startede...", lines);
check(prompt.includes("GRUNDFAKTA") && prompt.includes("KILDEBELAGTE"), "buildExpandPrompt: begge blokke");

// ── excludeHealthEvents (GDPR art. 9 — helbred ude af bio-generatoren) ───────
const withHealth: EventRow[] = [
  ...events,
  { season: "2025-26", kind: "injury-return", award_name: null, summary: "Tilbage efter pause", significance: "notable", occurred_on: "2026-01-10" },
  { season: "2025-26", kind: "result", award_name: null, summary: "Comeback efter knæskade", significance: "routine", occurred_on: "2026-01-17" },
  { season: "2025-26", kind: "other", award_name: null, summary: "Out for season with injury", significance: "notable", occurred_on: "2026-02-01" },
];
const filtered = excludeHealthEvents(withHealth);
check(filtered.length === events.length, "excludeHealthEvents: alle 3 helbreds-events fjernet", filtered.length);
check(filtered.every((e) => e.kind !== "injury-return"), "excludeHealthEvents: injury-kind fjernet");

// ── extractProfileText ───────────────────────────────────────────────────────
check(extractProfileText('{"profil": "Fin tekst."}') === "Fin tekst.", "parse: ren JSON");
check(extractProfileText('```json\n{"profil": "Fenced."}\n```') === "Fenced.", "parse: kodefence");
check(extractProfileText('Her er svaret: {"profil": "Indlejret."} Tak.') === "Indlejret.", "parse: indlejret objekt");
check(extractProfileText('{"profil": ""}') === null, "parse: tom profil afvises");
check(extractProfileText("bare løs tekst uden JSON") === null, "parse: garbage afvises");

// ── verifyDraft ──────────────────────────────────────────────────────────────
const corpus = "Mikkel Jensen startede på Ohio State University i efteråret 2025.\n- [2025-26] Ugens spiller: Ugens spiller i Big Ten";
const okDraft = "Mikkel Jensen startede på Ohio State University i 2025 og blev kåret som Ugens spiller i Big Ten i sæsonen 2025-26.";
check(verifyDraft(okDraft, corpus, "Mikkel Jensen").length === 0, "verify: korrekt udkast går igennem");
check(
  verifyDraft("Mikkel Jensen scorede 14 mål i 2025.", corpus, "Mikkel Jensen").some((p) => p.includes("14")),
  "verify: opfundet tal fanges",
);
check(
  verifyDraft("En spiller havde en god sæson i 2025 på Ohio State University og det var rigtig flot set over hele året.", corpus, "Mikkel Jensen").some((p) => p.includes("navn")),
  "verify: manglende navn fanges",
);
check(
  verifyDraft(`Mikkel Jensen i 2025 — læs mere på https://example.com og se resten af sæsonen der.`, corpus, "Mikkel Jensen").some((p) => p.includes("URL")),
  "verify: URL fanges",
);
check(verifyDraft("Mikkel kort.", corpus, "Mikkel Jensen").some((p) => p === "for kort"), "verify: for kort fanges");

// ── composeBaselineDraft (skifte-historik i basis-udkast) ────────────────────
check(
  composeBaselineDraft("Mikkel spiller fodbold for X.", []) === "Mikkel spiller fodbold for X.",
  "composeBaselineDraft: ingen skift → uændret",
);
check(
  composeBaselineDraft("Mikkel spiller fodbold for X.", ["Skiftede fra Y til X."]) ===
    "Mikkel spiller fodbold for X. Skiftede fra Y til X.",
  "composeBaselineDraft: ét skift tilføjes",
);
check(
  composeBaselineDraft("Mikkel spiller fodbold for Z.", ["Skiftede fra X til Y.", "Skiftede fra Y til Z."]) ===
    "Mikkel spiller fodbold for Z. Skiftede fra X til Y. Skiftede fra Y til Z.",
  "composeBaselineDraft: flere skift i kronologisk rækkefølge",
);

// ── Sprog følger atleten, ikke kørslen ───────────────────────────────────────
// Regressionen der gav 398 britiske atleter danske udkast: sproget blev valgt
// én gang ud fra standardlandet i stedet for pr. række.
check(languageFor({ home_country: "DK" }) === "da", "languageFor: DK → dansk");
check(languageFor({ home_country: "UK" }) === "en", "languageFor: UK → engelsk");
check(languageFor({ home_country: null }) === "da", "languageFor: ukendt land → standardsproget");

const ukAthlete = {
  name: "Ben Boxall",
  preferred_name: null,
  university: "Furman University",
  university_state: "SC",
  sport: "soccer",
  position: "Midfielder",
  hometown: "Cobham, England",
  year_enrolled: 2023,
  expected_graduation: null,
  active: 1,
  home_country: "UK",
};
const ukDraft = profileBuilder(languageFor(ukAthlete))(ukAthlete, new Date("2026-08-11"));
check(/\bhas played football for\b/.test(ukDraft), "UK-atlet: engelsk basis-tekst", ukDraft);
check(!/spiller|kommer fra|siden/.test(ukDraft), "UK-atlet: ingen danske rester", ukDraft);
check(!/England/.test(ukDraft), "UK-atlet: redundant landesuffiks strippet", ukDraft);

check(
  eventsBlock([{ season: null, kind: "transfer", award_name: null, summary: "Transferred", significance: "notable", occurred_on: null }], "en")[0].includes("unknown season"),
  "eventsBlock: engelsk null-sæson",
);
check(buildExpandPrompt("x", [], "en").includes("BASE FACTS"), "buildExpandPrompt: engelske blokke");
check(expandSystem("en").includes("British English"), "expandSystem: engelsk systemprompt");
check(expandSystem("da").includes("på dansk"), "expandSystem: dansk uændret");
check(expandSystem("de").includes("på dansk"), "expandSystem: ukendt sprog → standardsproget");

check(
  transferSentence("en")("Furman University", "Clemson") === "Transferred from Furman University to Clemson.",
  "transferSentence: engelsk",
);
check(
  transferSentence("da")("Furman University", "Clemson") === "Skiftede fra Furman University til Clemson.",
  "transferSentence: dansk",
);

// ── localizeCityNames (kirurgisk rettelse i godkendt tekst) ──────────────────
const aliases = { copenhagen: "København", vaerloese: "Værløse" };
check(
  localizeCityNames("Paul kommer fra Copenhagen.", aliases) === "Paul kommer fra København.",
  "localizeCityNames: byen rettes, resten står",
);
check(
  localizeCityNames("Fra copenhagen, ikke COPENHAGEN.", aliases) === "Fra København, ikke København.",
  "localizeCityNames: ufølsom for store bogstaver",
);
check(
  localizeCityNames("Han bor i Vaerloese ved Værløse.", aliases) === "Han bor i Værløse ved Værløse.",
  "localizeCityNames: ø/æ/å brydes korrekt som ordgrænse",
);
check(
  localizeCityNames("Copenhagenske forhold.", aliases) === "Copenhagenske forhold.",
  "localizeCityNames: kun hele ord — ingen delstrenge",
);
check(
  localizeCityNames("Intet at rette her.", aliases) === "Intet at rette her.",
  "localizeCityNames: uændret tekst forbliver identisk",
);

console.log(`\nprofile-drafts: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
