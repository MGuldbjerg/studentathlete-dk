/**
 * Ops MCP server — Claude Code's read-only hands on StudentAthlete's operations.
 * ============================================================================
 *
 * Mikkel, 2026-10-28: «Make the internal MCP server, but keep Claude usage and
 * Cloudflare limits in mind.» Until now every session reached D1, CI and the
 * usage numbers through WSL workarounds (bash -ic, stdin heredocs, gh off the
 * PATH, single-command allow-rules). Diagnosing one failed editor run took five
 * ad-hoc commands; now it is ci_runs + ci_failure.
 *
 * Not the same as src/lib/mcp-server.ts: that one runs IN the Worker for Claude
 * Desktop and edits drafts and pages. This one runs locally over stdio, costs
 * no Worker requests, and never writes. Deploys and migrations stay with the
 * guarded wrapper scripts in scripts/ («Claudes grænse mod live» in CLAUDE.md).
 *
 * Limits it keeps:
 *  - D1 bills rows READ. d1_query takes one SELECT, refuses full-table scans
 *    unless asked (allow_scan), caps the rows returned, caches answers for a
 *    minute, and stops for the day at OPS_MCP_D1_DAILY_ROWS rows read (default
 *    200,000; counted per UTC day in ~/.cache/studentathlete-ops-mcp).
 *  - Claude: claude_quota is the only tool that calls Claude — one tiny Haiku
 *    call, cached 15 minutes. Every answer is capped at 8,000 characters, so a
 *    tool call doesn't flood the session's context.
 *
 * Start: mcp/run.sh. Setup: SETUP-ops-mcp.md.
 */
import { execFile } from "node:child_process";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { probeUtilization } from "../pipeline/lib/claude-run";
import { createD1Client } from "../pipeline/lib/d1-client";
import { Budget, checkReadOnly, clip, cteNames, fullScans, table } from "./ops-guards";

const run = promisify(execFile);
const REPO = "MGuldbjerg/studentathlete-dk";
const DB_NAME = "studentathlete-dk";
const db = createD1Client();
const budget = new Budget(Number(process.env.OPS_MCP_D1_DAILY_ROWS ?? 200_000));

const cache = new Map<string, { at: number; text: string }>();
/** Answer from the cache while it is fresh. Failures are never cached. */
async function cached(key: string, ttlMs: number, f: () => Promise<string>): Promise<string> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return `${hit.text}\n(cached ${Math.round((Date.now() - hit.at) / 1000)} s ago — no new reads)`;
  const text = await f();
  cache.set(key, { at: Date.now(), text });
  return text;
}

/** One D1 read, counted against the day's budget. */
async function d1(sql: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[]; read: number }> {
  if (budget.left() <= 0) throw new Error(`Daily D1 budget for this server is spent. ${budget.line()}. Raise OPS_MCP_D1_DAILY_ROWS only if the site has room.`);
  const r = await db.query(sql, params);
  const read = Number((r.meta as { rows_read?: number }).rows_read ?? 0);
  budget.add(read);
  return { rows: r.results, read };
}

const gh = async (args: string[]) => (await run("gh", [...args, "-R", REPO], { maxBuffer: 64 * 1024 * 1024 })).stdout;

// ── the tools ───────────────────────────────────────────────────────────────

type Args = Record<string, unknown>;
interface Tool { name: string; description: string; inputSchema: object; call: (a: Args) => Promise<string> }

