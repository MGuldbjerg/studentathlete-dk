/**
 * Claude subscription usage by day, job and account (llm_usage, migration 078).
 * Mikkel, 2026-10-27: «keep track of usage and not exhaust everything immediately».
 * Covers the desk and the Opus editor (pipeline/lib/claude-run.ts); drafting
 * keeps its tokens on the article rows (articles.tokens_input/output).
 *
 *   npx tsx pipeline/report/claude-usage.ts [--days 7]
 */
import { createD1Client } from "../lib/d1-client";

async function main() {
  const args = process.argv.slice(2);
  const days = Number(args[args.indexOf("--days") + 1]) || 7;
  const db = createD1Client();
  const rows = (await db.query<{ day: string; job: string; account: string; calls: number; failed: number; tin: number; tout: number }>(
    `SELECT date(at) AS day, job, account, COUNT(*) AS calls, SUM(ok = 0) AS failed,
            SUM(input_tokens) AS tin, SUM(output_tokens) AS tout
       FROM llm_usage WHERE at >= datetime('now', ?)
      GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`,
    [`-${days} days`],
  )).results;
  if (!rows.length) {
    console.log(`No Claude calls recorded in the last ${days} days.`);
    return;
  }
  const n = (x: number) => x.toLocaleString("en");
  console.log(`Claude usage, last ${days} days (desk + Opus editor)\n`);
  console.log(`${"day".padEnd(11)}${"job".padEnd(18)}${"account".padEnd(10)}${"calls".padStart(6)}${"failed".padStart(8)}${"tokens in".padStart(13)}${"out".padStart(10)}`);
  for (const r of rows) {
    console.log(`${r.day.padEnd(11)}${r.job.padEnd(18)}${r.account.padEnd(10)}${String(r.calls).padStart(6)}${String(r.failed).padStart(8)}${n(r.tin).padStart(13)}${n(r.tout).padStart(10)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
