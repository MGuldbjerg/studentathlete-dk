/**
 * Fallback-kæde for LLM-providere.
 * Prøver providere i rækkefølge, springer over ved manglende nøgle eller daglig grænse.
 * Tracker usage per provider per dag i llm_usage-tabellen.
 */

import type { D1Client } from "../d1-client";
import type { LLMProvider, LLMResponse } from "./types";
import { MistralProvider } from "./provider-mistral";
import { GeminiProvider } from "./provider-gemini";
import { GroqProvider } from "./provider-groq";
import { CloudflareAIProvider } from "./provider-cloudflare-ai";
import { AnthropicProvider } from "./provider-anthropic";

const DAILY_LIMITS: Record<string, number> = {
  mistral: 500,
  gemini: 200,
  groq: 800,
  "cloudflare-ai": 150,
  anthropic: 999999,
};

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getUsageToday(
  db: D1Client,
  provider: string,
): Promise<number> {
  const result = await db.query<{ requests: number }>(
    "SELECT requests FROM llm_usage WHERE provider = ? AND date = ?",
    [provider, getToday()],
  );
  return result.results[0]?.requests ?? 0;
}

async function recordUsage(
  db: D1Client,
  provider: string,
  tokensIn: number,
  tokensOut: number,
  isError: boolean,
): Promise<void> {
  await db.execute(
    `INSERT INTO llm_usage (provider, date, requests, tokens_input, tokens_output, errors)
     VALUES (?, ?, 1, ?, ?, ?)
     ON CONFLICT(provider, date) DO UPDATE SET
       requests = requests + 1,
       tokens_input = tokens_input + excluded.tokens_input,
       tokens_output = tokens_output + excluded.tokens_output,
       errors = errors + excluded.errors`,
    [provider, getToday(), tokensIn, tokensOut, isError ? 1 : 0],
  );
}

export class ProviderChain {
  private providers: LLMProvider[];

  constructor(private db: D1Client) {
    this.providers = [
      new MistralProvider(),
      new GeminiProvider(),
      new GroqProvider(),
      new CloudflareAIProvider(),
      new AnthropicProvider(),
    ];
  }

  getAvailableProviders(): string[] {
    return this.providers
      .filter((p) => p.isAvailable())
      .map((p) => p.name);
  }

  async generate(opts: {
    system: string;
    prompt: string;
    max_tokens: number;
    /** Forsøg denne provider først (fx "anthropic" til features), ellers normal rækkefølge. */
    preferProvider?: string;
  }): Promise<LLMResponse> {
    const errors: string[] = [];

    // Sæt en foretrukken provider forrest (stabilt — resten beholder rækkefølgen).
    const ordered = opts.preferProvider
      ? [...this.providers].sort(
          (a, b) =>
            Number(b.name === opts.preferProvider) - Number(a.name === opts.preferProvider),
        )
      : this.providers;

    for (const provider of ordered) {
      if (!provider.isAvailable()) continue;

      const limit = DAILY_LIMITS[provider.name] ?? 100;
      const usedToday = await getUsageToday(this.db, provider.name);
      if (usedToday >= limit) {
        console.log(`  ⊘ ${provider.name}: daglig grænse nået (${usedToday}/${limit})`);
        continue;
      }

      try {
        const response = await provider.generate(opts);
        await recordUsage(
          this.db,
          provider.name,
          response.tokens_input,
          response.tokens_output,
          false,
        );
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠ ${provider.name} fejlede: ${msg}`);
        errors.push(`${provider.name}: ${msg}`);
        await recordUsage(this.db, provider.name, 0, 0, true);
      }
    }

    const envVars = [
      "MISTRAL_API_KEY",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID",
      "ANTHROPIC_API_KEY",
    ];

    throw new Error(
      `Alle LLM-providere fejlede eller nåede daglig grænse.\n` +
        `Fejl: ${errors.join("; ")}\n` +
        `Sæt mindst én af: ${envVars.join(", ")}`,
    );
  }
}
