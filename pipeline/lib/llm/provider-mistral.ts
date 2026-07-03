/**
 * Mistral Small via OpenAI-kompatibel API.
 * Gratis tier: 2 RPM, 500K TPM, 1B tokens/måned.
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
      "mistral-small-latest",
      opts.system,
      opts.prompt,
      opts.max_tokens,
      this.name,
      opts.json ?? false,
    );
  }
}
