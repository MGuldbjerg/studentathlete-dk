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

export interface LLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  generate(opts: {
    system: string;
    prompt: string;
    max_tokens: number;
  }): Promise<LLMResponse>;
}
