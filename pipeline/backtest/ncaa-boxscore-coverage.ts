/**
 * How often does ncaa-api find the game AND our player for a match story?
 * And does its final score agree with the one the fact sheet read from the source?
 * Read-only.  npx tsx pipeline/backtest/ncaa-boxscore-coverage.ts [--limit 40]
 */
import { createD1Client } from "../lib/d1-client";
import type { FactSheet } from "../generate/build-factsheet";
import { lookupApplies, officialLine } from "../stats/ncaa-boxscore";

interface Row {
  id: number; headline: string | null; fact_sheet: string; discovered_at: string;
  athlete_name: string; preferred_name: string | null; sport: string; gender: string | null;
  division: string | null; university: string; common_name: string | null;
}

async function main(): Promise<void> {
  const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 40;
  const db = createD1Client();
  const { results } = await db.query<Row>(
    `SELECT s.id, s.headline, s.fact_sheet, s.discovered_at, a.name athlete_name, a.preferred_name,
            a.sport, a.gender, a.division, a.university,
            (SELECT common_name FROM schools WHERE name = a.university LIMIT 1) common_name
     FROM stories s JOIN athletes a ON a.id = s.athlete_id
     WHERE s.fact_status = 'built' AND a.sport IN ('soccer','field-hockey') AND a.division LIKE 'NCAA D%'
       AND s.discovered_at >= '2026-08-25'
       AND (s.fact_sheet LIKE '%"opponent":"%' OR s.fact_sheet LIKE '%"opponent": "%')
     ORDER BY s.discovered_at DESC LIMIT ?`, [limit]);
  let applies = 0, found = 0, agree = 0, disagree = 0, dnp = 0;
  for (const r of results) {
    if (!lookupApplies(r)) continue;
    applies++;
    const fs = JSON.parse(r.fact_sheet) as FactSheet;
    const line = await officialLine({
      athleteName: r.athlete_name, preferredName: r.preferred_name, sport: r.sport, gender: r.gender,
      division: r.division, university: r.university, commonName: r.common_name,
      opponent: typeof fs.event?.opponent === "string" ? fs.event.opponent : null, eventDate: typeof fs.event?.date === "string" ? fs.event.date : null, storyDate: r.discovered_at,
    });
    if (!line) { console.log(`  ·  [${r.id}] ${r.athlete_name} vs ${fs.event?.opponent ?? "?"} (${fs.event?.date ?? r.discovered_at.slice(0, 10)}) — no match`); continue; }
    found++;
    if (line.statLine[0]?.startsWith("did not play")) dnp++;
    const sheetScore = fs.result?.final_score ?? "";
    const nums = (s: unknown) => (String(s).match(/\d+/g) ?? []).sort().join("-");
    const same = sheetScore ? nums(sheetScore) === nums(line.finalScore) : null;
    if (same === true) agree++; else if (same === false) disagree++;
    console.log(`  ✓  [${r.id}] ${r.athlete_name}: ${line.finalScore} | ${line.statLine.join(", ")} | sheet: «${sheetScore}» ${same === false ? "⚠ DIFFERS" : ""}`);
  }
  console.log(`\n${results.length} match stories, ${applies} NCAA soccer/FH, found ${found} (${dnp} did not play); final score agrees ${agree}, differs ${disagree}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
