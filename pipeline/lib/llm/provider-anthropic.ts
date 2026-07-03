/**
 * Anthropic-provider via eksisterende SDK.
 * Opt-in: bruges kun hvis ANTHROPIC_API_KEY er sat.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private client: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic();
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  // NB: opts.json ignoreres — Messages API har ingen json_object-mode;
  // Claude følger prompt-instruksen om JSON pålideligt.
  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    const model = "claude-haiku-4-5-20241022";

    const response = await this.client!.messages.create({
      model,
      max_tokens: opts.max_tokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return {
      text,
      model,
      provider: this.name,
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
    };
  }
}
