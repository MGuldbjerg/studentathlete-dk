/** Tests for the before/after windows in social-retention.ts. Run: npx tsx pipeline/report/_social-retention-test.ts */
import { windows } from "./social-retention";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

expect("full 14 days in the past", windows("2026-10-15", 14, "2026-11-20"),
  { before: { from: "2026-10-01", to: "2026-10-14" }, after: { from: "2026-10-15", to: "2026-10-28" }, days: 14 });
expect("after is capped at yesterday, before shrinks to match", windows("2026-10-29", 14, "2026-11-05"),
  { before: { from: "2026-10-22", to: "2026-10-28" }, after: { from: "2026-10-29", to: "2026-11-04" }, days: 7 });
expect("across a month end", windows("2026-11-01", 3, "2026-12-01"),
  { before: { from: "2026-10-29", to: "2026-10-31" }, after: { from: "2026-11-01", to: "2026-11-03" }, days: 3 });
let threw = false;
try { windows("2026-10-29", 14, "2026-10-29"); } catch { threw = true; }
expect("no full day yet → error", threw, true);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
