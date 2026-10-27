/**
 * Claude subscription usage by day, job and account.
 * Mikkel, 2026-10-27: «keep track of usage and not exhaust everything immediately».
 *
 * Two sources, because two code paths call Claude:
 *  - claude_calls (migration 078): the desk and the Opus editor, per call, with
 *    the account (pipeline/lib/claude-run.ts);
 *  - llm_usage (migration 008): the drafting chain, per provider per day — its
 *    'claude…' rows are the Haiku calls in build-factsheet and generate-articles.
 * The draft reviews (scripts/review-drafts.sh) call the CLI from bash and are
 * not counted.
 *
 *   npx tsx pipeline/report/claude-usage.ts [--days 7]
 */
import { createD1Client } from "../lib/d1-client";

interface Row { day: string; job: string; account: string; calls: number; failed: number; tin: number; tout: number }

async function main() {
  const args = process.argv.slice(2);
  const days = Number(args[args.indexOf("--days") + 1]) || 7;
  const db = createD1Client();
  const since = `-${days} days`;
  const calls = (await db.query<Row>(
    `SELECT date(at) AS day, job, account, COUNT(*) AS calls, SUM(ok = 0) AS failed,
            SUM(input_tokens) AS tin, SUM(output_tokens) AS tout
       FROM claude_calls WHERE at >= datetime('now', ?)
      GROUP BY 1, 2, 3`,
    [since],
  )).results;
  const chain = (await db.query<Row>(
    `SELECT date AS day, 'drafting (' || provider || ')' AS job, '-' AS account, requests AS calls, errors AS failed,
            tokens_input AS tin, tokens_output AS tout
       FROM llm_usage WHERE provider LIKE 'claude%' AND date >= date('now', ?)`,
    [since],
  )).results;
  const rows = [...calls, ...chain].sort((a, b) => b.day.localeCompare(a.day) || a.job.localeCompare(b.job));
  if (!rows.length) {
    console.log(`No Claude calls recorded in the last ${days} days.`);
    return;
  }
  const n = (x: number) => (x ?? 0).toLocaleString("en");
  console.log(`Claude usage, last ${days} days\n`);
  console.log(`${"day".padEnd(11)}${"job".padEnd(24)}${"account".padEnd(10)}${"calls".padStart(6)}${"failed".padStart(8)}${"tokens in".padStart(13)}${"out".padStart(10)}`);
  for (const r of rows) {
    console.log(`${r.day.padEnd(11)}${r.job.padEnd(24)}${r.account.padEnd(10)}${String(r.calls).padStart(6)}${String(r.failed ?? 0).padStart(8)}${n(r.tin).padStart(13)}${n(r.tout).padStart(10)}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
