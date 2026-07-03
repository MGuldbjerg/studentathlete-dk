/**
 * Cloudflare Workers AI via REST API.
 * Bruger eksisterende CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.
 * Token-counts estimeres (CF rapporterer ikke altid).
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";

interface CFAIResponse {
  result: {
    response: string;
  };
  success: boolean;
  errors: Array<{ message: string }>;
}

export class CloudflareAIProvider implements LLMProvider {
  readonly name = "cloudflare-ai";
  private apiToken: string | undefined;
  private accountId: string | undefined;

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  }

  isAvailable(): boolean {
    return !!this.apiToken && !!this.accountId;
  }

  // NB: opts.json ignoreres bevidst — CF Workers AI's response_format-understøttelse
  // varierer pr. model; kaldernes prompt-instruks + fail-safe JSON-parsing dækker.
  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.prompt },
        ],
        max_tokens: opts.max_tokens,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Cloudflare AI fejl (${response.status}): ${text}`);
    }

    const data = (await response.json()) as CFAIResponse;

    if (!data.success) {
      throw new Error(
        `Cloudflare AI fejl: ${data.errors.map((e) => e.message).join(", ")}`,
      );
    }

    const text = data.result?.response ?? "";

    // CF rapporterer ikke altid token-counts — estimér
    return {
      text,
      model: "llama-3.3-70b-instruct-fp8-fast",
      provider: this.name,
      tokens_input: Math.ceil((opts.system.length + opts.prompt.length) / 4),
      tokens_output: Math.ceil(text.length / 4),
    };
  }
}
