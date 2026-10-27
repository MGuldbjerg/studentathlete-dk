/** Tests for the fallback rule in claude-run.ts. Run: npx tsx pipeline/lib/_claude-run-test.ts */
import { canSwitch } from "./claude-run";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

expect("limit on the main account, fallback set → switch", canSwitch(429, "primary", "tok"), true);
expect("login failure on the main account → switch", canSwitch(401, "primary", "tok"), true);
expect("no fallback token → no switch", canSwitch(429, "primary", undefined), false);
expect("already on the fallback → no second switch", canSwitch(429, "fallback", "tok"), false);
expect("a broken call (500) is not the account's fault → no switch", canSwitch(500, "primary", "tok"), false);
expect("locally (own login) → no switch", canSwitch(429, "local", "tok"), false);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
