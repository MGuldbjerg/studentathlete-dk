/**
 * Tests for apply-template-profiles.ts (decide + namesCurrentSchool).
 * Run: npx tsx pipeline/profiles/_apply-template-profiles-test.ts
 */
import { decide, type TemplateRow } from "./apply-template-profiles";

let passed = 0;
let failed = 0;
function eq(got: unknown, want: unknown, label: string): void {
  if (JSON.stringify(got) === JSON.stringify(want)) passed++;
  else { failed++; console.error(`  ✗ ${label}\n    got:  ${JSON.stringify(got)}\n    want: ${JSON.stringify(want)}`); }
}

const row: TemplateRow = {
  id: 1, name: "Cody Read", preferred_name: null, university: "Winthrop University",
  university_state: "SC", sport: "soccer", position: "Defender", hometown: "Leicester, England",
  year_enrolled: 2023, expected_graduation: null, active: 1, home_country: "UK",
  university_common_name: "Winthrop", university_nickname: "Eagles", university_city: "Rock Hill",
  gender: "m", profile_summary: null, profile_draft: null, profile_draft_at: null, profile_by_template: null,
};
const T = "TEMPLATE TEXT for the Winthrop Eagles";
const build = () => T;

eq(decide(row, build), { action: "publish", text: T }, "no text → publish");
eq(decide({ ...row, profile_draft_at: "2026-10-01" }, build).action, "skip", "rejected draft is respected");
eq(decide({ ...row, profile_draft: "old template draft", profile_draft_at: "2026-10-01" }, build),
  { action: "publish", text: T }, "pending template draft → publish current text, not the stored draft");
eq(decide({ ...row, profile_draft: "x".repeat(401) }, build).action, "skip", "LLM summary waits");
eq(decide({ ...row, profile_summary: "Hand-written about the Winthrop Eagles", profile_by_template: 0 }, build).action,
  "skip", "a person's text (0) is never touched");
eq(decide({ ...row, profile_summary: "Unknown origin, Winthrop", profile_by_template: null }, build).action,
  "skip", "unknown origin (NULL) counts as a person's");
eq(decide({ ...row, profile_summary: T, profile_by_template: 1 }, build).action, "skip", "up to date");
eq(decide({ ...row, profile_summary: "Cody Read plays for the Winthrop Eagles.", profile_by_template: 1 }, build),
  { action: "publish", text: T }, "template text → updated");
eq(decide({ ...row, profile_summary: "Cody Read has played for the Fairfield Stags since 2023.", profile_by_template: 1 }, build).action,
  "hold", "school changed, no transfer → hold");
eq(decide({
  ...row, profile_summary: "Cody Read has played for the Fairfield Stags since 2023.", profile_by_template: 1,
  transfer_event: "Transferred from Fairfield University to Winthrop University.|2026-08-20",
}, build), { action: "publish", text: T }, "school changed WITH a recorded transfer → publish");
eq(decide({ ...row, profile_summary: "Cody Read started at Winthrop University in 2026.", profile_by_template: 1 }, build).action,
  "publish", "official school name counts as the current school");

console.log(`\napply-template-profiles: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
