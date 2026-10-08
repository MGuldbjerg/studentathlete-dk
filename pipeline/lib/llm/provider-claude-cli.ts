/**
 * Claude Haiku through Mikkel's Claude subscription, via headless Claude Code.
 *
 * Not the API: `claude -p` signs in with CLAUDE_CODE_OAUTH_TOKEN (from
 * `claude setup-token`), the same token review-drafts.yml has used since
 * 2026-09-28, so the $0 principle holds. ANTHROPIC_API_KEY is stripped from the
 * child's environment on purpose — with it set, the CLI would bill the API.
 *
 * OPT-IN: available only when LLM_CLAUDE_CLI=1. The subscription's limits (5-hour
 * windows, a weekly cap) are shared with Mikkel's own interactive Claude, so a
 * workflow has to choose to spend them; nothing picks this up by accident.
 *
 * Overhead, measured 2026-10-08 on CLI 2.1.294: a plain `claude -p` carries
 * ~19k tokens of Claude Code's own prompt and tool definitions; run from the
 * repo it also loads CLAUDE.md (~5.4k). With tools off, our own system prompt,
 * user settings only and a neutral working directory it is ~800 — small enough
 * for hundreds of pipeline calls a day.
 *
 * A usage limit is weather, like any provider's 429: it becomes an LLMHttpError
 * 429 so the chain rests the provider and falls through to the free models.
 */

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { LLMHttpError } from "./errors";

/** One call never takes this long; a hung CLI must not hold a pipeline run. */
const TIMEOUT_MS = 180_000;

/** The shape of `--output-format json`, the fields we read. */
export interface ClaudeCliResult {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  modelUsage?: Record<string, unknown>;
}

/** Arguments for one lean, tool-less call. The prompt goes in on stdin. */
export function claudeCliArgs(model: string, system: string): string[] {
  return [
    "-p",
    "--model", model,
    "--output-format", "json",
    "--tools", "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--setting-sources", "user",
    "--exclude-dynamic-system-prompt-sections",
    "--system-prompt", system,
  ];
}

/**
 * Is this failure the subscription's limit (wait) rather than a broken call?
 * The CLI words it several ways across versions: "usage limit reached",
 * "You've hit your limit · resets 3pm", "rate_limit_error", "overloaded".
 */
export function isClaudeLimitText(text: string): boolean {
  return /usage limit|hit your limit|limit reached|rate.?limit|resets? (at )?\d|overloaded|\b429\b|\b529\b/i.test(text);
}

/** Is it the login? An expired token is setup, not weather. */
export function isClaudeAuthText(text: string): boolean {
  return /invalid api key|not logged in|please run \/login|oauth|authenticat|\b401\b|\b403\b/i.test(text);
}

/**
 * Turn the CLI's JSON (or its absence) into an answer or a typed error.
 * Pure, so the mapping is tested without spawning anything.
 */
export function interpretClaudeCli(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  providerName: string,
): LLMResponse {
  let parsed: ClaudeCliResult | null = null;
  try {
    parsed = JSON.parse(stdout.trim()) as ClaudeCliResult;
  } catch {
    parsed = null;
  }

  const failText = `${parsed?.result ?? ""} ${stderr} ${parsed ? "" : stdout}`.trim();
  if (!parsed || parsed.is_error || exitCode !== 0 || parsed.subtype !== "success") {
    const brief = failText.replace(/\s+/g, " ").slice(0, 200) || `exit ${exitCode}`;
    if (isClaudeLimitText(failText)) {
      // The chain rests a 429 for retryAfterMs. The reset is hours away, not a
      // minute, so rest it for the rest of a normal run.
      throw new LLMHttpError(`claude limit (429): ${brief}`, 429, 60 * 60_000);
    }
    if (isClaudeAuthText(failText)) {
      throw new LLMHttpError(`claude login (401): ${brief} — run 'claude setup-token' again`, 401);
    }
    throw new LLMHttpError(`claude cli failed (500): ${brief}`, 500);
  }

  const u = parsed.usage ?? {};
  return {
    text: parsed.result ?? "",
    model: Object.keys(parsed.modelUsage ?? {})[0] ?? "claude-haiku",
    provider: providerName,
    tokens_input:
      (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
    tokens_output: u.output_tokens ?? 0,
  };
}

export class ClaudeCliProvider implements LLMProvider {
  readonly name: string;

  constructor(
    private model = "haiku",
    name = "claude",
  ) {
    this.name = name;
  }

  isAvailable(): boolean {
    return process.env.LLM_CLAUDE_CLI === "1";
  }

  // max_tokens and json have no CLI flag. The prompts ask for JSON already and
  // every caller parses fail-safe; Haiku's answers here are short.
  generate(opts: GenerateOpts): Promise<LLMResponse> {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    return new Promise((resolve, reject) => {
      const child = spawn("claude", claudeCliArgs(this.model, opts.system), {
        cwd: tmpdir(),
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new LLMHttpError(`claude cli timed out after ${TIMEOUT_MS / 1000}s (504)`, 504));
      }, TIMEOUT_MS);

      child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      child.on("error", (err) => {
        clearTimeout(timer);
        // ENOENT = the CLI isn't installed in this workflow. Setup, not weather.
        reject(new LLMHttpError(`claude cli could not start: ${err.message} (400)`, 400));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        try {
          resolve(interpretClaudeCli(stdout, stderr, code, this.name));
        } catch (err) {
          reject(err);
        }
      });

      child.stdin.end(opts.prompt);
    });
  }
}
