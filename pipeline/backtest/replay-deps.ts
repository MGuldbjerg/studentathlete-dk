/**
 * Replay-deps: serverer cachet/inline HTML pr. URL og scriptede LLM-svar pr. fase,
 * så de RIGTIGE pipeline-funktioner kører deterministisk offline (intet netværk/LLM/CF).
 */
import { extractMainText } from "../discover/extract-story";
import type { BoxScoreDeps } from "../generate/box-score";
import type { Fixture } from "./types";

/**
 * BoxScoreDeps der henter recap-HTML fra fixture.sourceUrl og box-score-HTML for enhver
 * anden (renderet) URL. extractText genbruger den rigtige extractMainText.
 */
export function makeReplayDeps(fixture: Fixture): BoxScoreDeps {
  return {
    async fetchHtml(url: string): Promise<string | null> {
      return url === fixture.sourceUrl ? fixture.recapHtml : null;
    },
    async renderPage(): Promise<string | null> {
      // Den eneste side der renderes er box scoren (findBoxScoreUrl har valgt den).
      return fixture.boxScoreHtml || null;
    },
    extractText(html: string): string | null {
      return extractMainText(html);
    },
  };
}

/**
 * Deterministisk ChainLike. Én instans betjener alle fire faser; den router på
 * SYSTEM-beskedens indhold (rækkefølgen er vigtig: verify-systemet nævner OGSÅ
 * "fact sheet", så fact-checker tjekkes FØR fact sheet).
 */
export class StubChain {
  private calls: Record<string, number> = {};

  constructor(private fixture: Fixture) {}

  /** Antal kald pr. fase (til diagnostik). */
  callCounts(): Record<string, number> {
    return { ...this.calls };
  }

  async generate(opts: {
    system: string;
    prompt: string;
    max_tokens: number;
    preferProvider?: string;
  }): Promise<{ text: string }> {
    const s = opts.system.toLowerCase();
    let phase: "verify" | "boxScore" | "factsheet" | "article";
    if (s.includes("fact-checker")) phase = "verify";
    else if (s.includes("box score")) phase = "boxScore";
    else if (s.includes("fact sheet")) phase = "factsheet";
    else phase = "article";

    this.calls[phase] = (this.calls[phase] ?? 0) + 1;

    const llm = this.fixture.llm;
    switch (phase) {
      case "verify":
        return { text: llm.verify };
      case "boxScore":
        return { text: llm.boxScore ?? '{"found":false,"final_score":null,"stat_line":[]}' };
      case "factsheet":
        return { text: llm.factsheet };
      case "article":
        return { text: llm.article };
    }
  }
}
