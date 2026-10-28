/** Tests for the fallback rule in claude-run.ts. Run: npx tsx pipeline/lib/_claude-run-test.ts */
import { canSwitch, modelFor, nearLimit, parseUtilization } from "./claude-run";

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

// Mikkel, 2026-10-27: the fallback account runs Sonnet at medium effort, whatever the job asked for.
expect("main account keeps the job's model", modelFor("primary", "opus"), { model: "opus" });
expect("locally keeps the job's model", modelFor("local", "opus"), { model: "opus" });
expect("fallback → Sonnet, medium effort", modelFor("fallback", "opus"), { model: "sonnet", effort: "medium" });

expect("main account honours a job's effort", modelFor("primary", "sonnet", "medium"), { model: "sonnet", effort: "medium" });
expect("fallback ignores the job's effort", modelFor("fallback", "opus", "high"), { model: "sonnet", effort: "medium" });

// Mikkel, 2026-10-28: switch to the fallback before the main account is exhausted.
expect("plenty of room → stay", nearLimit({ fiveHour: 0.4, sevenDay: 0.3, allowed: true }), false);
expect("5-hour window at 85% → switch", nearLimit({ fiveHour: 0.85, sevenDay: 0.1, allowed: true }), true);
expect("weekly window at 90% → switch", nearLimit({ fiveHour: 0.1, sevenDay: 0.9, allowed: true }), true);
expect("status rejected → switch", nearLimit({ fiveHour: 0.1, sevenDay: 0.1, allowed: false }), true);
expect("no reading → stay (probe never forces a switch)", nearLimit(null), false);
const ev = JSON.stringify({ type: "rate_limit_event", rate_limit_info: { status: "allowed_warning", unifiedWindows: { five_hour: { utilization: 0.91 }, seven_day: { utilization: 0.2 } } } });
expect("parses a rate_limit_event line", parseUtilization("{\"type\":\"system\"}\n" + ev + "\n"), { fiveHour: 0.91, sevenDay: 0.2, allowed: true });
expect("no event → null", parseUtilization("{\"type\":\"result\"}"), null);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
