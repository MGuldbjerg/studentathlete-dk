/**
 * Gemini 2.5 Flash via REST API.
 * Gratis tier: 250-500 RPD, 250K TPM.
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { LLMHttpError, parseRetryDelayMs } from "./errors";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    /** "STOP" = færdig. "MAX_TOKENS" = klippet af. Se kommentaren ved kaldet. */
    finishReason?: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    /** Tokens brugt på modellens INTERNE tænkning — tælles med i budgettet. */
    thoughtsTokenCount?: number;
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
          /**
           * TÆNKNING SLÅET FRA — og det er ikke en optimering, det er en
           * fejlrettelse (15. september 2026).
           *
           * gemini-2.5-flash er en tænkende model, og tænkningen er slået TIL
           * som standard. De tokens tælles med i `maxOutputTokens`. Modellen
           * brugte derfor det meste af sit budget på intern ræsonnering og blev
           * klippet af midt i en sætning efter 250-400 SYNLIGE tokens — af et
           * budget på 2.000. Det så ud som om der var rigeligt tilbage, fordi
           * `candidatesTokenCount` kun tæller det synlige svar.
           *
           * Resultatet var afbrudt JSON, som kasserede historien. Opgaven her
           * er at omskrive et faktaark til en kort artikel; den kræver ingen
           * intern ræsonnering.
           */
          thinkingConfig: { thinkingBudget: 0 },
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new LLMHttpError(
        `Gemini API fejl (${response.status}): ${text}`,
        response.status,
        parseRetryDelayMs(response.headers, text),
      );
    }

    const data = (await response.json()) as GeminiResponse;

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .join("") ?? "";

    /**
     * Sig det HØJT når svaret blev klippet af. Google fortæller det i
     * `finishReason`, og vi læste det aldrig — så et afkortet svar lignede et
     * færdigt, og fejlen dukkede først op som «afbrudt JSON» hos kalderen,
     * uden spor af hvorfor.
     */
    const finish = data.candidates?.[0]?.finishReason;
    if (finish && finish !== "STOP") {
      const thoughts = data.usageMetadata?.thoughtsTokenCount ?? 0;
      console.warn(
        `  ⚠ gemini: svaret sluttede med «${finish}»` +
          (thoughts > 0 ? ` (${thoughts} tokens gik til intern tænkning)` : ""),
      );
    }

    return {
      text,
      model,
      provider: this.name,
      tokens_input: data.usageMetadata?.promptTokenCount ?? 0,
      tokens_output: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
