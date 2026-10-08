/**
 * The AWS WAF challenge is recognised as such (2026-10-07: it hid 205 teams).
 * The headers are the ones angelinaathletics.com sent: HTTP 202, empty body,
 * x-amzn-waf-action: challenge.
 */
import { isNotFoundTitle, isWafChallenge } from "./scrape-rosters";

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

// What the browser found behind the challenge (titles from the 2026-10-08 run).
ok(isNotFoundTitle("Page Not Found - Ferris State Bulldogs -  Ferris State Bulldogs"), "Sidearm 404 page");
ok(isNotFoundTitle("Not Found -  Carson-Newman"), "short 404 title");
ok(!isNotFoundTitle("2025-26 Men's Basketball Roster -  Laramie County Community College Athletics"), "a roster page");
ok(!isNotFoundTitle("ERROR: The request could not be satisfied"), "a CloudFront error is not a missing page");
ok(!isNotFoundTitle("Phoenix College Athletics"), "a home page is not a 404");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
