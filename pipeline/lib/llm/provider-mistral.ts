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
 *
 * The class is parameterised so the chain can carry a SECOND Mistral model as a
 * safety net (open-mistral-nemo, same 188 rpm on the same key). The two share a
 * key, so a dead key still takes both — but the failure we actually had was a
 * single model's allowance being zeroed, and against that a second model is the
 * whole defence.
 *
 * Not ministral-3b, despite the best raw numbers in the bake-off: it was the
 * only model that built a factsheet for a coach-hire story attached to a
 * phantom athlete, where 8b, 14b and nemo all correctly answered no_substance.
 * Refusing is the feature here.
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { openAICompatibleGenerate } from "./openai-compat";

export class MistralProvider implements LLMProvider {
  readonly name: string;
  private apiKey: string | undefined;

  constructor(
    private model = "ministral-8b-latest",
    name = "mistral",
  ) {
    this.name = name;
    this.apiKey = process.env.MISTRAL_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    return openAICompatibleGenerate(
      "https://api.mistral.ai/v1/chat/completions",
      this.apiKey!,
      this.model,
      opts.system,
      opts.prompt,
      opts.max_tokens,
      this.name,
      opts.json ?? false,
    );
  }
}
