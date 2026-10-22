/** Test of the permission-ledger rules. Offline. */
import { parseResponse, emailCooledDown, daysSince } from "./permission-state";

let passed = 0;
let failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) passed++;
  else { failed++; console.error(`✗ ${name}\n  got:      ${actual}\n  expected: ${expected}`); }
}

eq(parseResponse("granted").state, "granted", "granted sets state");
eq(parseResponse("declined").state, "declined", "declined sets state");
eq(parseResponse("conditional").state, "conditional", "conditional is its own state, not a plain yes");
eq(parseResponse("do-not-contact").state, "do_not_contact", "do-not-contact blocks further mail");
eq(parseResponse("forwarded").state, null, "forwarded leaves the state at asked");
eq(parseResponse("bounced").event, "bounced", "bounced event");
let threw = false;
try { parseResponse("yes"); } catch { threw = true; }
eq(threw, true, "unknown keyword throws");

const now = new Date("2026-10-21T12:00:00Z");
eq(emailCooledDown(null, now), true, "never mailed → ok");
eq(emailCooledDown("2026-10-01 09:00:00", now), false, "mailed 20 days ago → blocked");
eq(emailCooledDown("2026-07-01 09:00:00", now), true, "mailed 112 days ago → ok");
eq(daysSince("2026-10-14 12:00:00", now), 7, "days since");
eq(daysSince(null, now), null, "no date");

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
