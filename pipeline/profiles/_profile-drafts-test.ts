/**
 * Unit-tests for build-profile-drafts.ts (rene funktioner — ingen netværk/DB).
 * Kør: npx tsx pipeline/profiles/_profile-drafts-test.ts
 */
import { eventsBlock, buildExpandPrompt, extractProfileText, verifyDraft, excludeHealthEvents, composeBaselineDraft, type EventRow } from "./build-profile-drafts";

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

console.log(`\nprofile-drafts: ${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
