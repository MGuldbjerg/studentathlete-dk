/**
 * Groq via OpenAI-kompatibel API. Gratis tier: 1000 RPD, 500K tokens/dag.
 *
 * MODEL SKIFTET 2026-08-31: llama-3.3-70b-versatile svarede 404 — den findes
 * ikke længere hos Groq. Fejlen havde ligget uopdaget, fordi Mistral står
 * først i kæden og aldrig nåede sin dagsgrænse: Groq var en reserve, der ikke
 * ville have virket den dag den blev brugt. Se pipeline/checks/llm-health.ts.
 *
 * Model kan overstyres med GROQ_MODEL. Testet med response_format json_object.
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { openAICompatibleGenerate } from "./openai-compat";

export class GroqProvider implements LLMProvider {
  readonly name = "groq";
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    return openAICompatibleGenerate(
      "https://api.groq.com/openai/v1/chat/completions",
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
