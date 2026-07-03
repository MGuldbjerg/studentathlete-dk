/**
 * Fælles interface for LLM-providere.
 * Alle providere implementerer dette, så provider-chain kan skifte transparent.
 */

export interface LLMResponse {
  text: string;
  model: string;
  provider: string;
  tokens_input: number;
  tokens_output: number;
}

export interface GenerateOpts {
  system: string;
  prompt: string;
  max_tokens: number;
  /**
   * Bed providerens API håndhæve gyldig JSON i svaret (structured output).
   * Understøttes af Mistral/Groq (response_format) og Gemini (responseMimeType).
   * Providere uden JSON-mode ignorerer flaget — prompten skal derfor stadig
   * bede om JSON, og kalderen skal stadig parse fail-safe.
   */
  json?: boolean;
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  generate(opts: GenerateOpts): Promise<LLMResponse>;
}
