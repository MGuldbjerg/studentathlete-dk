/**
 * NVIDIA NIM via OpenAI-kompatibel API.
 *
 * Hvorfor tilføjet (Mikkel, 2026-08-25): der er ingen Anthropic-nøgle, og
 * verifikatoren — den der skal FANGE opdigtede tal — kørte derfor på samme
 * gratis-modeller som skrev teksten. NIM's gratis niveau (Developer Program,
 * intet betalingskort) giver 40 RPM / 10.000 RPD og adgang til væsentligt
 * større modeller end resten af kæden.
 *
 * At kontrollere en færdig tekst mod et faktaark er en LETTERE opgave end at
 * skrive den, og det er præcis dér en større model betaler sig. ARTICLE-
 * ACCURACY.md har allerede afgjort at promptstramning ikke holder gratis-
 * modellerne i skak; en stærkere DOMMER er den lever der er tilbage.
 *
 * Nøgle: NVIDIA_API_KEY (build.nvidia.com). Uden nøgle er providerne inaktiv —
 * isAvailable() er false, og kæden springer den over uden fejl.
 *
 * Modellen vælges med NVIDIA_MODEL. Standarden er bevidst konservativ og
 * kendt; NIM's katalog rummer større modeller (Nemotron-varianter, 405B),
 * og de er værd at skifte til for netop verifikation — slå det aktuelle
 * model-id op i kataloget først, ID'erne ændrer sig.
 */

import type { GenerateOpts, LLMProvider, LLMResponse } from "./types";
import { openAICompatibleGenerate } from "./openai-compat";

const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

export class NvidiaProvider implements LLMProvider {
  readonly name = "nvidia";
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY;
    this.model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(opts: GenerateOpts): Promise<LLMResponse> {
    return openAICompatibleGenerate(
      "https://integrate.api.nvidia.com/v1/chat/completions",
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
