/**
 * The platform's health, read straight from Cloudflare.
 *
 * Kept as a name because projekt-status.md and old notes point here. Since
 * Workers Paid (2026-09-30) the numbers live in ONE place —
 * pipeline/checks/platform-limits.ts, which the daily workflow runs — and
 * this file just runs that report.
 *
 * Run:  npx tsx pipeline/report/health-check.ts [--days 3] [--json]
 */
import { main } from "../checks/platform-limits";

if (process.argv[1] && process.argv[1].endsWith("health-check.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
