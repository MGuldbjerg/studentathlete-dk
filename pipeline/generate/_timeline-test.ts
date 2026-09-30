/**
 * Tests for the writer's timeline lines (pipeline/generate/timeline.ts).
 */
import { timelineForGeneration, type AthleteEvent } from "./timeline";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string, got?: unknown): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}${got === undefined ? "" : ` — got ${JSON.stringify(got)}`}`); }
}

const rookie = (season: string): AthleteEvent => ({ season, award_name: "Rookie of the Week/Month", significance: "notable", summary: "" });
const events = [rookie("2026-27"), rookie("2026-27"), rookie("2026-27"), rookie("2025-26"),
  { season: "2025-26", award_name: "All-Conference", significance: "honor", summary: "" } as AthleteEvent,
  { season: "2024-25", award_name: "All-Conference", significance: "honor", summary: "" } as AthleteEvent];

const en = timelineForGeneration(events, 2026, "en");
ok(en.includes("Rookie of the Week/Month (3 times so far this season, before this story)"), "weekly awards are counted (MacLean's three)", en);
ok(en.some((l) => l === "All-Conference (2 years running: 2024-25, 2025-26)"), "honour streak in English", en);
ok(!en.join(" ").match(/sæson|år i træk/), "no Danish in the English lines", en);

const da = timelineForGeneration(events, 2026, "da");
ok(da.includes("Rookie of the Week/Month (3 gange i denne sæson, før denne historie)"), "Danish labels on the Danish site", da);
ok(timelineForGeneration([rookie("2026-27")], 2026, "en")[0] === "Rookie of the Week/Month (once so far this season, before this story)", "one award reads 'once'");
ok(timelineForGeneration([rookie("2025-26")], 2026, "en").length === 0, "last season's weekly award is not this season");

console.log(`timeline: ${pass} ok, ${fail} fejl`);
if (fail) process.exit(1);
