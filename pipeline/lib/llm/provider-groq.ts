/**
 * Groq (Llama 3.3 70B) via OpenAI-kompatibel API.
 * Gratis tier: 1000 RPD, 500K tokens/dag.
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { openAICompatibleGenerate } from "./openai-compat";

export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    return openAICompatibleGenerate(
      "https://api.groq.com/openai/v1/chat/completions",
      this.apiKey!,
      "llama-3.3-70b-versatile",
      opts.system,
      opts.prompt,
      opts.max_tokens,
      this.name,
      opts.json ?? false,
    );
  }
}
