/**
 * Gemini 2.5 Flash via REST API.
 * Gratis tier: 250-500 RPD, 250K TPM.
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: opts.system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: opts.prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: opts.max_tokens,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API fejl (${response.status}): ${text}`);
    }

    const data = (await response.json()) as GeminiResponse;

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .join("") ?? "";

    return {
      text,
      model,
      provider: this.name,
      tokens_input: data.usageMetadata?.promptTokenCount ?? 0,
      tokens_output: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
