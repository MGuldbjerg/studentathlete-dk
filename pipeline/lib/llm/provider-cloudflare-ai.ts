/**
 * Cloudflare Workers AI via REST API.
 * Bruger eksisterende CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.
 * Token-counts estimeres (CF rapporterer ikke altid).
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { LLMHttpError, parseRetryDelayMs } from "./errors";

interface CFAIResponse {
  result: {
    response: unknown;
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
      throw new LLMHttpError(
        `Cloudflare AI fejl (${response.status}): ${text}`,
        response.status,
        parseRetryDelayMs(response.headers, text),
      );
    }

    const data = (await response.json()) as CFAIResponse;

    if (!data.success) {
      const detail = data.errors.map((e) => e.message).join(", ");
      // Workers AI answers 200 with success:false when the free daily neuron
      // allocation is spent (code 4006). That is a quota, and it resets — it
      // must not read as a broken request. Given as 429 so the chain rests it
      // for the remainder of the run.
      const spent = /neurons|daily free allocation/i.test(detail);
      throw new LLMHttpError(`Cloudflare AI fejl: ${detail}`, spent ? 429 : 400);
    }

    // Llama does not always answer with a string; an object here is JSON the
    // caller can still use, and — left alone — a length of `undefined` that
    // turns the token estimate into NaN.
    const raw = data.result?.response;
    const text = typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw);

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
