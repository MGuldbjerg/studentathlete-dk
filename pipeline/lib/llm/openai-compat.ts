/**
 * Delt helper til OpenAI-kompatible API'er (Mistral, Groq).
 * Eliminerer kodeduplikering — begge bruger /v1/chat/completions.
 */

import type { LLMResponse } from "./types";

interface OpenAIChoice {
  message: { content: string };
}

interface OpenAIChatResponse {
  choices: OpenAIChoice[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export async function openAICompatibleGenerate(
  endpoint: string,
  apiKey: string,
  model: string,
  system: string,
  prompt: string,
  max_tokens: number,
  providerName: string,
  jsonMode = false,
): Promise<LLMResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      // json_object-mode kræver at ordet "json" indgår i prompten (OpenAI-konvention;
      // Mistral og Groq håndhæver det samme) — alle JSON-kaldere gør det allerede.
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${providerName} API fejl (${response.status}): ${text}`);
  }

  const data = (await response.json()) as OpenAIChatResponse;

  const text = data.choices[0]?.message?.content ?? "";

  return {
    text,
    model: data.model ?? model,
    provider: providerName,
    tokens_input: data.usage?.prompt_tokens ?? 0,
    tokens_output: data.usage?.completion_tokens ?? 0,
  };
}
