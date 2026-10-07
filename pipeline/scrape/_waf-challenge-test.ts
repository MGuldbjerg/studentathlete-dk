/**
 * The AWS WAF challenge is recognised as such (2026-10-07: it hid 205 teams).
 * The headers are the ones angelinaathletics.com sent: HTTP 202, empty body,
 * x-amzn-waf-action: challenge.
 */
import { isWafChallenge } from "./scrape-rosters";

let passed = 0;
let failed = 0;
function ok(c: boolean, name: string) {
  if (c) passed++;
  else { failed++; console.error(`✗ ${name}`); }
}

ok(isWafChallenge(202, "challenge"), "202 + challenge header is a WAF challenge");
ok(isWafChallenge(202, "Challenge"), "header value case does not matter");
ok(!isWafChallenge(202, null), "a plain 202 without the header is not");
ok(!isWafChallenge(200, "challenge"), "a 200 is a page, whatever the header");
ok(!isWafChallenge(403, "block"), "a WAF block (403) is a block, not a challenge");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
