/**
 * One Claude call on the subscription, with usage kept and a fallback account.
 * ===========================================================================
 *
 * Mikkel, 2026-10-27: «I have a fallback Claude account … We should keep track
 * of usage and not exhaust everything immediately.» The v2 backtest that day
 * lost 29 calls when the main subscription hit its limit mid-run.
 *
 *  - LEAN: the same flags as the drafting provider (claudeCliArgs): no tools,
 *    no Claude Code system prompt — ~800 tokens of overhead instead of ~19k a
 *    call. The desk and the Opus editor ran with the full prompt until now.
 *  - FALLBACK: a limit (429) or login (401) answer on the main account switches
 *    to CLAUDE_CODE_OAUTH_TOKEN_FALLBACK for the rest of the run, once. The
 *    workflow's claude-account action has already picked an account that
 *    answered when the job started. The fallback runs Sonnet at medium effort
 *    whatever the job asked for (Mikkel, 2026-10-27: «just Sonnet, medium for now»).
 *  - USAGE: every call becomes a row for claude_calls (migration 078): job,
 *    account, model, tokens, ok/failed. `flushUsage(db)` writes them;
 *    pipeline/report/claude-usage.ts reads them.
 *
 * Locally there is no token in the environment and the CLI uses its own login.
 */
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { claudeCliArgs, interpretClaudeCli } from "./llm/provider-claude-cli";
import { LLMHttpError } from "./llm/errors";
import type { D1Client } from "./d1-client";

export type ClaudeAccount = "primary" | "fallback" | "local";

let account: ClaudeAccount =
  process.env.CLAUDE_ACCOUNT === "fallback" ? "fallback" : process.env.CLAUDE_CODE_OAUTH_TOKEN ? "primary" : "local";
let token = process.env.CLAUDE_CODE_OAUTH_TOKEN;

export interface UsageRow {
  job: string;
  account: ClaudeAccount;
  model: string;
  ok: number;
  input_tokens: number;
  output_tokens: number;
  error: string | null;
}
const pending: UsageRow[] = [];

/** Switch to the fallback account if there is one and we're not on it yet. */
export function canSwitch(status: number, current: ClaudeAccount, fallback: string | undefined): boolean {
  return (status === 429 || status === 401) && current === "primary" && !!fallback;
}

/** The model (and effort) a call runs with on this account. */
export function modelFor(current: ClaudeAccount, model: string): { model: string; effort?: string } {
  return current === "fallback" ? { model: "sonnet", effort: "medium" } : { model };
}

export function runClaude(
  input: string,
  o: { job: string; model: string; system: string; timeoutMs?: number },
): string | null {
  for (let attempt = 0; attempt < 2; attempt++) {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY; // with it set, the CLI would bill the API
    if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token;
    const m = modelFor(account, o.model);
    const res = spawnSync("claude", claudeCliArgs(m.model, o.system, m.effort), {
      input,
      cwd: tmpdir(),
      env,
      encoding: "utf8",
      timeout: o.timeoutMs ?? 10 * 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    try {
      const r = interpretClaudeCli(res.stdout ?? "", res.stderr ?? "", res.status, "claude");
      pending.push({ job: o.job, account, model: r.model, ok: 1, input_tokens: r.tokens_input, output_tokens: r.tokens_output, error: null });
      return r.text;
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 200);
      const status = e instanceof LLMHttpError ? e.status : 0;
      pending.push({ job: o.job, account, model: m.model, ok: 0, input_tokens: 0, output_tokens: 0, error: msg });
      console.log(`  ! claude (${account}): ${msg.slice(0, 160)}`);
      const fallback = process.env.CLAUDE_CODE_OAUTH_TOKEN_FALLBACK;
      if (canSwitch(status, account, fallback)) {
        account = "fallback";
        token = fallback;
        console.log("  → switching to the fallback Claude account for the rest of this run");
        continue;
      }
      return null;
    }
  }
  return null;
}

/** Write the run's calls to claude_calls. Never throws: usage must not fail a run. */
export async function flushUsage(db: D1Client): Promise<void> {
  const rows = pending.splice(0);
  for (const r of rows) {
    try {
      await db.execute(
        `INSERT INTO claude_calls (job, account, model, ok, input_tokens, output_tokens, error) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.job, r.account, r.model, r.ok, r.input_tokens, r.output_tokens, r.error],
      );
    } catch (e) {
      console.log(`  ! usage row not written: ${e instanceof Error ? e.message : e}`);
      return;
    }
  }
  if (rows.length) {
    const ok = rows.filter((r) => r.ok).length;
    const tin = rows.reduce((n, r) => n + r.input_tokens, 0), tout = rows.reduce((n, r) => n + r.output_tokens, 0);
    console.log(`Claude usage this run: ${ok}/${rows.length} calls ok · ${tin.toLocaleString("en")} tokens in, ${tout.toLocaleString("en")} out`);
  }
}
