/**
 * Tests for the collab-invite guardrails (collab.ts).
 *
 *   npx tsx pipeline/social/_collab-test.ts
 */
import { collabEnabled, interpretCollaborators, normaliseHandle, pickCollaborators, type CollabCandidate } from "./collab";

let passed = 0;
let failed = 0;
function check(actual: unknown, expected: unknown, name: string) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}: expected ${e}, got ${a}`); }
}

const now = new Date("2026-10-09T12:00:00Z");
const c = (id: number, handle: string, extra: Partial<CollabCandidate> = {}): CollabCandidate =>
  ({ athlete_id: id, handle, ord: 1, last_invite: null, last_decline: null, ...extra });
const handles = (xs: CollabCandidate[]) => xs.map((x) => normaliseHandle(x.handle));

check(normaliseHandle(" @Louisbowden_ "), "louisbowden_", "handle normalised");
check(handles(pickCollaborators([c(2, "b"), c(1, "a", { ord: 0 })], now)), ["a", "b"], "primary athlete first");
check(pickCollaborators([c(1, "a"), c(2, "b"), c(3, "c"), c(4, "d")], now).length, 3, "at most 3");
check(handles(pickCollaborators([c(1, "a", { last_invite: "2026-10-05 10:00:00" })], now)), [], "invited 4 days ago → wait");
check(handles(pickCollaborators([c(1, "a", { last_invite: "2026-10-01 10:00:00" })], now)), ["a"], "invited 8 days ago → ok");
check(handles(pickCollaborators([c(1, "a", { last_decline: "2026-06-01 10:00:00" })], now)), [], "declined 4 months ago → paused");
check(handles(pickCollaborators([c(1, "a", { last_decline: "2026-03-01 10:00:00" })], now)), ["a"], "declined 7 months ago → ok");
check(handles(pickCollaborators([c(1, "A"), c(2, "a")], now)), ["A"].map(normaliseHandle), "same handle once");
check(handles(pickCollaborators([c(1, "not a handle!")], now)), [], "malformed handle skipped");
check(collabEnabled("0"), false, "kill switch");
check(collabEnabled(undefined), true, "on by default");
check(
  [...(interpretCollaborators({ data: [{ username: "A", invite_status: "Accepted" }, { username: "b", invite_status: "Declined" }, { username: "c", invite_status: "Pending" }] }) ?? [])],
  [["a", "accepted"], ["b", "declined"], ["c", "sent"]],
  "invite statuses read",
);
check(interpretCollaborators({ error: { message: "x" } }), null, "unknown answer → null, not a guess");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