const tools: Tool[] = [
  {
    name: "status",
    description: "Start-of-session overview in ONE call: failed workflow runs in the last 24 h, open PRs, drafts waiting per site, Claude calls today, the D1 budget, and the last quota reading (no new Claude call). Cached 2 minutes.",
    inputSchema: { type: "object", properties: {} },
    call: () => cached("status", 2 * 60_000, async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString().slice(0, 19);
      const [failed, prs, drafts, calls, chain] = await Promise.all([
        gh(["run", "list", "-L", "40", "--status", "failure", "--created", `>=${since}`, "--json", "databaseId,workflowName,createdAt"])
          // gh's --created compares dates only, so cut to the exact 24 h here
          .then((s) => (JSON.parse(s) as Array<Record<string, string>>).filter((r) => r.createdAt.slice(0, 19) >= since)),
        gh(["pr", "list", "--json", "number,title,headRefName"]).then((s) => JSON.parse(s) as Array<Record<string, string>>),
        d1(`SELECT country, COUNT(*) AS n FROM articles WHERE published = 0 GROUP BY country`),
        d1(`SELECT job, account, COUNT(*) AS calls, SUM(ok = 0) AS failed FROM claude_calls WHERE at >= date('now') GROUP BY 1, 2`),
        d1(`SELECT provider, requests, errors FROM llm_usage WHERE date = date('now') AND provider LIKE 'claude%'`),
      ]);
      const quota = cache.get("quota");
      return [
        `Failed runs, last 24 h: ${failed.length ? "" : "none"}`,
        ...failed.map((r) => `  ${r.databaseId} · ${r.workflowName} · ${r.createdAt.replace("T", " ").slice(0, 16)} UTC  (ci_failure for the log)`),
        `Open PRs: ${prs.length ? "" : "none"}`,
        ...prs.map((p) => `  #${p.number} ${p.title} [${p.headRefName}]`),
        `Drafts waiting: ${drafts.rows.map((r) => `${r.country} ${r.n}`).join(", ") || "none"}`,
        `Claude calls today (UTC): ${[
          ...calls.rows.map((r) => `${r.job}/${r.account} ${r.calls}${Number(r.failed) ? ` (${r.failed} failed)` : ""}`),
          ...chain.rows.map((r) => `drafting ${r.requests}${Number(r.errors) ? ` (${r.errors} failed)` : ""}`),
        ].join(", ") || "none"} — review-drafts.sh is not logged`,
        `Claude quota (this PC): ${quota ? quota.text.replace(/^This PC's Claude login: /, "") + ` (read ${Math.round((Date.now() - quota.at) / 60_000)} min ago)` : "not read this session — claude_quota costs one Haiku call"}`,
        budget.line(),
        "State and open items: projekt-status.md · procedures: docs/RUNBOOK.md",
      ].join("\n");
    }),
  },
  {
    name: "ci_runs",
    description: "Recent GitHub Actions runs (newest first): id, time, workflow, result. Filter by workflow file or name, or failures only. Use ci_failure on an id to see why it failed.",
    inputSchema: {
      type: "object",
      properties: {
        workflow: { type: "string", description: "Workflow file or name, e.g. auto-editor-uk.yml" },
        failed_only: { type: "boolean" },
        limit: { type: "number", description: "1–40, default 20" },
      },
    },
    call: async (a) => {
      const limit = Math.min(Math.max(Number(a.limit) || 20, 1), 40);
      const args = ["run", "list", "-L", String(limit), "--json", "databaseId,workflowName,conclusion,status,createdAt,event"];
      if (a.workflow) args.push("--workflow", String(a.workflow));
      if (a.failed_only) args.push("--status", "failure");
      return cached(`runs:${args.join(" ")}`, 60_000, async () => {
        const runs = JSON.parse(await gh(args)) as Array<Record<string, string>>;
        if (!runs.length) return "No runs match.";
        return table(["id", "created (UTC)", "workflow", "result", "event"],
          runs.map((r) => [r.databaseId, r.createdAt.replace("T", " ").slice(0, 16), r.workflowName, r.conclusion || r.status, r.event]));
      });
    },
  },
  {
    name: "ci_failure",
    description: "Why a GitHub Actions run failed: the failed steps and the tail of their log.",
    inputSchema: { type: "object", properties: { run_id: { type: "number" } }, required: ["run_id"] },
    call: async (a) => {
      const id = String(Number(a.run_id));
      return cached(`fail:${id}`, 24 * 3600_000, async () => {
        const meta = JSON.parse(await gh(["run", "view", id, "--json", "workflowName,conclusion,createdAt,url,jobs"]));
        const failed = (meta.jobs as Array<{ name: string; steps: Array<{ name: string; conclusion: string }> }>)
          .flatMap((j) => j.steps.filter((s) => s.conclusion === "failure").map((s) => `${j.name} › ${s.name}`));
        let log = "";
        try { log = await gh(["run", "view", id, "--log-failed"]); } catch { log = ""; }
        const lines = log.split("\n")
          .map((l) => l.split("\t").slice(2).join("\t").replace(/^﻿?\S+Z /, "").replace(/\x1b\[[0-9;]*m/g, "").trimEnd())
          .filter((l) => l && !/^##\[(group|endgroup)\]/.test(l));
        return [
          `${meta.workflowName} · ${meta.conclusion} · ${meta.createdAt} · ${meta.url}`,
          `Failed steps: ${failed.join("; ") || "none listed"}`,
          "Log tail:",
          ...lines.slice(-50),
        ].join("\n");
      });
    },
  },
  {
    name: "claude_usage",
    description: "Claude calls logged by the pipeline per day, job and account (claude_calls + the drafting chain's llm_usage). review-drafts.sh is not logged.",
    inputSchema: { type: "object", properties: { days: { type: "number", description: "1–14, default 7" } } },
    call: async (a) => {
      const days = Math.min(Math.max(Number(a.days) || 7, 1), 14);
      return cached(`usage:${days}`, 5 * 60_000, async () => {
        const since = `-${days} days`;
        const calls = await d1(
          `SELECT date(at) AS day, job, account, COUNT(*) AS calls, SUM(ok = 0) AS failed, SUM(input_tokens) AS tin, SUM(output_tokens) AS tout
             FROM claude_calls WHERE at >= datetime('now', ?) GROUP BY 1, 2, 3`, [since]);
        const chain = await d1(
          `SELECT date AS day, 'drafting (' || provider || ')' AS job, '-' AS account, requests AS calls, errors AS failed, tokens_input AS tin, tokens_output AS tout
             FROM llm_usage WHERE provider LIKE 'claude%' AND date >= date('now', ?)`, [since]);
        const rows = [...calls.rows, ...chain.rows].sort((x, y) => String(y.day).localeCompare(String(x.day)) || String(x.job).localeCompare(String(y.job)));
        if (!rows.length) return `No Claude calls logged in the last ${days} days.`;
        return [
          table(["day", "job", "account", "calls", "failed", "tokens in", "out"], rows.map((r) => [r.day, r.job, r.account, r.calls, r.failed, r.tin, r.tout])),
          `(${(calls.read + chain.read).toLocaleString("en")} rows read) ${budget.line()}`,
        ].join("\n");
      });
    },
  },
  {
    name: "claude_quota",
    description: "Live subscription utilisation (5-hour and 7-day windows) of the Claude login on THIS PC — not necessarily the CI token's account. Costs one tiny Haiku call; cached 15 minutes.",
    inputSchema: { type: "object", properties: {} },
    call: () => cached("quota", 15 * 60_000, async () => {
      const env = { ...process.env };
      delete env.ANTHROPIC_API_KEY;
      delete env.CLAUDE_CODE_OAUTH_TOKEN;
      const u = probeUtilization(env);
      if (!u) return "No reading: the CLI gave no rate_limit_event (not logged in, or the CLI changed its output).";
      const pct = (x: number) => `${Math.round(x * 100)}%`;
      return `This PC's Claude login: 5-hour window ${pct(u.fiveHour)} · 7-day window ${pct(u.sevenDay)} · ${u.allowed ? "allowed" : "LIMITED"}. CI moves to the fallback at 85% / 90% (claude-run.ts).`;
    }),
  },
  {
    name: "d1_schema",
    description: "Live D1 schema: without a table, the table names; with one, its CREATE statement and indexes. Check indexes before writing a WHERE for d1_query.",
    inputSchema: { type: "object", properties: { table: { type: "string" } } },
    call: async (a) => {
      const t = a.table ? String(a.table) : "";
      return cached(`schema:${t}`, 3600_000, async () => {
        if (!t) {
          const r = await d1(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name`);
          return r.rows.map((x) => x.name).join(", ");
        }
        const r = await d1(`SELECT type, name, sql FROM sqlite_master WHERE tbl_name = ? AND sql IS NOT NULL ORDER BY type DESC`, [t]);
        return r.rows.length ? r.rows.map((x) => `${x.sql};`).join("\n") : `No table named ${t}.`;
      });
    },
  },
  {
    name: "d1_query",
    description:
      "One read-only SELECT (or WITH … SELECT) against the LIVE D1. D1 bills rows read, so the plan is checked first and a full-table scan is refused unless allow_scan is true " +
      "(fine for a plain LIMIT without ORDER BY/GROUP BY, costly for aggregates over big tables). Returns at most max_rows rows (default 50, max 200), the rows read, and the day's budget. Identical queries within a minute come from the cache.",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string" },
        params: { type: "array", description: "Values for ? placeholders" },
        max_rows: { type: "number" },
        allow_scan: { type: "boolean" },
      },
      required: ["sql"],
    },
    call: async (a) => {
      const sql = String(a.sql ?? "");
      const bad = checkReadOnly(sql);
      if (bad) throw new Error(`Refused: ${bad}.`);
      const n = Math.min(Math.max(Number(a.max_rows) || 50, 1), 200);
      const params = Array.isArray(a.params) ? a.params : [];
      const wrapped = `SELECT * FROM (${sql.trim().replace(/;\s*$/, "")}) LIMIT ${n + 1}`;
      return cached(`q:${a.allow_scan ? 1 : 0}:${JSON.stringify(params)}:${wrapped}`, 60_000, async () => {
        const plan = await d1(`EXPLAIN QUERY PLAN ${wrapped}`, params);
        const scans = fullScans(plan.rows, cteNames(sql));
        if (scans.length && !a.allow_scan) {
          throw new Error(`Refused: the plan scans every row of ${scans.join(", ")} (D1 bills each row read). Filter on an indexed column (see d1_schema), or pass allow_scan: true if the scan is small or stops at a LIMIT. Plan: ${plan.rows.map((r) => r.detail).join(" / ")}`);
        }
        const r = await d1(wrapped, params);
        const more = r.rows.length > n;
        const rows = r.rows.slice(0, n);
        const head = rows.length ? Object.keys(rows[0]) : [];
        return [
          rows.length ? table(head, rows.map((x) => head.map((k) => x[k]))) : "(no rows)",
          `${rows.length} row(s)${more ? ", more exist — raise max_rows or narrow the query" : ""} · ${r.read.toLocaleString("en")} rows read${scans.length ? " (full scan allowed)" : ""} · ${budget.line()}`,
        ].join("\n");
      });
    },
  },
  {
    name: "d1_top_reads",
    description: "The site's D1 queries that read the most rows over a period (wrangler d1 insights) — where the Cloudflare budget goes. Reads Cloudflare analytics, not D1 rows; cached 30 minutes.",
    inputSchema: { type: "object", properties: { period: { type: "string", description: "e.g. 1d (default), 7d" } } },
    call: async (a) => {
      const period = /^\d{1,2}d$/.test(String(a.period ?? "")) ? String(a.period) : "1d";
      return cached(`top:${period}`, 30 * 60_000, async () => {
        const { stdout } = await run("wrangler", ["d1", "insights", DB_NAME, "--sort-type", "sum", "--sort-by", "reads", "--time-period", period, "--limit", "10", "--json"], { maxBuffer: 16 * 1024 * 1024 });
        const rows = JSON.parse(stdout) as Array<Record<string, unknown>>;
        if (!rows.length) return `No query insights for ${period}.`;
        return table(["rows read", "runs", "rows/run", "query"], rows.map((r) => {
          const read = Number(r.totalRowsRead ?? 0), runs = Number(r.numberOfTimesRun ?? 0);
          return [read.toLocaleString("en"), runs, runs ? Math.round(read / runs) : "", String(r.query ?? "")];
        }));
      });
    },
  },
];

// ── MCP over stdio: newline-delimited JSON-RPC. stdout is the channel; logs go to stderr. ──

const send = (msg: object) => process.stdout.write(JSON.stringify(msg) + "\n");

async function handle(req: { id?: number | string; method: string; params?: Args }): Promise<void> {
  const { id, method, params = {} } = req;
  if (id === undefined) return; // notifications (initialized, cancelled) need no answer
  try {
    if (method === "initialize") {
      send({ jsonrpc: "2.0", id, result: {
        protocolVersion: String(params.protocolVersion ?? "2025-06-18"),
        capabilities: { tools: {} },
        serverInfo: { name: "studentathlete-ops", version: "1.0.0" },
        instructions: "Read-only operations for StudentAthlete: CI runs and failures, Claude usage and quota, live D1 reads under a daily row budget, and D1's costliest queries. It never writes; deploys and migrations stay with scripts/*.sh.",
      } });
    } else if (method === "ping") {
      send({ jsonrpc: "2.0", id, result: {} });
    } else if (method === "tools/list") {
      send({ jsonrpc: "2.0", id, result: { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
    } else if (method === "tools/call") {
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) throw new Error(`unknown tool ${String(params.name)}`);
      try {
        const text = await tool.call((params.arguments as Args) ?? {});
        send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: clip(text) }] } });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: clip(msg) }], isError: true } });
      }
    } else {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
    }
  } catch (e) {
    send({ jsonrpc: "2.0", id, error: { code: -32603, message: e instanceof Error ? e.message : String(e) } });
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }); return; }
  void handle(req);
});
console.error("studentathlete-ops MCP ready");
