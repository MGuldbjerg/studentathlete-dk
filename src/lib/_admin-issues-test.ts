/** Pure helpers behind /admin/sager. */
import { daysSince, nonEmptyQueues, validateIssue } from "./admin-issues";

let passed = 0;
let failed = 0;
function eq(a: unknown, b: unknown, name: string) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x === y) passed++;
  else { failed++; console.error(`✗ ${name}\n    got:      ${x}\n    expected: ${y}`); }
}

const now = new Date("2026-11-26T12:00:00Z");
eq(daysSince("2026-11-12 12:00:00", now), 14, "D1 datetime is read as UTC");
eq(daysSince("2026-11-26 11:00:00", now), 0, "same day = 0");
eq(daysSince("2026-11-27 00:00:00", now), 0, "a clock-skewed future date never goes negative");
eq(daysSince(null, now), null, "never asked = unknown");
eq(daysSince("garbage", now), null, "garbage = unknown");

eq(nonEmptyQueues([
  { key: "a", label: "A", count: 0, href: "/a" },
  { key: "b", label: "B", count: 3, href: "/b" },
]).map((q) => q.key), ["b"], "empty queues are hidden");

eq(validateIssue({ title: "  " }), { ok: false, error: "Titel mangler" }, "blank title refused");
eq(validateIssue({ title: "x", link: "javascript:alert(1)" }).ok, false, "javascript: link refused");
eq(validateIssue({ title: "x", link: "/admin/fotos" }).ok, true, "admin path accepted");
eq(validateIssue({ title: "x", link: "https://example.com" }).ok, true, "https accepted");
eq(validateIssue({ title: " Svar fra WVU ", note: "", link: "", country: "UK" }),
  { ok: true, value: { title: "Svar fra WVU", note: null, link: null, country: "UK" } }, "trimmed, empties become null");
eq(validateIssue({ title: "x", country: "SE" }), { ok: true, value: { title: "x", note: null, link: null, country: null } },
  "a country without a site falls back to both sites");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
