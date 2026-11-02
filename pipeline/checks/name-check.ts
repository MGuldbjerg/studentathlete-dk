/**
 * Nordic name check — flags names whose ø/æ/å the roster dropped, for Mikkel to confirm.
 * =======================================================================================
 *
 * Each Nordic athlete is judged once, the night after they first appear (name-check.yml,
 * after the roster scrape), so the spelling is settled before there is an article, a card
 * or a social post. It never changes a name: suspects go to Discord and to --report with
 * the command that applies the fix (pipeline/fix/fix-athlete-name.ts).
 *
 *   npx tsx pipeline/checks/name-check.ts                 judge up to --limit new athletes (default 300)
 *   npx tsx pipeline/checks/name-check.ts --dry-run       judge, print, write nothing
 *   npx tsx pipeline/checks/name-check.ts --report        open suspects
 *   npx tsx pipeline/checks/name-check.ts --dismiss <id>  «that spelling is right» (never asked again)
 *
 * Cost: names already printed with Nordic letters are recorded without a model call; the
 * rest go in batches of 60 to Haiku on the subscription (claude-run.ts). First run covers
 * ~1,200 athletes (~20 calls); later runs only the new ones. D1: one indexed country read.
 */
import { createD1Client, type D1Client } from "../lib/d1-client";
import { flushUsage, runClaude } from "../lib/claude-run";
import { COLOR, notify } from "../lib/notify";
import { NORDIC, buildPrompt, decide, fixCommand, hasDiacritics, parseVerdicts, type Candidate, type Decision } from "../lib/name-check";

const BATCH = 60;

async function record(db: D1Client, rows: Array<Decision & { name: string }>): Promise<void> {
  for (let i = 0; i < rows.length; i += 15) { // 6 bound values a row, D1 allows 100 per query
    const part = rows.slice(i, i + 15);
    await db.execute(
      `INSERT OR IGNORE INTO name_checks (athlete_id, verdict, suggested, confidence, source, name_at_check) VALUES ${part.map(() => "(?, ?, ?, ?, ?, ?)").join(", ")}`,
      part.flatMap((d) => [d.id, d.verdict, d.suggested, d.confidence, d.source, d.name]));
  }
}

async function report(db: D1Client): Promise<void> {
  const open = (await db.query<{ athlete_id: number; name: string; suggested: string; confidence: string; school: string }>(
    `SELECT n.athlete_id, a.name, n.suggested, n.confidence, a.university AS school
       FROM name_checks n JOIN athletes a ON a.id = n.athlete_id WHERE n.verdict = 'suspect' ORDER BY n.athlete_id`)).results;
  if (!open.length) { console.log("No open name suspects."); return; }
  console.log(`${open.length} open name suspect(s):`);
  for (const o of open) console.log(`  #${o.athlete_id} ${o.name} → ${o.suggested} (${o.confidence}, ${o.school})\n     ${fixCommand(o.athlete_id, o.suggested)}`);
  console.log(`Spelling is right as printed?  npx tsx pipeline/checks/name-check.ts --dismiss <id>`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (n: string) => args.includes(n);
  const value = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const dryRun = flag("--dry-run");
  const limit = Number(value("--limit") ?? 300);
  const db = createD1Client();

  if (flag("--report")) return report(db);
  const dismiss = Number(value("--dismiss"));
  if (flag("--dismiss")) {
    if (!dismiss) { console.error("--dismiss <athlete id>"); process.exit(2); }
    await db.execute(`UPDATE name_checks SET verdict = 'dismissed' WHERE athlete_id = ? AND verdict = 'suspect'`, [dismiss]);
    console.log(`#${dismiss}: dismissed — the printed spelling stands.`);
    return;
  }

  const marks = NORDIC.map(() => "?").join(",");
  const rows = (await db.query<{ id: number; name: string; home_country: string; university: string; sport: string }>(
    `SELECT a.id, a.name, a.home_country, a.university, a.sport FROM athletes a
      WHERE a.home_country IN (${marks}) AND NOT EXISTS (SELECT 1 FROM name_checks n WHERE n.athlete_id = a.id)
      LIMIT ?`, [...NORDIC, limit])).results;
  if (!rows.length) { console.log("Every Nordic athlete has been checked."); return; }

  const printed = rows.filter((r) => hasDiacritics(r.name));
  const ascii: Candidate[] = rows.filter((r) => !hasDiacritics(r.name))
    .map((r) => ({ id: r.id, name: r.name, country: r.home_country, school: r.university, sport: r.sport }));
  console.log(`${rows.length} new Nordic athlete(s): ${printed.length} already carry Nordic letters, ${ascii.length} to judge.`);

  const names = new Map(rows.map((r) => [r.id, r.name]));
  const decisions: Decision[] = printed.map((r) => ({ id: r.id, verdict: "ok", suggested: null, confidence: null, source: "has-diacritics" }));
  for (let i = 0; i < ascii.length; i += BATCH) {
    const batch = ascii.slice(i, i + BATCH);
    const answer = runClaude(buildPrompt(batch), {
      job: "name-check", model: "haiku",
      system: "You check the spelling of Nordic names. Follow the rules in the message and answer only with the JSON array it asks for.",
    });
    if (answer === null) { console.log("  ! no answer from Claude — the rest stays unchecked and is tried next run"); break; }
    const d = decide(batch, parseVerdicts(answer));
    console.log(`  batch ${i / BATCH + 1}: ${batch.length} asked, ${d.length} answered, ${d.filter((x) => x.verdict === "suspect").length} suspect`);
    decisions.push(...d);
  }

  const suspects = decisions.filter((d) => d.verdict === "suspect");
  for (const s of suspects) console.log(`  ✎ #${s.id} ${names.get(s.id)} → ${s.suggested} (${s.confidence})`);
  if (dryRun) { console.log("Dry run — nothing written."); return; }

  await record(db, decisions.map((d) => ({ ...d, name: names.get(d.id) ?? "" })));
  await flushUsage(db);
  console.log(`Recorded ${decisions.length}; ${suspects.length} new suspect(s).`);

  if (suspects.length) {
    await notify({
      title: `✎ ${suspects.length} name${suspects.length === 1 ? "" : "s"} may be missing Nordic letters`,
      description: suspects.slice(0, 15).map((s) => `**${names.get(s.id)}** → ${s.suggested} (${s.confidence}) · #${s.id}`).join("\n")
        + (suspects.length > 15 ? `\n…and ${suspects.length - 15} more (--report)` : "")
        + "\n\nTell Claude «fix #id», or dismiss with `name-check.ts --dismiss <id>`.",
      color: COLOR.ready,
    });
  }
}

if (process.argv[1]?.endsWith("name-check.ts")) main().catch((e) => { console.error(e); process.exit(1); });
