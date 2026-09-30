/**
 * Tests for the browser budget's pacing rule (lib/browser-budget.ts).
 */
import { minutesLeftToday, daysLeftInMonth } from "./browser-budget";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}
const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

// 900 min over a 30-day month, nothing used: 30 min a day.
ok(near(minutesLeftToday({ usedBeforeToday: 0, usedToday: 0, daysLeft: 30 }, 900), 30), "even pace: 30 min/day");
ok(near(minutesLeftToday({ usedBeforeToday: 0, usedToday: 12, daysLeft: 30 }, 900), 18), "today's use counts against today's share");
// An early burst spreads over the days left instead of eating the month.
ok(near(minutesLeftToday({ usedBeforeToday: 600, usedToday: 0, daysLeft: 20 }, 900), 15), "after a burst the rest is spread thin");
ok(minutesLeftToday({ usedBeforeToday: 950, usedToday: 0, daysLeft: 5 }, 900) === 0, "month's budget gone → nothing today");
ok(minutesLeftToday({ usedBeforeToday: 0, usedToday: 40, daysLeft: 30 }, 900) === 0, "never negative");
ok(near(minutesLeftToday({ usedBeforeToday: 870, usedToday: 0, daysLeft: 1 }, 900), 30), "last day gets what is left");
ok(near(minutesLeftToday({ usedBeforeToday: 240, usedToday: 10, daysLeft: 1 }, 900), 50), "a quiet month's last day is still capped at 60 min (2026-09-30)");
ok(daysLeftInMonth(new Date("2026-09-30T12:00:00Z")) === 1, "30 Sept: one day left, today included");
ok(daysLeftInMonth(new Date("2026-10-01T00:00:00Z")) === 31, "1 Oct: 31 days left");

console.log(`browser-budget: ${pass} ok, ${fail} fejl`);
if (fail) process.exit(1);
