/**
 * Tests for the Claude-subscription provider's reading of the CLI's output.
 *
 * What matters: a usage limit must read as weather (429, transient) so the
 * chain falls back to the free models, and an expired login must NOT — that is
 * setup, and waiting for it to pass would hide it.
 *
 *   npx tsx pipeline/lib/llm/_claude-cli-test.ts
 */
import { claudeCliArgs, interpretClaudeCli } from "./provider-claude-cli";
import { LLMHttpError, isTransientLLMError } from "./errors";

let passed = 0;
let failed = 0;

function check(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function thrown(fn: () => unknown): unknown {
  try {
    fn();
    return null;
  } catch (err) {
    return err;
  }
}

// A real answer, as CLI 2.1.294 printed it on 2026-10-08.
const ok = JSON.stringify({
  type: "result",
  subtype: "success",
  is_error: false,
  result: '{"ok": true}',
  usage: { input_tokens: 2, cache_creation_input_tokens: 800, cache_read_input_tokens: 0, output_tokens: 9 },
  modelUsage: { "claude-haiku-5-5": {} },
});
const res = interpretClaudeCli(ok, "", 0, "claude");
check(res.text, '{"ok": true}', "the answer is the result field");
check(res.model, "claude-haiku-5-5", "the model comes from modelUsage");
check(res.tokens_input, 802, "input counts cache creation and reads");
check(res.tokens_output, 9, "output tokens");
check(res.provider, "claude", "provider name");

const limitJson = JSON.stringify({ type: "result", subtype: "success", is_error: true, result: "Claude AI usage limit reached|1760000000" });
const limit = thrown(() => interpretClaudeCli(limitJson, "", 1, "claude"));
check(limit instanceof LLMHttpError && limit.status, 429, "usage limit → 429");
check(isTransientLLMError(limit), true, "usage limit is weather");
check((limit as LLMHttpError).retryAfterMs, 3_600_000, "rested for an hour, not a minute");

const hit = thrown(() => interpretClaudeCli("", "You've hit your limit · resets 3pm (Europe/Copenhagen)", 1, "claude"));
check((hit as LLMHttpError).status, 429, "the newer wording is a limit too");

const login = thrown(() => interpretClaudeCli("", "Invalid API key · Please run /login", 1, "claude"));
check((login as LLMHttpError).status, 401, "a dead login → 401");
check(isTransientLLMError(login), false, "a dead login is not weather");

const garbage = thrown(() => interpretClaudeCli("segfault", "", 139, "claude"));
check((garbage as LLMHttpError).status, 500, "anything else is an outage (500)");

const errSubtype = thrown(() =>
  interpretClaudeCli(JSON.stringify({ subtype: "error_max_turns", is_error: false, result: "" }), "", 0, "claude"),
);
check(errSubtype instanceof LLMHttpError, true, "a non-success subtype is not an answer");

// The flags that keep a call at ~800 tokens instead of ~19k.
const args = claudeCliArgs("haiku", "SYS");
check(args[args.indexOf("--tools") + 1], "", "tools are off");
check(args.includes("--strict-mcp-config"), true, "no MCP servers");
check(args[args.indexOf("--setting-sources") + 1], "user", "project CLAUDE.md is not loaded");
check(args[args.indexOf("--system-prompt") + 1], "SYS", "our system prompt replaces Claude Code's");
check(args.includes("--"), false, "the prompt is not an argument — it goes on stdin");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
