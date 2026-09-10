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
import { NvidiaProvider } from "./provider-nvidia";
import { AnthropicProvider } from "./provider-anthropic";
import { AllProvidersFailedError, LLMHttpError, isRateLimitError, isServerError } from "./errors";

const DAILY_LIMITS: Record<string, number> = {
  mistral: 500,
  "mistral-nemo": 500,
  gemini: 200,
  groq: 800,
  "cloudflare-ai": 150,
  // NIM giver 10.000/dag gratis; vi holder os et godt stykke under,
  // som med de øvrige. Verifikation er lavvolumen.
  nvidia: 1000,
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

/** Non-finite counts become 0: an estimate we cannot make is not a NULL column. */
function countable(n: number): number {
  return Number.isFinite(n) ? n : 0;
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
    [provider, getToday(), countable(tokensIn), countable(tokensOut), isError ? 1 : 0],
  );
}

export class ProviderChain {
  private providers: LLMProvider[];

  /**
   * Providers that answered 429, and when they may be tried again (epoch ms).
   *
   * This run only. Without it EVERY story pays to discover the same thing: four
   * calls, four 429s, four seconds lost. With it a limited provider is skipped
   * at once, until its own suggested wait has passed.
   */
  private cooldownUntil = new Map<string, number>();

  /** `providers` is injectable so tests can drive the chain without network. */
  constructor(private db: D1Client, providers?: LLMProvider[]) {
    this.providers = providers ?? [
      new MistralProvider(),
      // Safety net: a second model on the same key, at the same 188 rpm. When
      // Mistral zeroed mistral-small's allowance on 4 September the chain fell
      // straight through to Gemini's 5 rpm; this rung would have absorbed it.
      new MistralProvider("open-mistral-nemo", "mistral-nemo"),
      new GeminiProvider(),
      new GroqProvider(),
      new CloudflareAIProvider(),
      // Sidst i kæden: NIM er tilføjet som DOMMER, ikke som skribent.
      new NvidiaProvider(),
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
    /** Håndhæv gyldig JSON via providerens API hvor muligt (se GenerateOpts.json). */
    json?: boolean;
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

    // Every error so far was a quota or an outage → the caller can retry later.
    let onlyTransient = true;

    for (const provider of ordered) {
      if (!provider.isAvailable()) continue;

      const coolingUntil = this.cooldownUntil.get(provider.name) ?? 0;
      if (Date.now() < coolingUntil) {
        const secs = Math.ceil((coolingUntil - Date.now()) / 1000);
        console.log(`  ⊘ ${provider.name}: unavailable, resting ${secs}s`);
        errors.push(`${provider.name}: unavailable (cooling ${secs}s)`);
        continue;
      }

      const limit = DAILY_LIMITS[provider.name] ?? 100;
      const usedToday = await getUsageToday(this.db, provider.name);
      if (usedToday >= limit) {
        console.log(`  ⊘ ${provider.name}: daglig grænse nået (${usedToday}/${limit})`);
        errors.push(`${provider.name}: daglig grænse nået (${usedToday}/${limit})`);
        continue;
      }

      try {
        const response = await provider.generate(opts);
        // The answer is already paid for. Accounting for it is a bookkeeping
        // detail and must never be able to throw it away: a NOT NULL failure
        // on llm_usage discarded finished factsheets on 9 September 2026.
        await recordUsage(
          this.db,
          provider.name,
          response.tokens_input,
          response.tokens_output,
          false,
        ).catch((err: unknown) => {
          console.warn(`  ⚠ usage not recorded for ${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
        });
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠ ${provider.name} fejlede: ${msg}`);
        errors.push(`${provider.name}: ${msg}`);
        await recordUsage(this.db, provider.name, 0, 0, true).catch(() => {
          /* the failure above is the story, not our failure to write it down */
        });

        const suggested = err instanceof LLMHttpError ? err.retryAfterMs : undefined;
        if (isRateLimitError(err)) {
          // The provider's own suggestion when it gives one, else a minute.
          // Free tiers meter per minute, so that is the right order of magnitude.
          this.cooldownUntil.set(provider.name, Date.now() + (suggested || 60_000));
        } else if (isServerError(err)) {
          // An overloaded model recovers on its own schedule; rest it briefly
          // rather than asking the same question sixty times.
          this.cooldownUntil.set(provider.name, Date.now() + (suggested || 30_000));
        } else {
          onlyTransient = false;
        }
      }
    }

    const envVars = [
      "MISTRAL_API_KEY",
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID",
      "ANTHROPIC_API_KEY",
    ];

    throw new AllProvidersFailedError(
      `Alle LLM-providere fejlede eller nåede daglig grænse.\n` +
        `Fejl: ${errors.join("; ")}\n` +
        `Sæt mindst én af: ${envVars.join(", ")}`,
      // No errors at all = no keys configured. That is a setup failure, not a
      // quota, and must not make the caller wait for better weather.
      onlyTransient && errors.length > 0,
    );
  }
}
