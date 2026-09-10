/**
 * Ministral 8B via the OpenAI-compatible API.
 *
 * Was mistral-small-latest until 4 September 2026, when Mistral set the free
 * allowance for its commercial tier to zero — `x-ratelimit-limit-req-minute: 0`
 * on mistral-small, mistral-medium and magistral, answered as a 429 that reads
 * like a burst limit. The key was never the problem; the same key gets 188
 * rpm here, 750 on ministral-3b and 30 on ministral-14b.
 *
 * Measured against the sheets mistral-small built while it was healthy
 * (pipeline/backtest/model-bakeoff.ts, 6 stories): fewer facts per sheet, and
 * zero unsourced numbers where mistral-small put one in four sheets of six.
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { openAICompatibleGenerate } from "./openai-compat";

export class MistralProvider implements LLMProvider {
  readonly name = "mistral";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    return openAICompatibleGenerate(
      "https://api.mistral.ai/v1/chat/completions",
      this.apiKey!,
      "ministral-8b-latest",
      opts.system,
      opts.prompt,
      opts.max_tokens,
      this.name,
      opts.json ?? false,
    );
  }
}
